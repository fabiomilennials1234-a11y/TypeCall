package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

var (
	ErrFormNotFound  = errors.New("form not found")
	ErrSlugConflict  = errors.New("slug already exists")
	ErrFormNotDraft  = errors.New("form must be in draft status to publish")
	ErrEmptyDraft    = errors.New("cannot publish empty draft")
)

var (
	slugRegex    = regexp.MustCompile(`[^a-z0-9-]+`)
	multiHyphens = regexp.MustCompile(`-{2,}`)
	accentMap    = strings.NewReplacer(
		"á", "a", "à", "a", "ã", "a", "â", "a", "ä", "a",
		"é", "e", "è", "e", "ê", "e", "ë", "e",
		"í", "i", "ì", "i", "î", "i", "ï", "i",
		"ó", "o", "ò", "o", "õ", "o", "ô", "o", "ö", "o",
		"ú", "u", "ù", "u", "û", "u", "ü", "u",
		"ç", "c", "ñ", "n",
	)
)

type FormService interface {
	Create(ctx context.Context, orgID uuid.UUID, input domain.CreateFormInput) (*domain.Form, error)
	List(ctx context.Context, params domain.ListFormsParams) (*domain.ListFormsResult, error)
	Get(ctx context.Context, id uuid.UUID) (*domain.Form, error)
	Update(ctx context.Context, id uuid.UUID, input domain.UpdateFormInput) (*domain.Form, error)
	Delete(ctx context.Context, id uuid.UUID) error
	SaveDraft(ctx context.Context, id uuid.UUID, draft json.RawMessage) error
	Publish(ctx context.Context, id uuid.UUID, publishedBy uuid.UUID) (*domain.FormVersion, error)
}

type formService struct {
	formRepo    repository.FormRepository
	versionRepo repository.FormVersionRepository
}

func NewFormService(formRepo repository.FormRepository, versionRepo repository.FormVersionRepository) FormService {
	return &formService{formRepo: formRepo, versionRepo: versionRepo}
}

func (s *formService) Create(ctx context.Context, orgID uuid.UUID, input domain.CreateFormInput) (*domain.Form, error) {
	slug := input.Slug
	if slug == "" {
		slug = slugify(input.Title)
	} else {
		slug = strings.ToLower(strings.TrimSpace(slug))
	}

	exists, err := s.formRepo.SlugExists(ctx, slug)
	if err != nil {
		return nil, fmt.Errorf("FormService.Create: %w", err)
	}
	if exists {
		slug = slug + "-" + uuid.New().String()[:8]
	}

	now := time.Now()
	form := &domain.Form{
		ID:              uuid.New(),
		OrganizationID:  orgID,
		Title:           strings.TrimSpace(input.Title),
		Slug:            slug,
		Status:          domain.FormStatusDraft,
		Version:         0,
		DraftDefinition: json.RawMessage(`{"nodes":[],"edges":[]}`),
		Theme:           json.RawMessage(`{}`),
		Settings:        json.RawMessage(`{}`),
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if input.Description != "" {
		form.Description = &input.Description
	}

	if err := s.formRepo.Create(ctx, form); err != nil {
		return nil, fmt.Errorf("FormService.Create: %w", err)
	}

	return form, nil
}

func (s *formService) List(ctx context.Context, params domain.ListFormsParams) (*domain.ListFormsResult, error) {
	result, err := s.formRepo.List(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("FormService.List: %w", err)
	}
	return result, nil
}

func (s *formService) Get(ctx context.Context, id uuid.UUID) (*domain.Form, error) {
	form, err := s.formRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("FormService.Get: %w", err)
	}
	if form == nil {
		return nil, ErrFormNotFound
	}
	return form, nil
}

func (s *formService) Update(ctx context.Context, id uuid.UUID, input domain.UpdateFormInput) (*domain.Form, error) {
	form, err := s.formRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("FormService.Update: %w", err)
	}
	if form == nil {
		return nil, ErrFormNotFound
	}

	if input.Title != nil {
		form.Title = strings.TrimSpace(*input.Title)
	}
	if input.Description != nil {
		form.Description = input.Description
	}
	if input.Slug != nil {
		newSlug := strings.ToLower(strings.TrimSpace(*input.Slug))
		if newSlug != form.Slug {
			exists, err := s.formRepo.SlugExists(ctx, newSlug)
			if err != nil {
				return nil, fmt.Errorf("FormService.Update: %w", err)
			}
			if exists {
				return nil, ErrSlugConflict
			}
			form.Slug = newSlug
		}
	}
	if input.Theme != nil {
		form.Theme = *input.Theme
	}
	if input.Settings != nil {
		form.Settings = *input.Settings
	}

	if err := s.formRepo.Update(ctx, form); err != nil {
		return nil, fmt.Errorf("FormService.Update: %w", err)
	}

	return form, nil
}

func (s *formService) Delete(ctx context.Context, id uuid.UUID) error {
	if err := s.formRepo.SoftDelete(ctx, id); err != nil {
		return fmt.Errorf("FormService.Delete: %w", err)
	}
	return nil
}

func (s *formService) SaveDraft(ctx context.Context, id uuid.UUID, draft json.RawMessage) error {
	if err := s.formRepo.UpdateDraft(ctx, id, draft); err != nil {
		return fmt.Errorf("FormService.SaveDraft: %w", err)
	}
	return nil
}

func (s *formService) Publish(ctx context.Context, id uuid.UUID, publishedBy uuid.UUID) (*domain.FormVersion, error) {
	form, err := s.formRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("FormService.Publish: %w", err)
	}
	if form == nil {
		return nil, ErrFormNotFound
	}

	if form.Status != domain.FormStatusDraft && form.Status != domain.FormStatusPublished {
		return nil, ErrFormNotDraft
	}

	var draft struct {
		Nodes []any `json:"nodes"`
	}
	if err := json.Unmarshal(form.DraftDefinition, &draft); err != nil || len(draft.Nodes) == 0 {
		return nil, ErrEmptyDraft
	}

	now := time.Now()
	newVersion := form.Version + 1

	version := &domain.FormVersion{
		ID:             uuid.New(),
		FormID:         form.ID,
		OrganizationID: form.OrganizationID,
		VersionNumber:  newVersion,
		FlowDefinition: form.DraftDefinition,
		PublishedBy:    &publishedBy,
		CreatedAt:      now,
	}

	if err := s.versionRepo.Create(ctx, version); err != nil {
		return nil, fmt.Errorf("FormService.Publish: create version: %w", err)
	}

	form.Version = newVersion
	form.Status = domain.FormStatusPublished
	form.PublishedAt = &now

	if err := s.formRepo.Update(ctx, form); err != nil {
		return nil, fmt.Errorf("FormService.Publish: update form: %w", err)
	}

	return version, nil
}

func slugify(title string) string {
	s := strings.ToLower(strings.TrimSpace(title))
	s = accentMap.Replace(s)
	s = slugRegex.ReplaceAllString(s, "-")
	s = multiHyphens.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "form"
	}
	return s
}
