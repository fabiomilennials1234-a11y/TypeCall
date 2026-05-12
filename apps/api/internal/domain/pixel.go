package domain

import (
	"time"

	"github.com/google/uuid"
)

type PixelConfig struct {
	ID              uuid.UUID `json:"id"`
	OrganizationID  uuid.UUID `json:"organization_id"`
	MetaPixelID     *string   `json:"meta_pixel_id,omitempty"`
	FireOnStart     bool      `json:"fire_on_start"`
	FireOnBooking   bool      `json:"fire_on_booking"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type UpsertPixelConfigInput struct {
	MetaPixelID   *string `json:"meta_pixel_id,omitempty"`
	FireOnStart   bool    `json:"fire_on_start"`
	FireOnBooking bool    `json:"fire_on_booking"`
}
