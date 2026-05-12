package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

// SellerBootstrapper provisiona seller baseline para owners recem-criados.
// Interface minima evita ciclo de import com pacote sellers.
type SellerBootstrapper interface {
	CreateDefaultForOwner(ctx context.Context, userID, orgID uuid.UUID, name string) (*domain.Seller, error)
}

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserNotActive      = errors.New("user account is not active")
	ErrRefreshTokenExpired = errors.New("refresh token expired")
	ErrRefreshTokenInvalid = errors.New("refresh token invalid")
	ErrSlugTaken          = errors.New("organization slug already taken")
	ErrEmailTaken         = errors.New("email already registered in this organization")
)

const (
	accessTokenDuration  = 15 * time.Minute
	refreshTokenDuration = 7 * 24 * time.Hour
	bcryptCost           = 12
)

type AuthService interface {
	Register(ctx context.Context, input domain.RegisterInput) (*domain.AuthUser, *domain.AuthTokens, error)
	Login(ctx context.Context, input domain.LoginInput) (*domain.AuthUser, *domain.AuthTokens, error)
	Refresh(ctx context.Context, rawRefreshToken string) (*domain.AuthTokens, error)
	Logout(ctx context.Context, rawRefreshToken string) error
	GetMe(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) (*domain.AuthUser, error)
	ValidateAccessToken(tokenString string) (*domain.JWTClaims, error)
}

type authService struct {
	orgRepo    repository.OrganizationRepository
	userRepo   repository.UserRepository
	tokenRepo  repository.RefreshTokenRepository
	sellers    SellerBootstrapper
	jwtSecret  []byte
	csrfSecret []byte
}

func NewAuthService(
	orgRepo repository.OrganizationRepository,
	userRepo repository.UserRepository,
	tokenRepo repository.RefreshTokenRepository,
	jwtSecret string,
	csrfSecret string,
) AuthService {
	return &authService{
		orgRepo:    orgRepo,
		userRepo:   userRepo,
		tokenRepo:  tokenRepo,
		jwtSecret:  []byte(jwtSecret),
		csrfSecret: []byte(csrfSecret),
	}
}

// WireAuthSellerBootstrapper injeta o provisionador de seller baseline.
// Setter pos-construcao evita dependencia circular no DI principal.
func WireAuthSellerBootstrapper(svc AuthService, sb SellerBootstrapper) {
	if as, ok := svc.(*authService); ok {
		as.sellers = sb
	}
}

// bootstrapSellerForOwner cria seller baseline soft-fail. Erro nao quebra register.
func (s *authService) bootstrapSellerForOwner(ctx context.Context, userID, orgID uuid.UUID, name string) {
	if s.sellers == nil {
		return
	}
	if _, err := s.sellers.CreateDefaultForOwner(ctx, userID, orgID, name); err != nil {
		log.Warn().
			Err(err).
			Str("user_id", userID.String()).
			Str("org_id", orgID.String()).
			Msg("auth: failed to create default seller for owner")
	}
}

func (s *authService) Register(ctx context.Context, input domain.RegisterInput) (*domain.AuthUser, *domain.AuthTokens, error) {
	slug := strings.ToLower(strings.TrimSpace(input.OrgSlug))

	exists, err := s.orgRepo.SlugExists(ctx, slug)
	if err != nil {
		return nil, nil, fmt.Errorf("AuthService.Register: %w", err)
	}
	if exists {
		return nil, nil, ErrSlugTaken
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcryptCost)
	if err != nil {
		return nil, nil, fmt.Errorf("AuthService.Register: hash password: %w", err)
	}

	now := time.Now()
	org := &domain.Organization{
		ID:        uuid.New(),
		Name:      strings.TrimSpace(input.OrgName),
		Slug:      slug,
		Timezone:  "America/Sao_Paulo",
		Plan:      domain.PlanFree,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.orgRepo.Create(ctx, org); err != nil {
		return nil, nil, fmt.Errorf("AuthService.Register: create org: %w", err)
	}

	user := &domain.User{
		ID:             uuid.New(),
		OrganizationID: org.ID,
		Email:          strings.ToLower(strings.TrimSpace(input.Email)),
		PasswordHash:   string(passwordHash),
		Name:           strings.TrimSpace(input.Name),
		Role:           domain.RoleAdmin,
		Timezone:       "America/Sao_Paulo",
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, nil, fmt.Errorf("AuthService.Register: create user: %w", err)
	}

	s.bootstrapSellerForOwner(ctx, user.ID, org.ID, user.Name)

	tokens, err := s.generateTokens(ctx, user, org.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("AuthService.Register: %w", err)
	}

	authUser := &domain.AuthUser{User: *user, Organization: *org}
	return authUser, tokens, nil
}

func (s *authService) Login(ctx context.Context, input domain.LoginInput) (*domain.AuthUser, *domain.AuthTokens, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))

	users, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, nil, fmt.Errorf("AuthService.Login: %w", err)
	}
	if len(users) == 0 {
		return nil, nil, ErrInvalidCredentials
	}

	// For MVP: use first matching user. Multi-org selection comes later.
	user := users[0]

	if !user.IsActive {
		return nil, nil, ErrUserNotActive
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	if err := s.userRepo.UpdateLastLogin(ctx, user.ID); err != nil {
		return nil, nil, fmt.Errorf("AuthService.Login: update last login: %w", err)
	}

	org, err := s.orgRepo.GetByID(ctx, user.OrganizationID)
	if err != nil {
		return nil, nil, fmt.Errorf("AuthService.Login: get org: %w", err)
	}

	tokens, err := s.generateTokens(ctx, &user, org.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("AuthService.Login: %w", err)
	}

	authUser := &domain.AuthUser{User: user, Organization: *org}
	return authUser, tokens, nil
}

