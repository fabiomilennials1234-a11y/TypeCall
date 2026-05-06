package domain

import (
	"time"

	"github.com/google/uuid"
)

type AvailabilityRule struct {
	ID          uuid.UUID `json:"id"`
	EventTypeID uuid.UUID `json:"event_type_id"`
	UserID      uuid.UUID `json:"user_id"`
	DayOfWeek   int       `json:"day_of_week"`
	StartTime   string    `json:"start_time"`
	EndTime     string    `json:"end_time"`
	CreatedAt   time.Time `json:"created_at"`
}

type AvailabilityOverride struct {
	ID          uuid.UUID  `json:"id"`
	EventTypeID uuid.UUID  `json:"event_type_id"`
	UserID      uuid.UUID  `json:"user_id"`
	Date        string     `json:"date"`
	IsAvailable bool       `json:"is_available"`
	StartTime   *string    `json:"start_time,omitempty"`
	EndTime     *string    `json:"end_time,omitempty"`
	Reason      *string    `json:"reason,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type SetAvailabilityInput struct {
	Rules []AvailabilityRuleInput `json:"rules"`
}

type AvailabilityRuleInput struct {
	DayOfWeek int    `json:"day_of_week"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
}

type CreateOverrideInput struct {
	Date        string  `json:"date"`
	IsAvailable bool    `json:"is_available"`
	StartTime   *string `json:"start_time,omitempty"`
	EndTime     *string `json:"end_time,omitempty"`
	Reason      *string `json:"reason,omitempty"`
}
