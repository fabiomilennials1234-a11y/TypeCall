package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ResponseStatus string

const (
	ResponseStatusInProgress ResponseStatus = "in_progress"
	ResponseStatusCompleted  ResponseStatus = "completed"
	ResponseStatusAbandoned  ResponseStatus = "abandoned"
)

type Response struct {
	ID              uuid.UUID       `json:"id"`
	FormID          uuid.UUID       `json:"form_id"`
	FormVersionID   uuid.UUID       `json:"form_version_id"`
	OrganizationID  uuid.UUID       `json:"organization_id"`
	RespondentEmail *string         `json:"respondent_email,omitempty"`
	RespondentName  *string         `json:"respondent_name,omitempty"`
	Status          ResponseStatus  `json:"status"`
	Metadata        json.RawMessage `json:"metadata"`
	StartedAt       time.Time       `json:"started_at"`
	CompletedAt     *time.Time      `json:"completed_at,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	Answers         []ResponseAnswer `json:"answers,omitempty"`
}

type ResponseAnswer struct {
	ID         uuid.UUID       `json:"id"`
	ResponseID uuid.UUID       `json:"response_id"`
	NodeID     string          `json:"node_id"`
	Value      json.RawMessage `json:"value"`
	AnsweredAt time.Time       `json:"answered_at"`
}

type SubmitResponseInput struct {
	Answers         []SubmitAnswerInput `json:"answers"`
	RespondentEmail *string             `json:"respondent_email,omitempty"`
	RespondentName  *string             `json:"respondent_name,omitempty"`
	Metadata        json.RawMessage     `json:"metadata,omitempty"`
}

type SubmitAnswerInput struct {
	NodeID string          `json:"node_id"`
	Value  json.RawMessage `json:"value"`
}

type ListResponsesParams struct {
	FormID uuid.UUID
	Limit  int
	Cursor *string
	Status *ResponseStatus
}

type ListResponsesResult struct {
	Responses  []Response `json:"responses"`
	NextCursor *string    `json:"next_cursor"`
	HasMore    bool       `json:"has_more"`
}

type PublicForm struct {
	ID              uuid.UUID       `json:"id"`
	OrganizationID  uuid.UUID       `json:"-"`
	Title           string          `json:"title"`
	Slug            string          `json:"slug"`
	Description     *string         `json:"description,omitempty"`
	FormVersionID   uuid.UUID       `json:"form_version_id"`
	VersionNumber   int             `json:"version_number"`
	FlowDefinition  json.RawMessage `json:"flow_definition"`
	Theme           json.RawMessage `json:"theme"`
	Settings        json.RawMessage `json:"settings"`
}
