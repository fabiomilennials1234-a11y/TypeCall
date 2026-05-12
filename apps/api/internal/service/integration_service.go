package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	cryptohelper "github.com/typecall/api/internal/crypto"
	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

const (
	googleUserInfoURL = "https://www.googleapis.com/oauth2/v2/userinfo"
	stateValidityTTL  = 10 * time.Minute
)

// GoogleScopes lists the OAuth scopes TypeCall requests for Google Calendar
// integration. Principle of least privilege: only what we need.
var GoogleScopes = []string{
	"https://www.googleapis.com/auth/calendar.readonly",
	"https://www.googleapis.com/auth/calendar.events",
	"https://www.googleapis.com/auth/userinfo.email",
}

var (
	ErrInvalidOAuthState = errors.New("invalid or expired OAuth state")
	ErrIntegrationNotConnected = errors.New("integration not connected")
)

// IntegrationStatus is the public-safe shape returned to the UI.
type IntegrationStatus struct {
	Connected            bool       `json:"connected"`
	GoogleAccountEmail   string     `json:"google_account_email,omitempty"`
	Scope                string     `json:"scope,omitempty"`
	AccessTokenExpiresAt *time.Time `json:"access_token_expires_at,omitempty"`
	LastSyncedAt         *time.Time `json:"last_synced_at,omitempty"`
	SyncError            *string    `json:"sync_error,omitempty"`
	ConnectedAt          *time.Time `json:"connected_at,omitempty"`
}

type IntegrationService interface {
	GenerateGoogleAuthURL(ctx context.Context, userID, orgID uuid.UUID) (string, error)
	HandleGoogleCallback(ctx context.Context, code, state string) (uuid.UUID, error)
	Disconnect(ctx context.Context, userID uuid.UUID, provider domain.IntegrationProvider) error
	GetStatus(ctx context.Context, userID uuid.UUID, provider domain.IntegrationProvider) (*IntegrationStatus, error)
	DecryptTokens(cred *domain.IntegrationCredential) (*domain.DecryptedTokens, error)
}

type integrationService struct {
	repo            repository.IntegrationRepository
	clientID        string
	clientSecret    string
	redirectURI     string
	stateSecret     []byte
	encryptionKey   []byte
	httpClient      *http.Client
}

func NewIntegrationService(
	repo repository.IntegrationRepository,
	clientID, clientSecret, redirectURI string,
	stateSecret string,
	encryptionKey []byte,
) IntegrationService {
	return &integrationService{
		repo:          repo,
		clientID:      clientID,
		clientSecret:  clientSecret,
		redirectURI:   redirectURI,
		stateSecret:   []byte(stateSecret),
		encryptionKey: encryptionKey,
		httpClient:    &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *integrationService) googleConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     s.clientID,
		ClientSecret: s.clientSecret,
		RedirectURL:  s.redirectURI,
		Scopes:       GoogleScopes,
		Endpoint:     google.Endpoint,
	}
}

type oauthStateClaims struct {
	UserID uuid.UUID `json:"uid"`
	OrgID  uuid.UUID `json:"oid"`
	Nonce  string    `json:"n"`
	jwt.RegisteredClaims
}

func (s *integrationService) GenerateGoogleAuthURL(_ context.Context, userID, orgID uuid.UUID) (string, error) {
	nonce := uuid.NewString()
	claims := oauthStateClaims{
		UserID: userID,
		OrgID:  orgID,
		Nonce:  nonce,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(stateValidityTTL)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	state, err := token.SignedString(s.stateSecret)
	if err != nil {
		return "", fmt.Errorf("IntegrationService.GenerateGoogleAuthURL: sign state: %w", err)
	}

	url := s.googleConfig().AuthCodeURL(state,
		oauth2.AccessTypeOffline,
		oauth2.ApprovalForce, // ensures refresh token is returned even on re-auth
	)
	return url, nil
}

func (s *integrationService) parseState(state string) (*oauthStateClaims, error) {
	claims := &oauthStateClaims{}
	_, err := jwt.ParseWithClaims(state, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.stateSecret, nil
	})
	if err != nil {
		return nil, ErrInvalidOAuthState
	}
	return claims, nil
}

type googleUserInfo struct {
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
}

