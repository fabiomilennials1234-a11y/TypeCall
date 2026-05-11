package service

import (
	"context"
	"crypto/rand"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	cryptohelper "github.com/typecall/api/internal/crypto"
	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

type mockIntegrationRepository struct {
	UpsertFn                 func(ctx context.Context, c *domain.IntegrationCredential) error
	GetByUserAndProviderFn   func(ctx context.Context, userID uuid.UUID, p domain.IntegrationProvider) (*domain.IntegrationCredential, error)
	UpdateAccessTokenFn      func(ctx context.Context, id uuid.UUID, ct, nonce []byte, expiresAt any) error
	UpdateWatchFn            func(ctx context.Context, id uuid.UUID, channelID, resourceID string, expiry any) error
	UpdateSyncErrorFn        func(ctx context.Context, id uuid.UUID, syncErr *string) error
	DeleteFn                 func(ctx context.Context, id uuid.UUID) error
	ListExpiringWatchesFn    func(ctx context.Context, before any) ([]domain.IntegrationCredential, error)
}

func (m *mockIntegrationRepository) Upsert(ctx context.Context, c *domain.IntegrationCredential) error {
	if m.UpsertFn != nil {
		return m.UpsertFn(ctx, c)
	}
	return nil
}
func (m *mockIntegrationRepository) GetByUserAndProvider(ctx context.Context, userID uuid.UUID, p domain.IntegrationProvider) (*domain.IntegrationCredential, error) {
	if m.GetByUserAndProviderFn != nil {
		return m.GetByUserAndProviderFn(ctx, userID, p)
	}
	return nil, repository.ErrIntegrationNotFound
}
func (m *mockIntegrationRepository) UpdateAccessToken(ctx context.Context, id uuid.UUID, ct, nonce []byte, expiresAt any) error {
	if m.UpdateAccessTokenFn != nil {
		return m.UpdateAccessTokenFn(ctx, id, ct, nonce, expiresAt)
	}
	return nil
}
func (m *mockIntegrationRepository) UpdateWatch(ctx context.Context, id uuid.UUID, channelID, resourceID string, expiry any) error {
	if m.UpdateWatchFn != nil {
		return m.UpdateWatchFn(ctx, id, channelID, resourceID, expiry)
	}
	return nil
}
func (m *mockIntegrationRepository) UpdateSyncError(ctx context.Context, id uuid.UUID, e *string) error {
	if m.UpdateSyncErrorFn != nil {
		return m.UpdateSyncErrorFn(ctx, id, e)
	}
	return nil
}
func (m *mockIntegrationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if m.DeleteFn != nil {
		return m.DeleteFn(ctx, id)
	}
	return nil
}
func (m *mockIntegrationRepository) ListExpiringWatches(ctx context.Context, before any) ([]domain.IntegrationCredential, error) {
	if m.ListExpiringWatchesFn != nil {
		return m.ListExpiringWatchesFn(ctx, before)
	}
	return nil, nil
}

func newTestKey(t *testing.T) []byte {
	t.Helper()
	k := make([]byte, 32)
	if _, err := rand.Read(k); err != nil {
		t.Fatalf("rand: %v", err)
	}
	return k
}

func newTestSvc(t *testing.T, repo repository.IntegrationRepository) *integrationService {
	t.Helper()
	svc := NewIntegrationService(
		repo,
		"test-client-id", "test-client-secret",
		"http://localhost:8080/api/v1/integrations/google/callback",
		"test-state-secret-32-chars-long-min",
		newTestKey(t),
	)
	return svc.(*integrationService)
}

func TestGenerateGoogleAuthURL_ContainsRequiredParams(t *testing.T) {
	svc := newTestSvc(t, &mockIntegrationRepository{})
	url, err := svc.GenerateGoogleAuthURL(context.Background(), uuid.New(), uuid.New())
	if err != nil {
		t.Fatalf("GenerateGoogleAuthURL: %v", err)
	}
	for _, want := range []string{
		"https://accounts.google.com/",
		"client_id=test-client-id",
		"access_type=offline",
		"prompt=consent",
		"state=",
		"scope=",
	} {
		if !strings.Contains(url, want) {
			t.Errorf("auth URL missing %q\nurl: %s", want, url)
		}
	}
}

func TestParseState_RoundTrip(t *testing.T) {
	svc := newTestSvc(t, &mockIntegrationRepository{})
	userID := uuid.New()
	orgID := uuid.New()

	authURL, err := svc.GenerateGoogleAuthURL(context.Background(), userID, orgID)
	if err != nil {
		t.Fatal(err)
	}

	idx := strings.Index(authURL, "state=")
	if idx == -1 {
		t.Fatal("no state in URL")
	}
	stateStr := authURL[idx+len("state="):]
	if amp := strings.Index(stateStr, "&"); amp != -1 {
		stateStr = stateStr[:amp]
	}

	claims, err := svc.parseState(stateStr)
	if err != nil {
		t.Fatalf("parseState: %v", err)
	}
	if claims.UserID != userID {
		t.Errorf("UserID mismatch")
	}
	if claims.OrgID != orgID {
		t.Errorf("OrgID mismatch")
	}
}

func TestParseState_RejectsInvalid(t *testing.T) {
	svc := newTestSvc(t, &mockIntegrationRepository{})
	tests := []string{"", "not-a-jwt", "a.b.c"}
	for _, tc := range tests {
		if _, err := svc.parseState(tc); !errors.Is(err, ErrInvalidOAuthState) {
			t.Errorf("expected ErrInvalidOAuthState for %q, got %v", tc, err)
		}
	}
}

func TestHandleGoogleCallback_InvalidState(t *testing.T) {
	svc := newTestSvc(t, &mockIntegrationRepository{})
	_, err := svc.HandleGoogleCallback(context.Background(), "fake-code", "bad-state")
	if !errors.Is(err, ErrInvalidOAuthState) {
		t.Errorf("expected ErrInvalidOAuthState, got %v", err)
	}
}

func TestDisconnect_NotConnected(t *testing.T) {
	svc := newTestSvc(t, &mockIntegrationRepository{
		GetByUserAndProviderFn: func(ctx context.Context, _ uuid.UUID, _ domain.IntegrationProvider) (*domain.IntegrationCredential, error) {
			return nil, repository.ErrIntegrationNotFound
		},
	})
	err := svc.Disconnect(context.Background(), uuid.New(), domain.IntegrationProviderGoogleCalendar)
	if !errors.Is(err, ErrIntegrationNotConnected) {
		t.Errorf("expected ErrIntegrationNotConnected, got %v", err)
	}
}

func TestDisconnect_DeletesRecord(t *testing.T) {
	credID := uuid.New()
	deleted := false
	svc := newTestSvc(t, &mockIntegrationRepository{
		GetByUserAndProviderFn: func(ctx context.Context, _ uuid.UUID, _ domain.IntegrationProvider) (*domain.IntegrationCredential, error) {
			return &domain.IntegrationCredential{ID: credID}, nil
		},
		DeleteFn: func(ctx context.Context, id uuid.UUID) error {
			if id != credID {
				t.Errorf("delete id mismatch")
			}
			deleted = true
			return nil
		},
	})
	if err := svc.Disconnect(context.Background(), uuid.New(), domain.IntegrationProviderGoogleCalendar); err != nil {
		t.Fatal(err)
	}
	if !deleted {
		t.Error("Delete not called")
	}
}

func TestGetStatus_NotConnected(t *testing.T) {
	svc := newTestSvc(t, &mockIntegrationRepository{
		GetByUserAndProviderFn: func(ctx context.Context, _ uuid.UUID, _ domain.IntegrationProvider) (*domain.IntegrationCredential, error) {
			return nil, repository.ErrIntegrationNotFound
		},
	})
	st, err := svc.GetStatus(context.Background(), uuid.New(), domain.IntegrationProviderGoogleCalendar)
	if err != nil {
		t.Fatal(err)
	}
	if st.Connected {
		t.Error("expected Connected=false")
	}
}

func TestGetStatus_Connected(t *testing.T) {
	now := time.Now()
	svc := newTestSvc(t, &mockIntegrationRepository{
		GetByUserAndProviderFn: func(ctx context.Context, _ uuid.UUID, _ domain.IntegrationProvider) (*domain.IntegrationCredential, error) {
			return &domain.IntegrationCredential{
				GoogleAccountEmail:   "user@example.com",
				Scope:                "calendar.events",
				AccessTokenExpiresAt: now.Add(time.Hour),
				CreatedAt:            now,
			}, nil
		},
	})
	st, err := svc.GetStatus(context.Background(), uuid.New(), domain.IntegrationProviderGoogleCalendar)
	if err != nil {
		t.Fatal(err)
	}
	if !st.Connected {
		t.Error("expected Connected=true")
	}
	if st.GoogleAccountEmail != "user@example.com" {
		t.Errorf("email mismatch: %s", st.GoogleAccountEmail)
	}
}

func TestDecryptTokens_RoundTrip(t *testing.T) {
	key := newTestKey(t)
	svc := &integrationService{encryptionKey: key}

	accessCT, accessNonce, err := cryptohelper.Encrypt(key, "access-xyz")
	if err != nil {
		t.Fatal(err)
	}
	refreshCT, refreshNonce, err := cryptohelper.Encrypt(key, "refresh-abc")
	if err != nil {
		t.Fatal(err)
	}
	cred := &domain.IntegrationCredential{
		AccessTokenEncrypted:  accessCT,
		AccessTokenNonce:      accessNonce,
		RefreshTokenEncrypted: refreshCT,
		RefreshTokenNonce:     refreshNonce,
		AccessTokenExpiresAt:  time.Now().Add(time.Hour),
	}
	dec, err := svc.DecryptTokens(cred)
	if err != nil {
		t.Fatal(err)
	}
	if dec.AccessToken != "access-xyz" {
		t.Errorf("access mismatch: %s", dec.AccessToken)
	}
	if dec.RefreshToken != "refresh-abc" {
		t.Errorf("refresh mismatch: %s", dec.RefreshToken)
	}
}
