package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type FormStatus string

const (
	FormStatusDraft     FormStatus = "draft"
	FormStatusPublished FormStatus = "published"
	FormStatusArchived  FormStatus = "archived"
	FormStatusClosed    FormStatus = "closed"
)

type Form struct {
	ID              uuid.UUID       `json:"id"`
	OrganizationID  uuid.UUID       `json:"organization_id"`
	Title           string          `json:"title"`
	Slug            string          `json:"slug"`
	Description     *string         `json:"description,omitempty"`
	Status          FormStatus      `json:"status"`
	Version         int             `json:"version"`
	DraftDefinition json.RawMessage `json:"draft_definition,omitempty"`
	Theme           json.RawMessage `json:"theme"`
	Settings        json.RawMessage `json:"settings"`
	PublishedAt     *time.Time      `json:"published_at,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
	DeletedAt       *time.Time      `json:"-"`
}

type FormVersion struct {
	ID             uuid.UUID       `json:"id"`
	FormID         uuid.UUID       `json:"form_id"`
	OrganizationID uuid.UUID       `json:"organization_id"`
	VersionNumber  int             `json:"version_number"`
	FlowDefinition json.RawMessage `json:"flow_definition"`
	PublishedBy    *uuid.UUID      `json:"published_by,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
}

type CreateFormInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Slug        string `json:"slug"`
}

type UpdateFormInput struct {
	Title       *string          `json:"title"`
	Description *string          `json:"description"`
	Slug        *string          `json:"slug"`
	Theme       *json.RawMessage `json:"theme"`
	Settings    *json.RawMessage `json:"settings"`
}

type ListFormsParams struct {
	OrganizationID uuid.UUID
	Status         *FormStatus
	Limit          int
	Cursor         *string
}

type ListFormsResult struct {
	Forms      []Form  `json:"forms"`
	NextCursor *string `json:"next_cursor,omitempty"`
	HasMore    bool    `json:"has_more"`
}
