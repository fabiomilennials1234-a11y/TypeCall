package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	cryptohelper "github.com/typecall/api/internal/crypto"
	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

type GoogleSigninFlow interface {
	GenerateSigninURL(ctx context.Context) (string, error)
	HandleSigninCallback(ctx context.Context, code, state string) (*domain.AuthUser, *domain.AuthTokens, error)
}

type googleSigninService struct {
	authSvc          *authService
	integrationRepo  repository.IntegrationRepository
	clientID         string
	clientSecret     string
	signinRedirectURI string
	stateSecret      []byte
	encryptionKey    []byte
	httpClient       *http.Client
}

func NewGoogleSigninService(
	authSvc AuthService,
	integrationRepo repository.IntegrationRepository,
	clientID, clientSecret, signinRedirectURI string,
	stateSecret string,
	encryptionKey []byte,
) GoogleSigninFlow {
	concrete, ok := authSvc.(*authService)
	if !ok {
		panic("NewGoogleSigninService: AuthService must be *authService")
	}
	return &googleSigninService{
		authSvc:           concrete,
		integrationRepo:   integrationRepo,
		clientID:          clientID,
		clientSecret:      clientSecret,
		signinRedirectURI: signinRedirectURI,
		stateSecret:       []byte(stateSecret),
		encryptionKey:     encryptionKey,
		httpClient:        &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *googleSigninService) oauthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     s.clientID,
		ClientSecret: s.clientSecret,
		RedirectURL:  s.signinRedirectURI,
		Scopes:       GoogleScopes,
		Endpoint:     google.Endpoint,
	}
}

type signinStateClaims struct {
	Purpose string `json:"p"`
	Nonce   string `json:"n"`
	jwt.RegisteredClaims
}

func (s *googleSigninService) GenerateSigninURL(_ context.Context) (string, error) {
	claims := signinStateClaims{
		Purpose: "signin",
		Nonce:   uuid.NewString(),
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(stateValidityTTL)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	state, err := token.SignedString(s.stateSecret)
	if err != nil {
		return "", fmt.Errorf("GoogleSignin.GenerateSigninURL: sign state: %w", err)
	}
	url := s.oauthConfig().AuthCodeURL(state,
		oauth2.AccessTypeOffline,
		oauth2.ApprovalForce,
	)
	return url, nil
}

func (s *googleSigninService) parseState(state string) (*signinStateClaims, error) {
	claims := &signinStateClaims{}
	_, err := jwt.ParseWithClaims(state, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.stateSecret, nil
	})
	if err != nil {
		return nil, ErrInvalidOAuthState
	}
	if claims.Purpose != "signin" {
		return nil, ErrInvalidOAuthState
	}
	return claims, nil
}

type signinUserInfo struct {
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
}

func (s *googleSigninService) HandleSigninCallback(ctx context.Context, code, state string) (*domain.AuthUser, *domain.AuthTokens, error) {
	if _, err := s.parseState(state); err != nil {
		return nil, nil, err
	}

	cfg := s.oauthConfig()
	tok, err := cfg.Exchange(ctx, code)
	if err != nil {
		return nil, nil, fmt.Errorf("GoogleSignin.HandleSigninCallback: exchange: %w", err)
	}
	if tok.RefreshToken == "" {
		return nil, nil, fmt.Errorf("GoogleSignin.HandleSigninCallback: no refresh token returned")
	}

	info, err := s.fetchUserInfo(ctx, tok.AccessToken)
	if err != nil {
		return nil, nil, err
	}
	if !info.VerifiedEmail {
		return nil, nil, fmt.Errorf("GoogleSignin.HandleSigninCallback: google email not verified")
	}

	email := strings.ToLower(strings.TrimSpace(info.Email))
	name := strings.TrimSpace(info.Name)
	if name == "" {
		name = email
	}

	authUser, err := s.findOrCreateUser(ctx, email, name)
	if err != nil {
		return nil, nil, err
	}

	if err := s.persistCredentials(ctx, authUser.User.ID, authUser.Organization.ID, info.Email, tok); err != nil {
		return nil, nil, err
	}

	if err := s.authSvc.userRepo.UpdateLastLogin(ctx, authUser.User.ID); err != nil {
		return nil, nil, fmt.Errorf("GoogleSignin.HandleSigninCallback: update last login: %w", err)
	}

	tokens, err := s.authSvc.generateTokens(ctx, &authUser.User, authUser.Organization.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("GoogleSignin.HandleSigninCallback: %w", err)
	}
	return authUser, tokens, nil
}

func (s *googleSigninService) fetchUserInfo(ctx context.Context, accessToken string) (*signinUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, googleUserInfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("GoogleSignin.fetchUserInfo: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GoogleSignin.fetchUserInfo: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GoogleSignin.fetchUserInfo: status=%d body=%s", resp.StatusCode, string(body))
	}

	var info signinUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("GoogleSignin.fetchUserInfo: decode: %w", err)
	}
	return &info, nil
}

