package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type WebhookConfig struct {
	ID             uuid.UUID `json:"id"`
	OrganizationID uuid.UUID `json:"organization_id"`
	Name           string    `json:"name"`
	URL            string    `json:"url"`
	Secret         string    `json:"-"`
	IsActive       bool      `json:"is_active"`
	Events         []string  `json:"events"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type WebhookDeliveryStatus string

const (
	DeliveryPending    WebhookDeliveryStatus = "pending"
	DeliveryDelivered  WebhookDeliveryStatus = "delivered"
	DeliveryFailed     WebhookDeliveryStatus = "failed"
	DeliveryDeadLetter WebhookDeliveryStatus = "dead_letter"
)

type WebhookDelivery struct {
	ID             uuid.UUID             `json:"id"`
	WebhookID      uuid.UUID             `json:"webhook_id"`
	OrganizationID uuid.UUID             `json:"organization_id"`
	Event          string                `json:"event"`
	Payload        json.RawMessage       `json:"payload"`
	Status         WebhookDeliveryStatus `json:"status"`
	Attempts       int                   `json:"attempts"`
	LastAttemptAt  *time.Time            `json:"last_attempt_at,omitempty"`
	LastError      *string               `json:"last_error,omitempty"`
	ResponseStatus *int                  `json:"response_status,omitempty"`
	CreatedAt      time.Time             `json:"created_at"`
}

type CreateWebhookInput struct {
	Name   string   `json:"name"`
	URL    string   `json:"url"`
	Secret string   `json:"secret"`
	Events []string `json:"events"`
}

type UpdateWebhookInput struct {
	Name     *string  `json:"name"`
	URL      *string  `json:"url"`
	Secret   *string  `json:"secret"`
	IsActive *bool    `json:"is_active"`
	Events   []string `json:"events"`
}

type TorqueWebhookPayload struct {
	Source             string                  `json:"source"`
	FormID             *string                 `json:"form_id,omitempty"`
	FormTitle          *string                 `json:"form_title,omitempty"`
	ResponseID         *string                 `json:"response_id,omitempty"`
	Respondent         *TorqueRespondent       `json:"respondent,omitempty"`
	Answers            []TorqueAnswer          `json:"answers,omitempty"`
	QualificationScore *int                    `json:"qualification_score,omitempty"`
	Booking            *TorqueBookingPayload   `json:"booking,omitempty"`
	Metadata           map[string]interface{}  `json:"metadata,omitempty"`
}

type TorqueRespondent struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email,omitempty"`
	Phone string `json:"phone,omitempty"`
}

type TorqueAnswer struct {
	StepID    string      `json:"step_id"`
	StepTitle string      `json:"step_title"`
	StepType  string      `json:"step_type"`
	Value     interface{} `json:"value"`
	Score     *int        `json:"score"`
}

type TorqueBookingPayload struct {
	ID          string `json:"id"`
	EventType   string `json:"event_type"`
	EventTypeID string `json:"event_type_id"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
	Timezone    string `json:"timezone"`
	HostName    string `json:"host_name"`
	HostEmail   string `json:"host_email"`
	MeetingURL  string `json:"meeting_url,omitempty"`
	Status      string `json:"status"`
}
