package domain

import (
	"time"

	"github.com/google/uuid"
)

type KanbanStatus string

const (
	KanbanStatusToConfirm    KanbanStatus = "to_confirm"
	KanbanStatusPreConfirmed KanbanStatus = "pre_confirmed"
	KanbanStatusConfirmed    KanbanStatus = "confirmed"
	KanbanStatusRescheduled  KanbanStatus = "rescheduled"
	KanbanStatusNoShow       KanbanStatus = "no_show"
	KanbanStatusCompleted    KanbanStatus = "completed"
)

// AllowedKanbanTransitions encodes the legal status moves. A status not in the
// map can still go to "rescheduled" or "no_show" (handled in the service).
var AllowedKanbanTransitions = map[KanbanStatus][]KanbanStatus{
	KanbanStatusToConfirm:    {KanbanStatusPreConfirmed, KanbanStatusRescheduled, KanbanStatusNoShow},
	KanbanStatusPreConfirmed: {KanbanStatusConfirmed, KanbanStatusRescheduled, KanbanStatusNoShow},
	KanbanStatusConfirmed:    {KanbanStatusCompleted, KanbanStatusRescheduled, KanbanStatusNoShow},
	KanbanStatusRescheduled:  {KanbanStatusToConfirm, KanbanStatusPreConfirmed, KanbanStatusConfirmed, KanbanStatusNoShow},
	KanbanStatusNoShow:       {KanbanStatusRescheduled},
	KanbanStatusCompleted:    {},
}

type BookingHistory struct {
	ID              uuid.UUID    `json:"id"`
	BookingID       uuid.UUID    `json:"booking_id"`
	OrganizationID  uuid.UUID    `json:"organization_id"`
	FromStatus      *KanbanStatus `json:"from_status,omitempty"`
	ToStatus        KanbanStatus  `json:"to_status"`
	ChangedByUserID *uuid.UUID    `json:"changed_by_user_id,omitempty"`
	Notes           *string       `json:"notes,omitempty"`
	ChangedAt       time.Time     `json:"changed_at"`
}

type KanbanBoard struct {
	ToConfirm    []Booking `json:"to_confirm"`
	PreConfirmed []Booking `json:"pre_confirmed"`
	Confirmed    []Booking `json:"confirmed"`
	Rescheduled  []Booking `json:"rescheduled"`
	NoShow       []Booking `json:"no_show"`
	Completed    []Booking `json:"completed"`
}
