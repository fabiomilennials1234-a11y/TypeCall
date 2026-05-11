package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/integration/gcal"
	"github.com/typecall/api/internal/repository"
)

var (
	ErrBookingNotFound = errors.New("booking not found")
	ErrSlotConflict    = errors.New("time slot is no longer available")
	ErrBookingPast     = errors.New("cannot book in the past")
)

type BookingService interface {
	Create(ctx context.Context, input domain.CreateBookingInput) (*domain.Booking, error)
	Get(ctx context.Context, id uuid.UUID) (*domain.Booking, error)
	List(ctx context.Context, params domain.ListBookingsParams) (*domain.ListBookingsResult, error)
	Cancel(ctx context.Context, id uuid.UUID, reason *string) error
	GetByCancelToken(ctx context.Context, token string) (*domain.Booking, error)
	CancelByToken(ctx context.Context, token string, reason *string) error

	UpdateKanbanStatus(ctx context.Context, id uuid.UUID, to domain.KanbanStatus, userID *uuid.UUID, notes *string) (*domain.Booking, error)
	GetKanbanBoard(ctx context.Context, orgID uuid.UUID, sellerID *uuid.UUID) (*domain.KanbanBoard, error)
	Reschedule(ctx context.Context, id uuid.UUID, newStart time.Time, userID *uuid.UUID) (*domain.Booking, error)
	SetLeadTagByResponse(ctx context.Context, responseID uuid.UUID, tag domain.LeadTag) error
}

type bookingService struct {
	bookingRepo repository.BookingRepository
	pubETRepo   repository.PublicEventTypeRepository
	userRepo    repository.UserRepository
	webhookSvc  WebhookService
	gcal        gcal.Provider
}

func NewBookingService(
	bookingRepo repository.BookingRepository,
	pubETRepo repository.PublicEventTypeRepository,
	userRepo repository.UserRepository,
	webhookSvc WebhookService,
	gcalProvider gcal.Provider,
) BookingService {
	return &bookingService{
		bookingRepo: bookingRepo,
		pubETRepo:   pubETRepo,
		userRepo:    userRepo,
		webhookSvc:  webhookSvc,
		gcal:        gcalProvider,
	}
}

func (s *bookingService) Create(ctx context.Context, input domain.CreateBookingInput) (*domain.Booking, error) {
	et, err := s.pubETRepo.GetActiveByID(ctx, input.EventTypeID)
	if err != nil {
		return nil, fmt.Errorf("BookingService.Create: %w", err)
	}
	if et == nil {
		return nil, ErrEventTypeNotFound
	}

	start := input.StartTime.UTC()
	end := start.Add(time.Duration(et.DurationMinutes) * time.Minute)

	if start.Before(time.Now().UTC()) {
		return nil, ErrBookingPast
	}

	conflict, err := s.bookingRepo.CheckConflict(ctx, et.UserID, start, end)
	if err != nil {
		return nil, fmt.Errorf("BookingService.Create: check conflict: %w", err)
	}
	if conflict {
		return nil, ErrSlotConflict
	}

	cancelToken, err := generateToken()
	if err != nil {
		return nil, fmt.Errorf("BookingService.Create: generate cancel token: %w", err)
	}
	rescheduleToken, err := generateToken()
	if err != nil {
		return nil, fmt.Errorf("BookingService.Create: generate reschedule token: %w", err)
	}

	tz := input.Timezone
	if tz == "" {
		tz = "America/Sao_Paulo"
	}

	now := time.Now()
	booking := &domain.Booking{
		ID:              uuid.New(),
		OrganizationID:  et.OrganizationID,
		EventTypeID:     &et.ID,
		HostUserID:      et.UserID,
		ResponseID:      input.ResponseID,
		AttendeeName:    input.AttendeeName,
		AttendeeEmail:   input.AttendeeEmail,
		AttendeePhone:   input.AttendeePhone,
		StartTime:       start,
		EndTime:         end,
		Timezone:        tz,
		Status:          domain.BookingStatusConfirmed,
		LocationType:    et.LocationType,
		LocationValue:   et.LocationValue,
		CancelToken:     cancelToken,
		RescheduleToken: rescheduleToken,
		Notes:           input.Notes,
		Metadata:        json.RawMessage(`{}`),
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if err := s.bookingRepo.Create(ctx, booking); err != nil {
		return nil, fmt.Errorf("BookingService.Create: %w", err)
	}

	s.syncToGoogleCalendar(ctx, booking, et)

	if s.webhookSvc != nil {
		go func() {
			payload := domain.TorqueWebhookPayload{
				Source: "typecall",
				Booking: &domain.TorqueBookingPayload{
					ID:          booking.ID.String(),
					EventType:   et.Title,
					EventTypeID: et.ID.String(),
					StartTime:   booking.StartTime.Format(time.RFC3339),
					EndTime:      booking.EndTime.Format(time.RFC3339),
					Timezone:    booking.Timezone,
					HostName:    "",
					HostEmail:   "",
					Status:      string(booking.Status),
				},
				Respondent: &domain.TorqueRespondent{
					Name:  booking.AttendeeName,
					Email: booking.AttendeeEmail,
					Phone: derefStr(booking.AttendeePhone),
				},
			}
			if err := s.webhookSvc.Dispatch(context.Background(), booking.OrganizationID, "booking.created", payload); err != nil {
				log.Error().Err(err).Str("booking_id", booking.ID.String()).Msg("webhook dispatch failed for booking.created")
			}
		}()
	}

	return booking, nil
}

func (s *bookingService) Get(ctx context.Context, id uuid.UUID) (*domain.Booking, error) {
	b, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("BookingService.Get: %w", err)
	}
	if b == nil {
		return nil, ErrBookingNotFound
	}
	return b, nil
}

