package pixels

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/typecall/api/internal/domain"
)

type Service interface {
	Get(ctx context.Context, orgID uuid.UUID) (*domain.PixelConfig, error)
	Upsert(ctx context.Context, orgID uuid.UUID, input domain.UpsertPixelConfigInput) (*domain.PixelConfig, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Get(ctx context.Context, orgID uuid.UUID) (*domain.PixelConfig, error) {
	cfg, err := s.repo.Get(ctx, orgID)
	if err != nil {
		if errors.Is(err, ErrPixelConfigNotFound) {
			// Sales Deals: org sem config retorna defaults
			return &domain.PixelConfig{
				OrganizationID: orgID,
				FireOnStart:    false,
				FireOnBooking:  true,
			}, nil
		}
		return nil, err
	}
	return cfg, nil
}

func (s *service) Upsert(ctx context.Context, orgID uuid.UUID, input domain.UpsertPixelConfigInput) (*domain.PixelConfig, error) {
	cfg := &domain.PixelConfig{
		ID:             uuid.New(),
		OrganizationID: orgID,
		MetaPixelID:    input.MetaPixelID,
		FireOnStart:    input.FireOnStart,
		FireOnBooking:  input.FireOnBooking,
	}
	if err := s.repo.Upsert(ctx, cfg); err != nil {
		return nil, fmt.Errorf("pixels.Service.Upsert: %w", err)
	}
	return cfg, nil
}
