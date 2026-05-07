package domain

import (
	"time"

	"github.com/google/uuid"
)

type IntegrationProvider string

const (
	IntegrationProviderGoogleCalendar IntegrationProvider = "google_calendar"
	IntegrationProviderOutlook        IntegrationProvider = "outlook"
)

type IntegrationCredential struct {
	ID                    uuid.UUID           `json:"id"`
	UserID                uuid.UUID           `json:"user_id"`
	OrganizationID        uuid.UUID           `json:"organization_id"`
	Provider              IntegrationProvider `json:"provider"`
	GoogleAccountEmail    string              `json:"google_account_email"`
	AccessTokenEncrypted  []byte              `json:"-"`
	AccessTokenNonce      []byte              `json:"-"`
	RefreshTokenEncrypted []byte              `json:"-"`
	RefreshTokenNonce     []byte              `json:"-"`
	Scope                 string              `json:"scope"`
	AccessTokenExpiresAt  time.Time           `json:"access_token_expires_at"`
	WatchChannelID        *string             `json:"watch_channel_id,omitempty"`
	WatchResourceID       *string             `json:"watch_resource_id,omitempty"`
	WatchExpiry           *time.Time          `json:"watch_expiry,omitempty"`
	LastSyncedAt          *time.Time          `json:"last_synced_at,omitempty"`
	SyncError             *string             `json:"sync_error,omitempty"`
	CreatedAt             time.Time           `json:"created_at"`
	UpdatedAt             time.Time           `json:"updated_at"`
}

// DecryptedTokens holds plaintext OAuth tokens. Never persisted; in-memory only.
type DecryptedTokens struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
}