func (s *bookingService) List(ctx context.Context, params domain.ListBookingsParams) (*domain.ListBookingsResult, error) {
	result, err := s.bookingRepo.List(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("BookingService.List: %w", err)
	}
	return result, nil
}

func (s *bookingService) Cancel(ctx context.Context, id uuid.UUID, reason *string) error {
	b, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("BookingService.Cancel: %w", err)
	}
	if b == nil {
		return ErrBookingNotFound
	}

	if err := s.bookingRepo.Cancel(ctx, id, reason); err != nil {
		return fmt.Errorf("BookingService.Cancel: %w", err)
	}

	s.deleteFromGoogleCalendar(ctx, b)
	return nil
}

func (s *bookingService) GetByCancelToken(ctx context.Context, token string) (*domain.Booking, error) {
	b, err := s.bookingRepo.GetByCancelToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("BookingService.GetByCancelToken: %w", err)
	}
	if b == nil {
		return nil, ErrBookingNotFound
	}
	return b, nil
}

func (s *bookingService) CancelByToken(ctx context.Context, token string, reason *string) error {
	b, err := s.bookingRepo.GetByCancelToken(ctx, token)
	if err != nil {
		return fmt.Errorf("BookingService.CancelByToken: %w", err)
	}
	if b == nil {
		return ErrBookingNotFound
	}

	if err := s.bookingRepo.Cancel(ctx, b.ID, reason); err != nil {
		return fmt.Errorf("BookingService.CancelByToken: %w", err)
	}

	s.deleteFromGoogleCalendar(ctx, b)
	return nil
}

// --- Sales Deals additions ----------------------------------------------

var ErrInvalidKanbanTransition = errors.New("invalid kanban transition")

// UpdateKanbanStatus validates legal transitions and persists history.
func (s *bookingService) UpdateKanbanStatus(ctx context.Context, id uuid.UUID, to domain.KanbanStatus, userID *uuid.UUID, notes *string) (*domain.Booking, error) {
	b, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("BookingService.UpdateKanbanStatus: %w", err)
	}
	if b == nil {
		return nil, ErrBookingNotFound
	}
	if b.KanbanStatus == to {
		return b, nil
	}
	if !isAllowedKanbanTransition(b.KanbanStatus, to) {
		return nil, ErrInvalidKanbanTransition
	}
	if err := s.bookingRepo.UpdateKanbanStatus(ctx, id, to); err != nil {
		return nil, fmt.Errorf("BookingService.UpdateKanbanStatus: %w", err)
	}
	from := b.KanbanStatus
	_ = s.bookingRepo.InsertHistory(ctx, &domain.BookingHistory{
		BookingID:       id,
		OrganizationID:  b.OrganizationID,
		FromStatus:      &from,
		ToStatus:        to,
		ChangedByUserID: userID,
		Notes:           notes,
	})
	b.KanbanStatus = to
	return b, nil
}

// GetKanbanBoard groups bookings by kanban_status. Optional sellerID filter.
func (s *bookingService) GetKanbanBoard(ctx context.Context, orgID uuid.UUID, sellerID *uuid.UUID) (*domain.KanbanBoard, error) {
	all, err := s.bookingRepo.ListByOrg(ctx, orgID, sellerID)
	if err != nil {
		return nil, fmt.Errorf("BookingService.GetKanbanBoard: %w", err)
	}
	board := &domain.KanbanBoard{
		ToConfirm:    []domain.Booking{},
		PreConfirmed: []domain.Booking{},
		Confirmed:    []domain.Booking{},
		Rescheduled:  []domain.Booking{},
		NoShow:       []domain.Booking{},
		Completed:    []domain.Booking{},
	}
	for _, b := range all {
		switch b.KanbanStatus {
		case domain.KanbanStatusToConfirm:
			board.ToConfirm = append(board.ToConfirm, b)
		case domain.KanbanStatusPreConfirmed:
			board.PreConfirmed = append(board.PreConfirmed, b)
		case domain.KanbanStatusConfirmed:
			board.Confirmed = append(board.Confirmed, b)
		case domain.KanbanStatusRescheduled:
			board.Rescheduled = append(board.Rescheduled, b)
		case domain.KanbanStatusNoShow:
			board.NoShow = append(board.NoShow, b)
		case domain.KanbanStatusCompleted:
			board.Completed = append(board.Completed, b)
		}
	}
	return board, nil
}

