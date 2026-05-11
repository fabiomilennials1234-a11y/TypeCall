// Package pixels stores Meta Pixel configuration per organization.
package pixels

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/typecall/api/internal/db"
	"github.com/typecall/api/internal/domain"
)

var ErrPixelConfigNotFound = errors.New("pixel config not found")

type Repository interface {
	Get(ctx context.Context, orgID uuid.UUID) (*domain.PixelConfig, error)
	Upsert(ctx context.Context, c *domain.PixelConfig) error
	GetByFormSlug(ctx context.Context, slug string) (*domain.PixelConfig, error)
}

type pgRepo struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgRepo{pool: pool}
}

func (r *pgRepo) Get(ctx context.Context, orgID uuid.UUID) (*domain.PixelConfig, error) {
	conn := db.Conn(ctx, r.pool)
	c := &domain.PixelConfig{}
	err := conn.QueryRow(ctx, `
		SELECT id, organization_id, meta_pixel_id, fire_on_start, fire_on_booking,
			created_at, updated_at
		  FROM pixel_config WHERE organization_id = $1`, orgID).Scan(
		&c.ID, &c.OrganizationID, &c.MetaPixelID, &c.FireOnStart, &c.FireOnBooking,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPixelConfigNotFound
		}
		return nil, fmt.Errorf("pixels.Repository.Get: %w", err)
	}
	return c, nil
}

// GetByFormSlug e o lookup publico (sem RLS) usado pelo runner.
// Resolve org via slug do form e retorna pixel_config dessa org.
// Pool direto — nao depende de tenant context.
func (r *pgRepo) GetByFormSlug(ctx context.Context, slug string) (*domain.PixelConfig, error) {
	c := &domain.PixelConfig{}
	err := r.pool.QueryRow(ctx, `
		SELECT p.id, p.organization_id, p.meta_pixel_id, p.fire_on_start, p.fire_on_booking,
			p.created_at, p.updated_at
		  FROM pixel_config p
		  JOIN forms f ON f.organization_id = p.organization_id
		 WHERE f.slug = $1 AND f.deleted_at IS NULL
		 LIMIT 1`, slug).Scan(
		&c.ID, &c.OrganizationID, &c.MetaPixelID, &c.FireOnStart, &c.FireOnBooking,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPixelConfigNotFound
		}
		return nil, fmt.Errorf("pixels.Repository.GetByFormSlug: %w", err)
	}
	return c, nil
}

func (r *pgRepo) Upsert(ctx context.Context, c *domain.PixelConfig) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		INSERT INTO pixel_config (id, organization_id, meta_pixel_id, fire_on_start, fire_on_booking, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, now(), now())
		ON CONFLICT (organization_id) DO UPDATE SET
			meta_pixel_id   = EXCLUDED.meta_pixel_id,
			fire_on_start   = EXCLUDED.fire_on_start,
			fire_on_booking = EXCLUDED.fire_on_booking,
			updated_at      = now()
		RETURNING id, created_at, updated_at`

	err := conn.QueryRow(ctx, query,
		c.ID, c.OrganizationID, c.MetaPixelID, c.FireOnStart, c.FireOnBooking,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return fmt.Errorf("pixels.Repository.Upsert: %w", err)
	}
	return nil
}
