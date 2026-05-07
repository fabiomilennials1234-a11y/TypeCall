package domain

import (
	"time"

	"github.com/google/uuid"
)

type RefreshToken struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	OrganizationID uuid.UUID  `json:"organization_id"`
	TokenHash      string     `json:"-"`
	ExpiresAt      time.Time  `json:"expires_at"`
	RevokedAt      *time.Time `json:"revoked_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type JWTClaims struct {
	Sub  uuid.UUID `json:"sub"`
	Org  uuid.UUID `json:"org"`
	Role Role      `json:"role"`
}

type AuthTokens struct {
	AccessToken  string `json:"access_token"`
	CSRFToken    string `json:"csrf_token"`
	RefreshToken string `json:"-"`
}

type RegisterInput struct {
	OrgName  string `json:"org_name"`
	OrgSlug  string `json:"org_slug"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthUser struct {
	User         User         `json:"user"`
	Organization Organization `json:"organization"`
}