func (s *integrationService) HandleGoogleCallback(ctx context.Context, code, state string) (uuid.UUID, error) {
	claims, err := s.parseState(state)
	if err != nil {
		return uuid.Nil, err
	}

	cfg := s.googleConfig()
	tok, err := cfg.Exchange(ctx, code)
	if err != nil {
		return uuid.Nil, fmt.Errorf("IntegrationService.HandleGoogleCallback: exchange: %w", err)
	}
	if tok.RefreshToken == "" {
		return uuid.Nil, fmt.Errorf("IntegrationService.HandleGoogleCallback: no refresh token returned (re-authorize with prompt=consent)")
	}

	info, err := s.fetchGoogleUserInfo(ctx, tok.AccessToken)
	if err != nil {
		return uuid.Nil, err
	}
	if !info.VerifiedEmail {
		return uuid.Nil, fmt.Errorf("IntegrationService.HandleGoogleCallback: google email not verified")
	}

	accessCT, accessNonce, err := cryptohelper.Encrypt(s.encryptionKey, tok.AccessToken)
	if err != nil {
		return uuid.Nil, fmt.Errorf("IntegrationService.HandleGoogleCallback: encrypt access: %w", err)
	}
	refreshCT, refreshNonce, err := cryptohelper.Encrypt(s.encryptionKey, tok.RefreshToken)
	if err != nil {
		return uuid.Nil, fmt.Errorf("IntegrationService.HandleGoogleCallback: encrypt refresh: %w", err)
	}

	scope := tok.Extra("scope")
	scopeStr, _ := scope.(string)

	cred := &domain.IntegrationCredential{
		ID:                    uuid.New(),
		UserID:                claims.UserID,
		OrganizationID:        claims.OrgID,
		Provider:              domain.IntegrationProviderGoogleCalendar,
		GoogleAccountEmail:    info.Email,
		AccessTokenEncrypted:  accessCT,
		AccessTokenNonce:      accessNonce,
		RefreshTokenEncrypted: refreshCT,
		RefreshTokenNonce:     refreshNonce,
		Scope:                 scopeStr,
		AccessTokenExpiresAt:  tok.Expiry,
	}

	if err := s.repo.Upsert(ctx, cred); err != nil {
		return uuid.Nil, fmt.Errorf("IntegrationService.HandleGoogleCallback: %w", err)
	}
	return cred.ID, nil
}

func (s *integrationService) fetchGoogleUserInfo(ctx context.Context, accessToken string) (*googleUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, googleUserInfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("IntegrationService.fetchGoogleUserInfo: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("IntegrationService.fetchGoogleUserInfo: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("IntegrationService.fetchGoogleUserInfo: status=%d body=%s", resp.StatusCode, string(body))
	}

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("IntegrationService.fetchGoogleUserInfo: decode: %w", err)
	}
	return &info, nil
}

func (s *integrationService) Disconnect(ctx context.Context, userID uuid.UUID, provider domain.IntegrationProvider) error {
	cred, err := s.repo.GetByUserAndProvider(ctx, userID, provider)
	if err != nil {
		if errors.Is(err, repository.ErrIntegrationNotFound) {
			return ErrIntegrationNotConnected
		}
		return fmt.Errorf("IntegrationService.Disconnect: %w", err)
	}
	if err := s.repo.Delete(ctx, cred.ID); err != nil {
		return fmt.Errorf("IntegrationService.Disconnect: %w", err)
	}
	return nil
}

func (s *integrationService) GetStatus(ctx context.Context, userID uuid.UUID, provider domain.IntegrationProvider) (*IntegrationStatus, error) {
	cred, err := s.repo.GetByUserAndProvider(ctx, userID, provider)
	if err != nil {
		if errors.Is(err, repository.ErrIntegrationNotFound) {
			return &IntegrationStatus{Connected: false}, nil
		}
		return nil, fmt.Errorf("IntegrationService.GetStatus: %w", err)
	}
	return &IntegrationStatus{
		Connected:            true,
		GoogleAccountEmail:   cred.GoogleAccountEmail,
		Scope:                cred.Scope,
		AccessTokenExpiresAt: &cred.AccessTokenExpiresAt,
		LastSyncedAt:         cred.LastSyncedAt,
		SyncError:            cred.SyncError,
		ConnectedAt:          &cred.CreatedAt,
	}, nil
}

func (s *integrationService) DecryptTokens(cred *domain.IntegrationCredential) (*domain.DecryptedTokens, error) {
	access, err := cryptohelper.Decrypt(s.encryptionKey, cred.AccessTokenEncrypted, cred.AccessTokenNonce)
	if err != nil {
		return nil, fmt.Errorf("IntegrationService.DecryptTokens: access: %w", err)
	}
	refresh, err := cryptohelper.Decrypt(s.encryptionKey, cred.RefreshTokenEncrypted, cred.RefreshTokenNonce)
	if err != nil {
		return nil, fmt.Errorf("IntegrationService.DecryptTokens: refresh: %w", err)
	}
	return &domain.DecryptedTokens{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresAt:    cred.AccessTokenExpiresAt,
	}, nil
}