func (s *googleSigninService) findOrCreateUser(ctx context.Context, email, name string) (*domain.AuthUser, error) {
	users, err := s.authSvc.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("GoogleSignin.findOrCreateUser: %w", err)
	}
	if len(users) > 0 {
		user := users[0]
		if !user.IsActive {
			return nil, ErrUserNotActive
		}
		org, err := s.authSvc.orgRepo.GetByID(ctx, user.OrganizationID)
		if err != nil {
			return nil, fmt.Errorf("GoogleSignin.findOrCreateUser: get org: %w", err)
		}
		return &domain.AuthUser{User: user, Organization: *org}, nil
	}

	now := time.Now()
	slug, err := s.generateUniqueOrgSlug(ctx, email)
	if err != nil {
		return nil, err
	}
	org := &domain.Organization{
		ID:        uuid.New(),
		Name:      defaultOrgName(name),
		Slug:      slug,
		Timezone:  "America/Sao_Paulo",
		Plan:      domain.PlanFree,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.authSvc.orgRepo.Create(ctx, org); err != nil {
		return nil, fmt.Errorf("GoogleSignin.findOrCreateUser: create org: %w", err)
	}

	user := domain.User{
		ID:             uuid.New(),
		OrganizationID: org.ID,
		Email:          email,
		PasswordHash:   "", // empty: account is Google-only until user sets password
		Name:           name,
		Role:           domain.RoleAdmin,
		Timezone:       "America/Sao_Paulo",
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := s.authSvc.userRepo.Create(ctx, &user); err != nil {
		return nil, fmt.Errorf("GoogleSignin.findOrCreateUser: create user: %w", err)
	}

	s.authSvc.bootstrapSellerForOwner(ctx, user.ID, org.ID, user.Name)

	return &domain.AuthUser{User: user, Organization: *org}, nil
}

var slugSanitizer = regexp.MustCompile(`[^a-z0-9-]+`)

func (s *googleSigninService) generateUniqueOrgSlug(ctx context.Context, email string) (string, error) {
	at := strings.IndexByte(email, '@')
	base := "team"
	if at != -1 {
		domain := email[at+1:]
		dot := strings.IndexByte(domain, '.')
		if dot > 0 {
			base = domain[:dot]
		}
	}
	base = strings.ToLower(base)
	base = slugSanitizer.ReplaceAllString(base, "")
	if base == "" {
		base = "team"
	}

	candidate := base
	for i := 0; i < 10; i++ {
		exists, err := s.authSvc.orgRepo.SlugExists(ctx, candidate)
		if err != nil {
			return "", fmt.Errorf("GoogleSignin.generateUniqueOrgSlug: %w", err)
		}
		if !exists {
			return candidate, nil
		}
		candidate = fmt.Sprintf("%s-%s", base, uuid.NewString()[:6])
	}
	return "", fmt.Errorf("GoogleSignin.generateUniqueOrgSlug: failed to find unique slug")
}

func defaultOrgName(name string) string {
	if name == "" {
		return "Time"
	}
	first := strings.SplitN(name, " ", 2)[0]
	return fmt.Sprintf("Time de %s", first)
}

func (s *googleSigninService) persistCredentials(ctx context.Context, userID, orgID uuid.UUID, googleEmail string, tok *oauth2.Token) error {
	accessCT, accessNonce, err := cryptohelper.Encrypt(s.encryptionKey, tok.AccessToken)
	if err != nil {
		return fmt.Errorf("GoogleSignin.persistCredentials: encrypt access: %w", err)
	}
	refreshCT, refreshNonce, err := cryptohelper.Encrypt(s.encryptionKey, tok.RefreshToken)
	if err != nil {
		return fmt.Errorf("GoogleSignin.persistCredentials: encrypt refresh: %w", err)
	}

	scope, _ := tok.Extra("scope").(string)

	cred := &domain.IntegrationCredential{
		ID:                    uuid.New(),
		UserID:                userID,
		OrganizationID:        orgID,
		Provider:              domain.IntegrationProviderGoogleCalendar,
		GoogleAccountEmail:    googleEmail,
		AccessTokenEncrypted:  accessCT,
		AccessTokenNonce:      accessNonce,
		RefreshTokenEncrypted: refreshCT,
		RefreshTokenNonce:     refreshNonce,
		Scope:                 scope,
		AccessTokenExpiresAt:  tok.Expiry,
	}

	if err := s.integrationRepo.Upsert(ctx, cred); err != nil {
		return fmt.Errorf("GoogleSignin.persistCredentials: %w", err)
	}
	return nil
}
