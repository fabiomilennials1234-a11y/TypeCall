package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type AnalyticsEventType string

const (
	EventView                 AnalyticsEventType = "view"
	EventStart                AnalyticsEventType = "start"
	EventQuestionSeen         AnalyticsEventType = "question_seen"
	EventQuestionAnswered     AnalyticsEventType = "question_answered"
	EventBookingSlotSelected  AnalyticsEventType = "booking_slot_selected"
	EventSubmit               AnalyticsEventType = "submit"
	EventAbandon              AnalyticsEventType = "abandon"
	EventShare                AnalyticsEventType = "share"
)

type ResponseEvent struct {
	ID             uuid.UUID          `json:"id"`
	EventID        uuid.UUID          `json:"event_id"`
	FormID         uuid.UUID          `json:"form_id"`
	OrganizationID uuid.UUID          `json:"organization_id"`
	ResponseID     *uuid.UUID         `json:"response_id,omitempty"`
	StepID         *string            `json:"step_id,omitempty"`
	EventType      AnalyticsEventType `json:"event_type"`
	Metadata       json.RawMessage    `json:"metadata"`
	CreatedAt      time.Time          `json:"created_at"`
}

type IngestEventInput struct {
	EventID    uuid.UUID          `json:"event_id"`
	FormID     uuid.UUID          `json:"form_id"`
	ResponseID *uuid.UUID         `json:"response_id,omitempty"`
	StepID     *string            `json:"step_id,omitempty"`
	EventType  AnalyticsEventType `json:"event_type"`
	Metadata   json.RawMessage    `json:"metadata,omitempty"`
}

type IngestBatchInput struct {
	Events []IngestEventInput `json:"events"`
}

type FormDailyMetric struct {
	FormID      uuid.UUID `json:"form_id"`
	Date        string    `json:"date"`
	Views       int       `json:"views"`
	Starts      int       `json:"starts"`
	Completions int       `json:"completions"`
	Abandons    int       `json:"abandons"`
}

type AnalyticsSummary struct {
	Views          int     `json:"views"`
	Starts         int     `json:"starts"`
	Completions    int     `json:"completions"`
	Abandons       int     `json:"abandons"`
	CompletionRate float64 `json:"completion_rate"`
}

type StepDropoff struct {
	StepID    string `json:"step_id"`
	Seen      int    `json:"seen"`
	Answered  int    `json:"answered"`
	DropoffPc float64 `json:"dropoff_pct"`
}

type AnalyticsParams struct {
	FormID uuid.UUID `json:"form_id"`
	From   time.Time `json:"from"`
	To     time.Time `json:"to"`
}
