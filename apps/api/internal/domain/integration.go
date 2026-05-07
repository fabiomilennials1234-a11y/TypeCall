package domain

import (
	"time"

	"github.com/google/uuid"
)

type IntegrationProvider string

const (
	ProviderGoogleCalendar IntegrationProvider = "google_calendar"
	ProviderOutlook        IntegrationProvider = "outlook"
)

type IntegrationCredential struct {
	ID                    uuid.UUID           `json:"id"`
	OrganizationID        uuid.UUID           `json:"organization_id"`
	UserID                uuid.UUID           `json:"user_id"`
	Provider              IntegrationProvider `json:"provider"`
	AccessTokenEncrypted  []byte              `json:"-"`
	RefreshTokenEncrypted []byte              `json:"-"`
	TokenExpiry           time.Time           `json:"token_expiry"`
	Scopes                []string            `json:"scopes"`
	CalendarID            *string             `json:"calendar_id,omitempty"`
	WatchChannelID        *string             `json:"watch_channel_id,omitempty"`
	WatchExpiry           *time.Time          `json:"watch_expiry,omitempty"`
	CreatedAt             time.Time           `json:"created_at"`
	UpdatedAt             time.Time           `json:"updated_at"`
}
