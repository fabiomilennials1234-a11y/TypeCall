package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
	"github.com/typecall/api/internal/repository"
)

var (
	ErrEventTypeNotFound = errors.New("event type not found")
	ErrEventTypeSlug     = errors.New("slug already exists for this organization")
)

type EventTypeService interface {
	Create(ctx context.Context, orgID uuid.UUID, userID uuid.UUID, input domain.CreateEventTypeInput) (*domain.EventType, error)
	Get(ctx context.Context, id uuid.UUID) (*domain.EventType, error)
	List(ctx context.Context, params domain.ListEventTypesParams) (*domain.ListEventTypesResult, error)
	Update(ctx context.Context, id uuid.UUID, input domain.UpdateEventTypeInput) (*domain.EventType, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type eventTypeService struct {
	repo repository.EventTypeRepository
}

func NewEventTypeService(repo repository.EventTypeRepository) EventTypeService {
	return &eventTypeService{repo: repo}
}

func (s *eventTypeService) Create(ctx context.Context, orgID uuid.UUID, userID uuid.UUID, input domain.CreateEventTypeInput) (*domain.EventType, error) {
	slug := input.Slug
	if slug == "" {
		slug = slugify(input.Title)
	} else {
		slug = strings.ToLower(strings.TrimSpace(slug))
	}

	exists, err := s.repo.SlugExists(ctx, orgID, slug)
	if err != nil {
		return nil, fmt.Errorf("EventTypeService.Create: %w", err)
	}
	if exists {
		slug = slug + "-" + uuid.New().String()[:8]
	}

	duration := input.DurationMinutes
	if duration <= 0 {
		duration = 30
	}

	now := time.Now()
	et := &domain.EventType{
		ID:                  uuid.New(),
		OrganizationID:      orgID,
		UserID:              userID,
		Title:               strings.TrimSpace(input.Title),
		Slug:                slug,
		DurationMinutes:     duration,
		BufferBeforeMinutes: input.BufferBeforeMinutes,
		BufferAfterMinutes:  input.BufferAfterMinutes,
		MinNoticeHours:      input.MinNoticeHours,
		MaxAdvanceDays:      input.MaxAdvanceDays,
		MaxPerDay:           input.MaxPerDay,
		LocationType:        input.LocationType,
		Color:               input.Color,
		IsActive:            true,
		Settings:            json.RawMessage(`{}`),
		CreatedAt:           now,
		UpdatedAt:           now,
	}

	if input.Description != "" {
		et.Description = &input.Description
	}
	if input.LocationValue != "" {
		et.LocationValue = &input.LocationValue
	}
	if et.LocationType == "" {
		et.LocationType = domain.LocationGoogleMeet
	}
	if et.Color == "" {
		et.Color = "#6366f1"
	}
	if et.MinNoticeHours <= 0 {
		et.MinNoticeHours = 2
	}
	if et.MaxAdvanceDays <= 0 {
		et.MaxAdvanceDays = 30
	}
	if et.BufferAfterMinutes <= 0 && input.BufferAfterMinutes == 0 {
		et.BufferAfterMinutes = 15
	}

	if err := s.repo.Create(ctx, et); err != nil {
		return nil, fmt.Errorf("EventTypeService.Create: %w", err)
	}

	return et, nil
}

func (s *eventTypeService) Get(ctx context.Context, id uuid.UUID) (*domain.EventType, error) {
	et, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("EventTypeService.Get: %w", err)
	}
	if et == nil {
		return nil, ErrEventTypeNotFound
	}
	return et, nil
}

func (s *eventTypeService) List(ctx context.Context, params domain.ListEventTypesParams) (*domain.ListEventTypesResult, error) {
	result, err := s.repo.List(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("EventTypeService.List: %w", err)
	}
	return result, nil
}

func (s *eventTypeService) Update(ctx context.Context, id uuid.UUID, input domain.UpdateEventTypeInput) (*domain.EventType, error) {
	et, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("EventTypeService.Update: %w", err)
	}
	if et == nil {
		return nil, ErrEventTypeNotFound
	}

	if input.Title != nil {
		et.Title = strings.TrimSpace(*input.Title)
	}
	if input.Slug != nil {
		newSlug := strings.ToLower(strings.TrimSpace(*input.Slug))
		if newSlug != et.Slug {
			exists, err := s.repo.SlugExists(ctx, et.OrganizationID, newSlug)
			if err != nil {
				return nil, fmt.Errorf("EventTypeService.Update: %w", err)
			}
			if exists {
				return nil, ErrEventTypeSlug
			}
			et.Slug = newSlug
		}
	}
	if input.Description != nil {
		et.Description = input.Description
	}
	if input.DurationMinutes != nil {
		et.DurationMinutes = *input.DurationMinutes
	}
	if input.BufferBeforeMinutes != nil {
		et.BufferBeforeMinutes = *input.BufferBeforeMinutes
	}
	if input.BufferAfterMinutes != nil {
		et.BufferAfterMinutes = *input.BufferAfterMinutes
	}
	if input.MinNoticeHours != nil {
		et.MinNoticeHours = *input.MinNoticeHours
	}
	if input.MaxAdvanceDays != nil {
		et.MaxAdvanceDays = *input.MaxAdvanceDays
	}
	if input.MaxPerDay != nil {
		et.MaxPerDay = input.MaxPerDay
	}
	if input.LocationType != nil {
		et.LocationType = *input.LocationType
	}
	if input.LocationValue != nil {
		et.LocationValue = input.LocationValue
	}
	if input.Color != nil {
		et.Color = *input.Color
	}
	if input.IsActive != nil {
		et.IsActive = *input.IsActive
	}

	if err := s.repo.Update(ctx, et); err != nil {
		return nil, fmt.Errorf("EventTypeService.Update: %w", err)
	}

	return et, nil
}

func (s *eventTypeService) Delete(ctx context.Context, id uuid.UUID) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("EventTypeService.Delete: %w", err)
	}
	return nil
}
