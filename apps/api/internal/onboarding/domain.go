// Package onboarding implementa o wizard de configuracao inicial da organizacao.
// Endpoints permitem admin/master configurar agenda do vendedor, pixel, e criar
// um form template em uma unica transacao atomica.
package onboarding

import (
	"encoding/json"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
)

// State e o estado do onboarding pra uma org.
type State struct {
	OnboardedAt     *string    `json:"onboarded_at,omitempty"`
	TemplateFormID  *uuid.UUID `json:"template_form_id,omitempty"`
	HasSeller       bool       `json:"has_seller"`
	HasPixel        bool       `json:"has_pixel"`
	HasTemplateForm bool       `json:"has_template_form"`
}

// CompleteInput recebe payload do wizard.
type CompleteInput struct {
	Sellers []SellerInput     `json:"sellers"`
	Pixel   PixelInput        `json:"pixel"`
	Form    FormTemplateInput `json:"form"`
}

// SellerInput descreve um vendedor a criar/atualizar.
// IsOwner=true marca o seller que ja existe (criado no register) e sera atualizado.
// Demais sellers sao criados como perfis (sem user real).
type SellerInput struct {
	Name                   string                           `json:"name"`
	MeetingDurationMinutes int                              `json:"meeting_duration_minutes"`
	BufferAfterMinutes     int                              `json:"buffer_after_minutes"`
	LocationType           domain.SellerLocationType        `json:"location_type"`
	AllowedTags            []string                         `json:"allowed_tags"`
	Availability           []domain.SellerAvailabilityInput `json:"availability"`
	IsOwner                bool                             `json:"is_owner"`
}

type PixelInput struct {
	MetaPixelID   string `json:"meta_pixel_id"`
	FireOnStart   bool   `json:"fire_on_start"`
	FireOnBooking bool   `json:"fire_on_booking"`
}

type FormTemplateInput struct {
	Title          string          `json:"title"`
	FlowDefinition json.RawMessage `json:"flow_definition"`
}

// CompleteOutput e o resultado de POST /onboarding/complete.
type CompleteOutput struct {
	AlreadyOnboarded bool        `json:"already_onboarded"`
	FormID           uuid.UUID   `json:"form_id"`
	SellerIDs        []uuid.UUID `json:"seller_ids"`
}