// Reschedule moves a booking to a new start (keeping duration). Logs history.
func (s *bookingService) Reschedule(ctx context.Context, id uuid.UUID, newStart time.Time, userID *uuid.UUID) (*domain.Booking, error) {
	b, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("BookingService.Reschedule: %w", err)
	}
	if b == nil {
		return nil, ErrBookingNotFound
	}
	duration := b.EndTime.Sub(b.StartTime)
	newStart = newStart.UTC()
	newEnd := newStart.Add(duration)
	if err := s.bookingRepo.Reschedule(ctx, id, newStart, newEnd); err != nil {
		return nil, fmt.Errorf("BookingService.Reschedule: %w", err)
	}
	from := b.KanbanStatus
	_ = s.bookingRepo.InsertHistory(ctx, &domain.BookingHistory{
		BookingID:       id,
		OrganizationID:  b.OrganizationID,
		FromStatus:      &from,
		ToStatus:        domain.KanbanStatusRescheduled,
		ChangedByUserID: userID,
	})
	b.StartTime = newStart
	b.EndTime = newEnd
	b.KanbanStatus = domain.KanbanStatusRescheduled
	return b, nil
}

func (s *bookingService) SetLeadTagByResponse(ctx context.Context, responseID uuid.UUID, tag domain.LeadTag) error {
	return s.bookingRepo.SetLeadTagByResponse(ctx, responseID, tag)
}

func isAllowedKanbanTransition(from, to domain.KanbanStatus) bool {
	allowed, ok := domain.AllowedKanbanTransitions[from]
	if !ok {
		return false
	}
	for _, t := range allowed {
		if t == to {
			return true
		}
	}
	return false
}

// syncToGoogleCalendar attempts to mirror the booking into the host's GCal.
// On failure, the booking persists without google_event_id/meeting_url; the
// frontend hides the "Acessar" CTA when meeting_url is empty (visual flag).
func (s *bookingService) syncToGoogleCalendar(ctx context.Context, b *domain.Booking, et *domain.EventType) {
	if s.gcal == nil || s.userRepo == nil {
		return
	}

	host, err := s.userRepo.GetByID(ctx, b.HostUserID)
	if err != nil || host == nil {
		log.Warn().Err(err).Str("booking_id", b.ID.String()).Msg("gcal sync: failed to load host")
		return
	}

	connected, err := s.gcal.IsConnected(ctx, b.HostUserID)
	if err != nil || !connected {
		return
	}

	out, err := s.gcal.CreateEvent(ctx, b.HostUserID, gcal.EventInput{
		Summary:       fmt.Sprintf("%s - %s", et.Title, b.AttendeeName),
		Description:   buildEventDescription(b),
		Start:         b.StartTime,
		End:           b.EndTime,
		Timezone:      b.Timezone,
		HostEmail:     host.Email,
		AttendeeEmail: b.AttendeeEmail,
		AttendeeName:  b.AttendeeName,
		BookingID:     b.ID,
	})
	if err != nil {
		log.Warn().Err(err).Str("booking_id", b.ID.String()).Msg("gcal sync: CreateEvent failed; booking persists without meet link")
		return
	}

	if err := s.bookingRepo.SetGoogleEvent(ctx, b.ID, out.GoogleEventID, out.MeetingURL); err != nil {
		log.Error().Err(err).Str("booking_id", b.ID.String()).Str("google_event_id", out.GoogleEventID).Msg("gcal sync: persisted event but failed to save IDs")
		return
	}
	gid := out.GoogleEventID
	url := out.MeetingURL
	b.GoogleEventID = &gid
	b.MeetingURL = &url
}

func (s *bookingService) deleteFromGoogleCalendar(ctx context.Context, b *domain.Booking) {
	if s.gcal == nil || b.GoogleEventID == nil || *b.GoogleEventID == "" {
		return
	}
	if err := s.gcal.DeleteEvent(ctx, b.HostUserID, *b.GoogleEventID); err != nil {
		log.Warn().Err(err).Str("booking_id", b.ID.String()).Str("google_event_id", *b.GoogleEventID).Msg("gcal sync: DeleteEvent failed; manual cleanup may be needed")
	}
}

func buildEventDescription(b *domain.Booking) string {
	desc := fmt.Sprintf("Reuniao agendada via TypeCall.\n\nParticipante: %s\nEmail: %s", b.AttendeeName, b.AttendeeEmail)
	if b.AttendeePhone != nil && *b.AttendeePhone != "" {
		desc += "\nTelefone: " + *b.AttendeePhone
	}
	if b.Notes != nil && *b.Notes != "" {
		desc += "\n\nObservacoes:\n" + *b.Notes
	}
	return desc
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
