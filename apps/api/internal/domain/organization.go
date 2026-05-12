package domain

import (
	"time"

	"github.com/google/uuid"
)

type Plan string

const (
	PlanFree       Plan = "free"
	PlanStarter    Plan = "starter"
	PlanPro        Plan = "pro"
	PlanEnterprise Plan = "enterprise"
)

type Organization struct {
	ID              uuid.UUID  `json:"id"`
	Name            string     `json:"name"`
	Slug            string     `json:"slug"`
	LogoURL         *string    `json:"logo_url,omitempty"`
	Timezone        string     `json:"timezone"`
	Plan            Plan       `json:"plan"`
	OnboardedAt     *time.Time `json:"onboarded_at,omitempty"`
	TemplateFormID  *uuid.UUID `json:"template_form_id,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}
