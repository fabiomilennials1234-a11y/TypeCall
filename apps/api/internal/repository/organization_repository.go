package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/typecall/api/internal/db"
	"github.com/typecall/api/internal/domain"
)

type OrganizationRepository interface {
	Create(ctx context.Context, org *domain.Organization) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Organization, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Organization, error)
	SlugExists(ctx context.Context, slug string) (bool, error)
	MarkOnboarded(ctx context.Context, orgID uuid.UUID, templateFormID *uuid.UUID) error
}

type organizationRepository struct {
	pool *pgxpool.Pool
}

func NewOrganizationRepository(pool *pgxpool.Pool) OrganizationRepository {
	return &organizationRepository{pool: pool}
}

func (r *organizationRepository) Create(ctx context.Context, org *domain.Organization) error {
	query := `
		INSERT INTO organizations (id, name, slug, logo_url, timezone, plan, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := r.pool.Exec(ctx, query,
		org.ID, org.Name, org.Slug, org.LogoURL, org.Timezone, org.Plan, org.CreatedAt, org.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("OrganizationRepository.Create: %w", err)
	}
	return nil
}

func (r *organizationRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Organization, error) {
	query := `
		SELECT id, name, slug, logo_url, timezone, plan, onboarded_at, template_form_id, created_at, updated_at
		FROM organizations WHERE id = $1`

	org := &domain.Organization{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&org.ID, &org.Name, &org.Slug, &org.LogoURL, &org.Timezone, &org.Plan,
		&org.OnboardedAt, &org.TemplateFormID, &org.CreatedAt, &org.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("OrganizationRepository.GetByID: %w", err)
	}
	return org, nil
}

func (r *organizationRepository) GetBySlug(ctx context.Context, slug string) (*domain.Organization, error) {
	query := `
		SELECT id, name, slug, logo_url, timezone, plan, onboarded_at, template_form_id, created_at, updated_at
		FROM organizations WHERE slug = $1`

	org := &domain.Organization{}
	err := r.pool.QueryRow(ctx, query, slug).Scan(
		&org.ID, &org.Name, &org.Slug, &org.LogoURL, &org.Timezone, &org.Plan,
		&org.OnboardedAt, &org.TemplateFormID, &org.CreatedAt, &org.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("OrganizationRepository.GetBySlug: %w", err)
	}
	return org, nil
}

func (r *organizationRepository) MarkOnboarded(ctx context.Context, orgID uuid.UUID, templateFormID *uuid.UUID) error {
	query := `
		UPDATE organizations
		   SET onboarded_at = COALESCE(onboarded_at, now()),
		       template_form_id = COALESCE($2, template_form_id),
		       updated_at = now()
		 WHERE id = $1`
	conn := db.Conn(ctx, r.pool)
	tag, err := conn.Exec(ctx, query, orgID, templateFormID)
	if err != nil {
		return fmt.Errorf("OrganizationRepository.MarkOnboarded: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *organizationRepository) SlugExists(ctx context.Context, slug string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM organizations WHERE slug = $1)`

	var exists bool
	err := r.pool.QueryRow(ctx, query, slug).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("OrganizationRepository.SlugExists: %w", err)
	}
	return exists, nil
}
