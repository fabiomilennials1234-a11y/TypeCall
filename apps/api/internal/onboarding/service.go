package onboarding

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/pixels"
	"github.com/typecall/api/internal/repository"
	"github.com/typecall/api/internal/sellers"
	"github.com/typecall/api/internal/service"
)

var (
	ErrInvalidPixelID = errors.New("invalid meta pixel id")
	ErrEmptyFlow      = errors.New("flow definition is empty")
	ErrOrgNotFound    = errors.New("organization not found")
)

// metaPixelIDRegex valida formato Meta Pixel ID (15 ou 16 digitos numericos).
var metaPixelIDRegex = regexp.MustCompile(`^\d{15,16}$`)

type Service interface {
	GetState(ctx context.Context, orgID uuid.UUID) (*State, error)
	Skip(ctx context.Context, orgID uuid.UUID) error
	Complete(ctx context.Context, userID, orgID uuid.UUID, userName string, input CompleteInput) (*CompleteOutput, error)
}

type service_ struct {
	orgRepo     repository.OrganizationRepository
	sellersSvc  sellers.Service
	pixelsSvc   pixels.Service
	formSvc     service.FormService
	pixelsRepo  pixels.Repository
}

func NewService(
	orgRepo repository.OrganizationRepository,
	sellersSvc sellers.Service,
	pixelsSvc pixels.Service,
	formSvc service.FormService,
	pixelsRepo pixels.Repository,
) Service {
	return &service_{
		orgRepo:    orgRepo,
		sellersSvc: sellersSvc,
		pixelsSvc:  pixelsSvc,
		formSvc:    formSvc,
		pixelsRepo: pixelsRepo,
	}
}

func (s *service_) GetState(ctx context.Context, orgID uuid.UUID) (*State, error) {
	org, err := s.orgRepo.GetByID(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("onboarding.Service.GetState: org: %w", err)
	}
	if org == nil {
		return nil, ErrOrgNotFound
	}

	st := &State{
		TemplateFormID:  org.TemplateFormID,
		HasTemplateForm: org.TemplateFormID != nil,
	}
	if org.OnboardedAt != nil {
		ts := org.OnboardedAt.Format("2006-01-02T15:04:05Z07:00")
		st.OnboardedAt = &ts
	}

	sellersList, err := s.sellersSvc.List(ctx, orgID, true)
	if err != nil {
		return nil, fmt.Errorf("onboarding.Service.GetState: sellers: %w", err)
	}
	st.HasSeller = len(sellersList) > 0

	pixelCfg, err := s.pixelsRepo.Get(ctx, orgID)
	if err == nil && pixelCfg != nil && pixelCfg.MetaPixelID != nil && *pixelCfg.MetaPixelID != "" {
		st.HasPixel = true
	}

	return st, nil
}

func (s *service_) Skip(ctx context.Context, orgID uuid.UUID) error {
	if err := s.orgRepo.MarkOnboarded(ctx, orgID, nil); err != nil {
		return fmt.Errorf("onboarding.Service.Skip: %w", err)
	}
	return nil
}

