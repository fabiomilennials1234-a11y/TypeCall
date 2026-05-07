// Package gcal wraps the Google Calendar v3 API with TypeCall-specific concerns:
// transparent OAuth refresh that re-encrypts and persists rotated tokens, a
// circuit breaker on auth failures, and helpers for the slot-calculation and
// booking flows.
package gcal

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"

	cryptohelper "github.com/typecall/api/internal/crypto"
	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

const (
	// CircuitOpenDuration is how long the circuit stays open after consecutive failures.
	CircuitOpenDuration = 60 * time.Second
	// CircuitFailureThreshold opens the circuit after this many consecutive auth failures.
	CircuitFailureThreshold = 3
	// PrimaryCalendarID is the default calendar on a Google account.
	PrimaryCalendarID = "primary"
)

var (
	ErrCircuitOpen        = errors.New("gcal circuit breaker is open")
	ErrAuthRequired       = errors.New("gcal integration auth required")
	ErrIntegrationMissing = errors.New("gcal integration not connected")
)

// BusySlot represents an interval where the host calendar reports a conflict.
type BusySlot struct {
	Start time.Time
	End   time.Time
}

// EventInput describes a calendar event to create.
type EventInput struct {
	Summary       string
	Description   string
	Start         time.Time
	End           time.Time
	Timezone      string
	HostEmail     string
	AttendeeEmail string
	AttendeeName  string
	BookingID     uuid.UUID
}

// EventOutput is what GCal returns after a successful insert.
type EventOutput struct {
	GoogleEventID string
	MeetingURL    string
}

// Provider is the high-level interface the rest of the codebase uses. It hides
// per-user credential lookup, refresh, and circuit-breaking.
type Provider interface {
	GetBusy(ctx context.Context, userID uuid.UUID, from, to time.Time) ([]BusySlot, error)
	CreateEvent(ctx context.Context, userID uuid.UUID, input EventInput) (*EventOutput, error)
	DeleteEvent(ctx context.Context, userID uuid.UUID, googleEventID string) error
	IsConnected(ctx context.Context, userID uuid.UUID) (bool, error)
}

// Provider is a concrete Provider backed by the OAuth flow stored in
// integration_credentials. It encapsulates token persistence and the breaker.
type provider struct {
	repo          repository.IntegrationRepository
	oauthCfg      *oauth2.Config
	encryptionKey []byte

	mu       sync.Mutex
	circuits map[uuid.UUID]*circuitState
}

type circuitState struct {
	failures int
	openedAt time.Time
}

// NewProvider builds a provider. Pass the same Google OAuth client used by the
// integration_service so refresh requests use the right credentials.
func NewProvider(repo repository.IntegrationRepository, oauthCfg *oauth2.Config, encryptionKey []byte) Provider {
	return &provider{
		repo:          repo,
		oauthCfg:      oauthCfg,
		encryptionKey: encryptionKey,
		circuits:      make(map[uuid.UUID]*circuitState),
	}
}

func (p *provider) IsConnected(ctx context.Context, userID uuid.UUID) (bool, error) {
	_, err := p.repo.GetByUserAndProvider(ctx, userID, domain.IntegrationProviderGoogleCalendar)
	if err != nil {
		if errors.Is(err, repository.ErrIntegrationNotFound) {
			return false, nil
		}
		return false, fmt.Errorf("gcal.IsConnected: %w", err)
	}
	return true, nil
}

// service builds a *calendar.Service for a single user, handling token refresh
// and persistence on each call. Returns ErrCircuitOpen if recent auth failures
// tripped the breaker.
func (p *provider) service(ctx context.Context, userID uuid.UUID) (*calendar.Service, *domain.IntegrationCredential, error) {
	if p.circuitOpen(userID) {
		return nil, nil, ErrCircuitOpen
	}

	cred, err := p.repo.GetByUserAndProvider(ctx, userID, domain.IntegrationProviderGoogleCalendar)
	if err != nil {
		if errors.Is(err, repository.ErrIntegrationNotFound) {
			return nil, nil, ErrIntegrationMissing
		}
		return nil, nil, fmt.Errorf("gcal.service: %w", err)
	}

	access, err := cryptohelper.Decrypt(p.encryptionKey, cred.AccessTokenEncrypted, cred.AccessTokenNonce)
	if err != nil {
		return nil, nil, fmt.Errorf("gcal.service: decrypt access: %w", err)
	}
	refresh, err := cryptohelper.Decrypt(p.encryptionKey, cred.RefreshTokenEncrypted, cred.RefreshTokenNonce)
	if err != nil {
		return nil, nil, fmt.Errorf("gcal.service: decrypt refresh: %w", err)
	}

	tok := &oauth2.Token{
		AccessToken:  access,
		RefreshToken: refresh,
		Expiry:       cred.AccessTokenExpiresAt,
		TokenType:    "Bearer",
	}

	src := &persistingTokenSource{
		base:  p.oauthCfg.TokenSource(ctx, tok),
		repo:  p.repo,
		credID: cred.ID,
		key:   p.encryptionKey,
	}

	svc, err := calendar.NewService(ctx, option.WithTokenSource(src))
	if err != nil {
		return nil, nil, fmt.Errorf("gcal.service: build calendar service: %w", err)
	}
	return svc, cred, nil
}

