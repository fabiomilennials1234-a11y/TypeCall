package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type LocationType string

const (
	LocationGoogleMeet LocationType = "google_meet"
	LocationCustomURL  LocationType = "custom_url"
	LocationInPerson   LocationType = "in_person"
)

type EventType struct {
	ID                  uuid.UUID       `json:"id"`
	OrganizationID      uuid.UUID       `json:"organization_id"`
	UserID              uuid.UUID       `json:"user_id"`
	Title               string          `json:"title"`
	Slug                string          `json:"slug"`
	Description         *string         `json:"description,omitempty"`
	DurationMinutes     int             `json:"duration_minutes"`
	BufferBeforeMinutes int             `json:"buffer_before_minutes"`
	BufferAfterMinutes  int             `json:"buffer_after_minutes"`
	MinNoticeHours      int             `json:"min_notice_hours"`
	MaxAdvanceDays      int             `json:"max_advance_days"`
	MaxPerDay           *int            `json:"max_per_day,omitempty"`
	LocationType        LocationType    `json:"location_type"`
	LocationValue       *string         `json:"location_value,omitempty"`
	Color               string          `json:"color"`
	IsActive            bool            `json:"is_active"`
	Settings            json.RawMessage `json:"settings"`
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

type CreateEventTypeInput struct {
	Title               string       `json:"title"`
	Slug                string       `json:"slug"`
	Description         string       `json:"description"`
	DurationMinutes     int          `json:"duration_minutes"`
	BufferBeforeMinutes int          `json:"buffer_before_minutes"`
	BufferAfterMinutes  int          `json:"buffer_after_minutes"`
	MinNoticeHours      int          `json:"min_notice_hours"`
	MaxAdvanceDays      int          `json:"max_advance_days"`
	MaxPerDay           *int         `json:"max_per_day"`
	LocationType        LocationType `json:"location_type"`
	LocationValue       string       `json:"location_value"`
	Color               string       `json:"color"`
}

type UpdateEventTypeInput struct {
	Title               *string       `json:"title"`
	Slug                *string       `json:"slug"`
	Description         *string       `json:"description"`
	DurationMinutes     *int          `json:"duration_minutes"`
	BufferBeforeMinutes *int          `json:"buffer_before_minutes"`
	BufferAfterMinutes  *int          `json:"buffer_after_minutes"`
	MinNoticeHours      *int          `json:"min_notice_hours"`
	MaxAdvanceDays      *int          `json:"max_advance_days"`
	MaxPerDay           *int          `json:"max_per_day"`
	LocationType        *LocationType `json:"location_type"`
	LocationValue       *string       `json:"location_value"`
	Color               *string       `json:"color"`
	IsActive            *bool         `json:"is_active"`
}

type ListEventTypesParams struct {
	Limit  int
	Cursor *string
	Active *bool
}

type ListEventTypesResult struct {
	EventTypes []EventType `json:"event_types"`
	NextCursor *string     `json:"next_cursor,omitempty"`
	HasMore    bool        `json:"has_more"`
}