func (s *authService) Refresh(ctx context.Context, rawRefreshToken string) (*domain.AuthTokens, error) {
	hash := hashToken(rawRefreshToken)

	stored, err := s.tokenRepo.GetByTokenHash(ctx, hash)
	if err != nil {
		return nil, fmt.Errorf("AuthService.Refresh: %w", err)
	}
	if stored == nil {
		return nil, ErrRefreshTokenInvalid
	}

	if time.Now().After(stored.ExpiresAt) {
		return nil, ErrRefreshTokenExpired
	}

	if err := s.tokenRepo.Revoke(ctx, stored.ID); err != nil {
		return nil, fmt.Errorf("AuthService.Refresh: revoke old: %w", err)
	}

	user, err := s.userRepo.GetByID(ctx, stored.UserID)
	if err != nil {
		return nil, fmt.Errorf("AuthService.Refresh: get user: %w", err)
	}
	if user == nil || !user.IsActive {
		return nil, ErrInvalidCredentials
	}

	tokens, err := s.generateTokens(ctx, user, stored.OrganizationID)
	if err != nil {
		return nil, fmt.Errorf("AuthService.Refresh: %w", err)
	}

	return tokens, nil
}

func (s *authService) Logout(ctx context.Context, rawRefreshToken string) error {
	if rawRefreshToken == "" {
		return nil
	}

	hash := hashToken(rawRefreshToken)
	stored, err := s.tokenRepo.GetByTokenHash(ctx, hash)
	if err != nil {
		return fmt.Errorf("AuthService.Logout: %w", err)
	}
	if stored == nil {
		return nil
	}

	if err := s.tokenRepo.RevokeAllForUser(ctx, stored.UserID); err != nil {
		return fmt.Errorf("AuthService.Logout: %w", err)
	}
	return nil
}

func (s *authService) GetMe(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) (*domain.AuthUser, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("AuthService.GetMe: %w", err)
	}
	if user == nil {
		return nil, ErrInvalidCredentials
	}

	org, err := s.orgRepo.GetByID(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("AuthService.GetMe: get org: %w", err)
	}

	return &domain.AuthUser{User: *user, Organization: *org}, nil
}

func (s *authService) ValidateAccessToken(tokenString string) (*domain.JWTClaims, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, fmt.Errorf("AuthService.ValidateAccessToken: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("AuthService.ValidateAccessToken: invalid claims")
	}

	sub, err := uuid.Parse(claims["sub"].(string))
	if err != nil {
		return nil, fmt.Errorf("AuthService.ValidateAccessToken: invalid sub: %w", err)
	}

	org, err := uuid.Parse(claims["org"].(string))
	if err != nil {
		return nil, fmt.Errorf("AuthService.ValidateAccessToken: invalid org: %w", err)
	}

	role := domain.Role(claims["role"].(string))

	return &domain.JWTClaims{Sub: sub, Org: org, Role: role}, nil
}

func (s *authService) generateTokens(ctx context.Context, user *domain.User, orgID uuid.UUID) (*domain.AuthTokens, error) {
	now := time.Now()

	accessClaims := jwt.MapClaims{
		"sub":  user.ID.String(),
		"org":  orgID.String(),
		"role": string(user.Role),
		"iat":  now.Unix(),
		"exp":  now.Add(accessTokenDuration).Unix(),
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessString, err := accessToken.SignedString(s.jwtSecret)
	if err != nil {
		return nil, fmt.Errorf("generateTokens: sign access: %w", err)
	}

	rawRefresh, err := generateRandomToken()
	if err != nil {
		return nil, fmt.Errorf("generateTokens: generate refresh: %w", err)
	}

	refreshHash := hashToken(rawRefresh)
	refreshToken := &domain.RefreshToken{
		ID:             uuid.New(),
		UserID:         user.ID,
		OrganizationID: orgID,
		TokenHash:      refreshHash,
		ExpiresAt:      now.Add(refreshTokenDuration),
		CreatedAt:      now,
	}

	if err := s.tokenRepo.Create(ctx, refreshToken); err != nil {
		return nil, fmt.Errorf("generateTokens: store refresh: %w", err)
	}

	csrfToken, err := generateRandomToken()
	if err != nil {
		return nil, fmt.Errorf("generateTokens: generate csrf: %w", err)
	}

	return &domain.AuthTokens{
		AccessToken:  accessString,
		RefreshToken: rawRefresh,
		CSRFToken:    csrfToken,
	}, nil
}

func generateRandomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generateRandomToken: %w", err)
	}
	return hex.EncodeToString(b), nil
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