func (p *provider) GetBusy(ctx context.Context, userID uuid.UUID, from, to time.Time) ([]BusySlot, error) {
	svc, _, err := p.service(ctx, userID)
	if err != nil {
		return nil, err
	}

	req := &calendar.FreeBusyRequest{
		TimeMin: from.UTC().Format(time.RFC3339),
		TimeMax: to.UTC().Format(time.RFC3339),
		Items:   []*calendar.FreeBusyRequestItem{{Id: PrimaryCalendarID}},
	}
	resp, err := svc.Freebusy.Query(req).Context(ctx).Do()
	if err != nil {
		p.recordFailure(userID, err)
		return nil, fmt.Errorf("gcal.GetBusy: %w", err)
	}
	p.recordSuccess(userID)

	cal, ok := resp.Calendars[PrimaryCalendarID]
	if !ok {
		return nil, nil
	}
	out := make([]BusySlot, 0, len(cal.Busy))
	for _, b := range cal.Busy {
		start, err1 := time.Parse(time.RFC3339, b.Start)
		end, err2 := time.Parse(time.RFC3339, b.End)
		if err1 != nil || err2 != nil {
			continue
		}
		out = append(out, BusySlot{Start: start, End: end})
	}
	return out, nil
}

func (p *provider) CreateEvent(ctx context.Context, userID uuid.UUID, input EventInput) (*EventOutput, error) {
	svc, _, err := p.service(ctx, userID)
	if err != nil {
		return nil, err
	}

	tz := input.Timezone
	if tz == "" {
		tz = "America/Sao_Paulo"
	}

	event := &calendar.Event{
		Summary:     input.Summary,
		Description: input.Description,
		Start:       &calendar.EventDateTime{DateTime: input.Start.Format(time.RFC3339), TimeZone: tz},
		End:         &calendar.EventDateTime{DateTime: input.End.Format(time.RFC3339), TimeZone: tz},
		Attendees:   buildAttendees(input),
		ConferenceData: &calendar.ConferenceData{
			CreateRequest: &calendar.CreateConferenceRequest{
				RequestId:             "typecall-" + input.BookingID.String(),
				ConferenceSolutionKey: &calendar.ConferenceSolutionKey{Type: "hangoutsMeet"},
			},
		},
		Reminders: &calendar.EventReminders{
			UseDefault:      false,
			Overrides:       []*calendar.EventReminder{{Method: "popup", Minutes: 10}},
			ForceSendFields: []string{"UseDefault"},
		},
	}

	created, err := svc.Events.
		Insert(PrimaryCalendarID, event).
		ConferenceDataVersion(1).
		SendUpdates("all").
		Context(ctx).
		Do()
	if err != nil {
		p.recordFailure(userID, err)
		return nil, fmt.Errorf("gcal.CreateEvent: %w", err)
	}
	p.recordSuccess(userID)

	out := &EventOutput{GoogleEventID: created.Id}
	if created.ConferenceData != nil {
		for _, ep := range created.ConferenceData.EntryPoints {
			if ep.EntryPointType == "video" && ep.Uri != "" {
				out.MeetingURL = ep.Uri
				break
			}
		}
	}
	if out.MeetingURL == "" && created.HangoutLink != "" {
		out.MeetingURL = created.HangoutLink
	}
	return out, nil
}

func (p *provider) DeleteEvent(ctx context.Context, userID uuid.UUID, googleEventID string) error {
	svc, _, err := p.service(ctx, userID)
	if err != nil {
		return err
	}
	if err := svc.Events.Delete(PrimaryCalendarID, googleEventID).Context(ctx).Do(); err != nil {
		p.recordFailure(userID, err)
		return fmt.Errorf("gcal.DeleteEvent: %w", err)
	}
	p.recordSuccess(userID)
	return nil
}

func buildAttendees(input EventInput) []*calendar.EventAttendee {
	out := []*calendar.EventAttendee{}
	if input.HostEmail != "" {
		out = append(out, &calendar.EventAttendee{Email: input.HostEmail, ResponseStatus: "accepted"})
	}
	if input.AttendeeEmail != "" {
		out = append(out, &calendar.EventAttendee{
			Email:       input.AttendeeEmail,
			DisplayName: input.AttendeeName,
		})
	}
	return out
}

func (p *provider) circuitOpen(userID uuid.UUID) bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	st := p.circuits[userID]
	if st == nil {
		return false
	}
	if st.failures < CircuitFailureThreshold {
		return false
	}
	if time.Since(st.openedAt) > CircuitOpenDuration {
		// half-open: allow one attempt by clearing the breaker
		delete(p.circuits, userID)
		return false
	}
	return true
}

func (p *provider) recordFailure(userID uuid.UUID, _ error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	st, ok := p.circuits[userID]
	if !ok {
		st = &circuitState{}
		p.circuits[userID] = st
	}
	st.failures++
	if st.failures >= CircuitFailureThreshold {
		st.openedAt = time.Now()
	}
}

func (p *provider) recordSuccess(userID uuid.UUID) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.circuits, userID)
}

// persistingTokenSource wraps an oauth2.TokenSource and persists rotated
// access tokens (re-encrypted) so the next request uses the fresh token without
// re-doing the refresh round trip.
type persistingTokenSource struct {
	base   oauth2.TokenSource
	repo   repository.IntegrationRepository
	credID uuid.UUID
	key    []byte

	mu       sync.Mutex
	lastSeen string
}

func (s *persistingTokenSource) Token() (*oauth2.Token, error) {
	tok, err := s.base.Token()
	if err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if tok.AccessToken == s.lastSeen {
		return tok, nil
	}
	s.lastSeen = tok.AccessToken

	ct, nonce, err := cryptohelper.Encrypt(s.key, tok.AccessToken)
	if err != nil {
		return tok, nil
	}
	_ = s.repo.UpdateAccessToken(context.Background(), s.credID, ct, nonce, tok.Expiry)
	return tok, nil
}
