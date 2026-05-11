package domain

import (
	"time"

	"github.com/google/uuid"
)

type FormAsset struct {
	ID             uuid.UUID `json:"id"`
	FormID         uuid.UUID `json:"form_id"`
	OrganizationID uuid.UUID `json:"organization_id"`
	StoragePath    string    `json:"-"`
	URL            string    `json:"url"`
	MimeType       string    `json:"mime_type"`
	SizeBytes      int64     `json:"size_bytes"`
	Width          *int      `json:"width,omitempty"`
	Height         *int      `json:"height,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}
