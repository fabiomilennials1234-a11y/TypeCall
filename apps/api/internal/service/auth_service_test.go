package service

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/typecall/api/internal/domain"
)

func TestAuthService_Register(t *testing.T) {
	tests := []struct {
		name      string
		input     domain.RegisterInput
		setupOrg  func(*mockOrganizationRepository)
		setupUser func(*mockUserRepository)
		wantErr   error
	}{
		{
			name: "happy path",
			input: domain.RegisterInput{
				OrgName: "Acme", OrgSlug: "acme",
				Email: "admin@acme.com", Password: "Str0ngP@ss", Name: "Admin",
			},
			setupOrg:  func(m *mockOrganizationRepository) {},
			setupUser: func(m *mockUserRepository) {},
			wantErr:   nil,
		},
		{
			name: "slug already taken",
			input: domain.RegisterInput{
				OrgName: "Acme", OrgSlug: "acme",
				Email: "admin@acme.com", Password: "Str0ngP@ss", Name: "Admin",
			},
			setupOrg: func(m *mockOrganizationRepository) {
				m.SlugExistsFn = func(_ context.Context, _ string) (bool, error) { return true, nil }
			},
			setupUser: func(m *mockUserRepository) {},
			wantErr:   ErrSlugTaken,
		},
		{
			name: "org creation fails",
			input: domain.RegisterInput{
				OrgName: "Acme", OrgSlug: "acme",
				Email: "admin@acme.com", Password: "Str0ngP@ss", Name: "Admin",
			},
			setupOrg: func(m *mockOrganizationRepository) {
				m.CreateFn = func(_ context.Context, _ *domain.Organization) error {
					return fmt.Errorf("db connection lost")
				}
			},
			setupUser: func(m *mockUserRepository) {},
			wantErr:   fmt.Errorf("db connection lost"),
		},
		{
			name: "user creation fails",
			input: domain.RegisterInput{
				OrgName: "Acme", OrgSlug: "acme",
				Email: "admin@acme.com", Password: "Str0ngP@ss", Name: "Admin",
			},
			setupOrg: func(m *mockOrganizationRepository) {},
			setupUser: func(m *mockUserRepository) {
				m.CreateFn = func(_ context.Context, _ *domain.User) error {
					return fmt.Errorf("unique constraint")
				}
			},
			wantErr: fmt.Errorf("unique constraint"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			orgRepo := &mockOrganizationRepository{}
			userRepo := &mockUserRepository{}
			tokenRepo := &mockRefreshTokenRepository{}

			tt.setupOrg(orgRepo)
			tt.setupUser(userRepo)

			svc := NewAuthService(orgRepo, userRepo, tokenRepo, "test-jwt-secret", "test-csrf-secret")
			authUser, tokens, err := svc.Register(context.Background(), tt.input)

			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error containing %q, got nil", tt.wantErr)
				}
				if errors.Is(tt.wantErr, ErrSlugTaken) && !errors.Is(err, ErrSlugTaken) {
					t.Errorf("expected ErrSlugTaken, got %v", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if authUser == nil {
				t.Fatal("expected authUser, got nil")
			}
			if tokens == nil {
				t.Fatal("expected tokens, got nil")
			}
			if tokens.AccessToken == "" {
				t.Error("access token is empty")
			}
			if tokens.RefreshToken == "" {
				t.Error("refresh token is empty")
			}
			if tokens.CSRFToken == "" {
				t.Error("csrf token is empty")
			}
			if authUser.User.Email != "admin@acme.com" {
				t.Errorf("expected email admin@acme.com, got %s", authUser.User.Email)
			}
			if authUser.Organization.Slug != "acme" {
				t.Errorf("expected slug acme, got %s", authUser.Organization.Slug)
			}
		})
	}
}

func TestAuthService_Login(t *testing.T) {
	orgID := uuid.New()
	userID := uuid.New()
	hash, _ := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)

	activeUser := domain.User{
		ID: userID, OrganizationID: orgID,
		Email: "user@test.com", PasswordHash: string(hash),
		Name: "Test", Role: domain.RoleAdmin, IsActive: true,
	}
	inactiveUser := activeUser
	inactiveUser.IsActive = false

	org := domain.Organization{
		ID: orgID, Name: "Test Org", Slug: "test-org",
		Plan: domain.PlanFree,
	}

	tests := []struct {
		name      string
		input     domain.LoginInput
		setupUser func(*mockUserRepository)
		setupOrg  func(*mockOrganizationRepository)
		wantErr   error
	}{
		{
			name:  "happy path",
			input: domain.LoginInput{Email: "user@test.com", Password: "correct-password"},
			setupUser: func(m *mockUserRepository) {
				m.GetByEmailFn = func(_ context.Context, _ string) ([]domain.User, error) {
					return []domain.User{activeUser}, nil
				}
			},
			setupOrg: func(m *mockOrganizationRepository) {
				m.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.Organization, error) {
					return &org, nil
				}
			},
			wantErr: nil,
		},
		{
			name:  "email not found",
			input: domain.LoginInput{Email: "nobody@test.com", Password: "anything"},
			setupUser: func(m *mockUserRepository) {
				m.GetByEmailFn = func(_ context.Context, _ string) ([]domain.User, error) {
					return nil, nil
				}
			},
			setupOrg: func(m *mockOrganizationRepository) {},
			wantErr:  ErrInvalidCredentials,
		},
		{
			name:  "wrong password",
			input: domain.LoginInput{Email: "user@test.com", Password: "wrong-password"},
			setupUser: func(m *mockUserRepository) {
				m.GetByEmailFn = func(_ context.Context, _ string) ([]domain.User, error) {
					return []domain.User{activeUser}, nil
				}
			},
			setupOrg: func(m *mockOrganizationRepository) {},
			wantErr:  ErrInvalidCredentials,
		},
		{
			name:  "user inactive",
			input: domain.LoginInput{Email: "user@test.com", Password: "correct-password"},
			setupUser: func(m *mockUserRepository) {
				m.GetByEmailFn = func(_ context.Context, _ string) ([]domain.User, error) {
					return []domain.User{inactiveUser}, nil
				}
			},
			setupOrg: func(m *mockOrganizationRepository) {},
			wantErr:  ErrUserNotActive,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			orgRepo := &mockOrganizationRepository{}
			userRepo := &mockUserRepository{}
			tokenRepo := &mockRefreshTokenRepository{}

			tt.setupUser(userRepo)
			tt.setupOrg(orgRepo)

			svc := NewAuthService(orgRepo, userRepo, tokenRepo, "test-jwt-secret", "test-csrf-secret")
			authUser, tokens, err := svc.Login(context.Background(), tt.input)

			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("expected %v, got %v", tt.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if authUser == nil || tokens == nil {
				t.Fatal("expected authUser and tokens")
			}
			if tokens.AccessToken == "" {
				t.Error("access token empty")
			}
		})
	}
}