func (s *service_) Complete(ctx context.Context, userID, orgID uuid.UUID, userName string, input CompleteInput) (*CompleteOutput, error) {
	org, err := s.orgRepo.GetByID(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("onboarding.Service.Complete: org: %w", err)
	}
	if org == nil {
		return nil, ErrOrgNotFound
	}

	// Idempotencia: ja onboardado retorna estado existente sem novos inserts.
	if org.OnboardedAt != nil && org.TemplateFormID != nil {
		return &CompleteOutput{
			AlreadyOnboarded: true,
			FormID:           *org.TemplateFormID,
			SellerIDs:        []uuid.UUID{},
		}, nil
	}

	if input.Pixel.MetaPixelID != "" && !metaPixelIDRegex.MatchString(input.Pixel.MetaPixelID) {
		return nil, ErrInvalidPixelID
	}

	if !flowHasNodes(input.Form.FlowDefinition) {
		return nil, ErrEmptyFlow
	}
	if len(input.Sellers) == 0 {
		return nil, fmt.Errorf("onboarding.Service.Complete: at least 1 seller required")
	}

	sellerIDs := make([]uuid.UUID, 0, len(input.Sellers))

	// 1. Seller baseline do owner (idempotente — pode ja existir do register)
	ownerSeller, err := s.sellersSvc.CreateDefaultForOwner(ctx, userID, orgID, userName)
	if err != nil {
		return nil, fmt.Errorf("onboarding.Service.Complete: owner seller bootstrap: %w", err)
	}

	// 2. Para cada seller no payload, criar (se novo) ou atualizar (se IsOwner)
	for _, sIn := range input.Sellers {
		var sellerID uuid.UUID
		if sIn.IsOwner {
			// Atualiza seller do owner
			sellerID = ownerSeller.ID
			updateInput := buildUpdateSellerInput(sIn, ownerSeller.Name)
			if _, err := s.sellersSvc.Update(ctx, sellerID, updateInput); err != nil {
				return nil, fmt.Errorf("onboarding.Service.Complete: owner seller update: %w", err)
			}
		} else {
			// Cria seller perfil novo (sem user_id — usa orgID como placeholder do user_id de admin?)
			// Schema sellers.user_id e NOT NULL FK pra users. Usar userID do admin como placeholder
			// para sellers de perfil; eles compartilham agenda/conflict-check do mesmo user.
			tags := sIn.AllowedTags
			if tags == nil {
				tags = []string{"diamond", "gold", "silver", "bronze"}
			}
			created, err := s.sellersSvc.Create(ctx, orgID, domain.CreateSellerInput{
				UserID:                 userID,
				Name:                   sIn.Name,
				MeetingDurationMinutes: sIn.MeetingDurationMinutes,
				BufferAfterMinutes:     sIn.BufferAfterMinutes,
				LocationType:           sIn.LocationType,
				AllowedTags:            tags,
			})
			if err != nil {
				return nil, fmt.Errorf("onboarding.Service.Complete: seller create: %w", err)
			}
			sellerID = created.ID
		}

		if len(sIn.Availability) > 0 {
			availInput := domain.SetSellerAvailabilityInput{Slots: sIn.Availability}
			if _, err := s.sellersSvc.SetAvailability(ctx, sellerID, orgID, availInput); err != nil {
				return nil, fmt.Errorf("onboarding.Service.Complete: seller availability: %w", err)
			}
		}

		sellerIDs = append(sellerIDs, sellerID)
	}

	// 4. Upsert pixel (mesmo sem pixel_id — flags ainda salvas)
	var pixelIDPtr *string
	if input.Pixel.MetaPixelID != "" {
		v := input.Pixel.MetaPixelID
		pixelIDPtr = &v
	}
	pixelInput := domain.UpsertPixelConfigInput{
		MetaPixelID:   pixelIDPtr,
		FireOnStart:   input.Pixel.FireOnStart,
		FireOnBooking: input.Pixel.FireOnBooking,
	}
	if _, err := s.pixelsSvc.Upsert(ctx, orgID, pixelInput); err != nil {
		return nil, fmt.Errorf("onboarding.Service.Complete: pixel: %w", err)
	}

	// 5. Cria form template (status draft)
	formTitle := input.Form.Title
	if formTitle == "" {
		formTitle = "Funil principal"
	}
	form, err := s.formSvc.Create(ctx, orgID, domain.CreateFormInput{
		Title: formTitle,
	})
	if err != nil {
		return nil, fmt.Errorf("onboarding.Service.Complete: form create: %w", err)
	}

	// Persistir flow_definition como draft do form recem-criado.
	if err := s.formSvc.SaveDraft(ctx, orgID, form.ID, input.Form.FlowDefinition); err != nil {
		return nil, fmt.Errorf("onboarding.Service.Complete: form draft: %w", err)
	}

	// 6. Marca org onboardada com referencia ao form
	if err := s.orgRepo.MarkOnboarded(ctx, orgID, &form.ID); err != nil {
		return nil, fmt.Errorf("onboarding.Service.Complete: mark onboarded: %w", err)
	}

	return &CompleteOutput{
		AlreadyOnboarded: false,
		FormID:           form.ID,
		SellerIDs:        sellerIDs,
	}, nil
}

func buildUpdateSellerInput(in SellerInput, defaultName string) domain.UpdateSellerInput {
	out := domain.UpdateSellerInput{}
	if in.Name != "" {
		n := in.Name
		out.Name = &n
	} else if defaultName != "" {
		n := defaultName
		out.Name = &n
	}
	if in.MeetingDurationMinutes > 0 {
		d := in.MeetingDurationMinutes
		out.MeetingDurationMinutes = &d
	}
	if in.BufferAfterMinutes >= 0 {
		b := in.BufferAfterMinutes
		out.BufferAfterMinutes = &b
	}
	if in.LocationType != "" {
		l := in.LocationType
		out.LocationType = &l
	}
	if in.AllowedTags != nil {
		t := in.AllowedTags
		out.AllowedTags = &t
	}
	return out
}

// flowHasNodes verifica se flow_definition contem ao menos 1 node.
func flowHasNodes(raw json.RawMessage) bool {
	if len(raw) == 0 {
		return false
	}
	var probe struct {
		Nodes []json.RawMessage `json:"nodes"`
	}
	if err := json.Unmarshal(raw, &probe); err != nil {
		return false
	}
	return len(probe.Nodes) > 0
}
