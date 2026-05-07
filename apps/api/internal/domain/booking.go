package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type BookingStatus string

const (
	BookingStatusPending     BookingStatus = "pending"
	BookingStatusConfirmed   BookingStatus = "confirmed"
	BookingStatusCompleted   BookingStatus = "completed"
	BookingStatusCancelled   BookingStatus = "cancelled"
	BookingStatusRescheduled BookingStatus = "rescheduled"
	BookingStatusNoShow      BookingStatus = "no_show"
)

type Booking struct {
	ID                uuid.UUID       `json:"id"`
	OrganizationID    uuid.UUID       `json:"organization_id"`
	EventTypeID       uuid.UUID       `json:"event_type_id"`
	HostUserID        uuid.UUID       `json:"host_user_id"`
	ResponseID        *uuid.UUID      `json:"response_id,omitempty"`
	AttendeeName      string          `json:"attendee_name"`
	AttendeeEmail     string          `json:"attendee_email"`
	AttendeePhone     *string         `json:"attendee_phone,omitempty"`
	StartTime         time.Time       `json:"start_time"`
	EndTime           time.Time       `json:"end_time"`
	Timezone          string          `json:"timezone"`
	Status            BookingStatus   `json:"status"`
	LocationType      LocationType    `json:"location_type"`
	LocationValue     *string         `json:"location_value,omitempty"`
	GoogleEventID     *string         `json:"google_event_id,omitempty"`
	MeetingURL        *string         `json:"meeting_url,omitempty"`
	CancelToken       string          `json:"-"`
	RescheduleToken   string          `json:"-"`
	Notes             *string         `json:"notes,omitempty"`
	Metadata          json.RawMessage `json:"metadata"`
	CancelledAt       *time.Time      `json:"cancelled_at,omitempty"`
	CancelReason      *string         `json:"cancel_reason,omitempty"`
	RescheduledFromID *uuid.UUID      `json:"rescheduled_from_id,omitempty"`
	KanbanStatus      KanbanStatus    `json:"kanban_status"`
	SellerID          *uuid.UUID      `json:"seller_id,omitempty"`
	LeadTag           *LeadTag        `json:"lead_tag,omitempty"`
	UTMSource         *string         `json:"utm_source,omitempty"`
	UTMMedium         *string         `json:"utm_medium,omitempty"`
	UTMCampaign       *string         `json:"utm_campaign,omitempty"`
	UTMContent        *string         `json:"utm_content,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

type CreateBookingInput struct {
	EventTypeID   uuid.UUID  `json:"event_type_id"`
	ResponseID    *uuid.UUID `json:"response_id,omitempty"`
	AttendeeName  string     `json:"attendee_name"`
	AttendeeEmail string     `json:"attendee_email"`
	AttendeePhone *string    `json:"attendee_phone,omitempty"`
	StartTime     time.Time  `json:"start_time"`
	Timezone      string     `json:"timezone"`
	Notes         *string    `json:"notes,omitempty"`
}

type ListBookingsParams struct {
	Limit      int
	Cursor     *string
	Status     *BookingStatus
	EventType  *uuid.UUID
	HostUserID *uuid.UUID
	From       *time.Time
	To         *time.Time
}

type ListBookingsResult struct {
	Bookings   []Booking `json:"bookings"`
	NextCursor *string   `json:"next_cursor,omitempty"`
	HasMore    bool      `json:"has_more"`
}

type TimeSlot struct {
	Start  time.Time `json:"start"`
	End    time.Time `json:"end"`
	HostID uuid.UUID `json:"host_id"`
}

type SlotParams struct {
	EventTypeID uuid.UUID `json:"event_type_id"`
	From        time.Time `json:"from"`
	To          time.Time `json:"to"`
	Timezone    string    `json:"timezone"`
}