func TestAuthService_Refresh(t *testing.T) {
	userID := uuid.New()
	orgID := uuid.New()
	tokenID := uuid.New()

	rawToken := "raw-refresh-token-abc123"

	tests := []struct {
		name       string
		rawToken   string
		setupToken func(*mockRefreshTokenRepository)
		setupUser  func(*mockUserRepository)
		wantErr    error
	}{
		{
			name:     "happy path",
			rawToken: rawToken,
			setupToken: func(m *mockRefreshTokenRepository) {
				m.GetByTokenHashFn = func(_ context.Context, _ string) (*domain.RefreshToken, error) {
					return &domain.RefreshToken{
						ID: tokenID, UserID: userID, OrganizationID: orgID,
						ExpiresAt: time.Now().Add(24 * time.Hour),
					}, nil
				}
			},
			setupUser: func(m *mockUserRepository) {
				m.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*domain.User, error) {
					return &domain.User{
						ID: userID, OrganizationID: orgID, IsActive: true,
						Role: domain.RoleAdmin,
					}, nil
				}
			},
			wantErr: nil,
		},
		{
			name:     "token not found",
			rawToken: "nonexistent-token",
			setupToken: func(m *mockRefreshTokenRepository) {
				m.GetByTokenHashFn = func(_ context.Context, _ string) (*domain.RefreshToken, error) {
					return nil, nil
				}
			},
			setupUser: func(m *mockUserRepository) {},
			wantErr:   ErrRefreshTokenInvalid,
		},
		{
			name:     "token expired",
			rawToken: rawToken,
			setupToken: func(m *mockRefreshTokenRepository) {
				m.GetByTokenHashFn = func(_ context.Context, _ string) (*domain.RefreshToken, error) {
					return &domain.RefreshToken{
						ID: tokenID, UserID: userID, OrganizationID: orgID,
						ExpiresAt: time.Now().Add(-1 * time.Hour),
					}, nil
				}
			},
			setupUser: func(m *mockUserRepository) {},
			wantErr:   ErrRefreshTokenExpired,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			orgRepo := &mockOrganizationRepository{}
			userRepo := &mockUserRepository{}
			tokenRepo := &mockRefreshTokenRepository{}

			tt.setupToken(tokenRepo)
			tt.setupUser(userRepo)

			svc := NewAuthService(orgRepo, userRepo, tokenRepo, "test-jwt-secret", "test-csrf-secret")
			tokens, err := svc.Refresh(context.Background(), tt.rawToken)

			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("expected %v, got %v", tt.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tokens == nil {
				t.Fatal("expected tokens, got nil")
			}
			if tokens.AccessToken == "" {
				t.Error("access token empty")
			}
		})
	}
}

func TestAuthService_ValidateAccessToken(t *testing.T) {
	secret := "test-jwt-secret-validate"
	userID := uuid.New()
	orgID := uuid.New()

	validToken := func() string {
		claims := jwt.MapClaims{
			"sub":  userID.String(),
			"org":  orgID.String(),
			"role": "admin",
			"iat":  time.Now().Unix(),
			"exp":  time.Now().Add(15 * time.Minute).Unix(),
		}
		tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		s, _ := tok.SignedString([]byte(secret))
		return s
	}()

	expiredToken := func() string {
		claims := jwt.MapClaims{
			"sub":  userID.String(),
			"org":  orgID.String(),
			"role": "admin",
			"iat":  time.Now().Add(-1 * time.Hour).Unix(),
			"exp":  time.Now().Add(-30 * time.Minute).Unix(),
		}
		tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		s, _ := tok.SignedString([]byte(secret))
		return s
	}()

	tests := []struct {
		name    string
		token   string
		wantErr bool
		wantSub uuid.UUID
	}{
		{
			name:    "valid token",
			token:   validToken,
			wantErr: false,
			wantSub: userID,
		},
		{
			name:    "expired token",
			token:   expiredToken,
			wantErr: true,
		},
		{
			name:    "malformed token",
			token:   "not.a.jwt",
			wantErr: true,
		},
	}

	svc := NewAuthService(
		&mockOrganizationRepository{},
		&mockUserRepository{},
		&mockRefreshTokenRepository{},
		secret, "csrf-secret",
	)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims, err := svc.ValidateAccessToken(tt.token)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if claims.Sub != tt.wantSub {
				t.Errorf("expected sub %s, got %s", tt.wantSub, claims.Sub)
			}
		})
	}
}
