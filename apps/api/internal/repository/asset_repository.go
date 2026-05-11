package repository

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

var ErrAssetNotFound = errors.New("form asset not found")

type AssetRepository interface {
	Create(ctx context.Context, a *domain.FormAsset) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.FormAsset, error)
	ListByForm(ctx context.Context, formID uuid.UUID) ([]domain.FormAsset, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type assetRepository struct {
	pool *pgxpool.Pool
}

func NewAssetRepository(pool *pgxpool.Pool) AssetRepository {
	return &assetRepository{pool: pool}
}

func (r *assetRepository) Create(ctx context.Context, a *domain.FormAsset) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		INSERT INTO form_assets (id, form_id, organization_id, storage_path, url, mime_type, size_bytes, width, height, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
		RETURNING created_at`

	err := conn.QueryRow(ctx, query,
		a.ID, a.FormID, a.OrganizationID, a.StoragePath, a.URL, a.MimeType, a.SizeBytes, a.Width, a.Height,
	).Scan(&a.CreatedAt)
	if err != nil {
		return fmt.Errorf("AssetRepository.Create: %w", err)
	}
	return nil
}

func (r *assetRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.FormAsset, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, form_id, organization_id, storage_path, url, mime_type, size_bytes, width, height, created_at
		FROM form_assets WHERE id = $1`

	a := &domain.FormAsset{}
	err := conn.QueryRow(ctx, query, id).Scan(
		&a.ID, &a.FormID, &a.OrganizationID, &a.StoragePath, &a.URL, &a.MimeType, &a.SizeBytes, &a.Width, &a.Height, &a.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAssetNotFound
		}
		return nil, fmt.Errorf("AssetRepository.GetByID: %w", err)
	}
	return a, nil
}

func (r *assetRepository) ListByForm(ctx context.Context, formID uuid.UUID) ([]domain.FormAsset, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, form_id, organization_id, storage_path, url, mime_type, size_bytes, width, height, created_at
		FROM form_assets WHERE form_id = $1 ORDER BY created_at DESC`

	rows, err := conn.Query(ctx, query, formID)
	if err != nil {
		return nil, fmt.Errorf("AssetRepository.ListByForm: %w", err)
	}
	defer rows.Close()

	var assets []domain.FormAsset
	for rows.Next() {
		var a domain.FormAsset
		if err := rows.Scan(
			&a.ID, &a.FormID, &a.OrganizationID, &a.StoragePath, &a.URL, &a.MimeType, &a.SizeBytes, &a.Width, &a.Height, &a.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("AssetRepository.ListByForm: scan: %w", err)
		}
		assets = append(assets, a)
	}
	return assets, nil
}

func (r *assetRepository) Delete(ctx context.Context, id uuid.UUID) error {
	conn := db.Conn(ctx, r.pool)
	tag, err := conn.Exec(ctx, `DELETE FROM form_assets WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("AssetRepository.Delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrAssetNotFound
	}
	return nil
}
