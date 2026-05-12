package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/typecall/api/internal/db"
)

var ErrABTestNotFound = errors.New("ab test not found")

type ABTestRepository interface {
	ListFormIDs(ctx context.Context, orgID, abTestID uuid.UUID) ([]uuid.UUID, error)
	Create(ctx context.Context, orgID uuid.UUID, name string, formIDs []uuid.UUID) (uuid.UUID, error)
}

type abTestRepository struct {
	pool *pgxpool.Pool
}

func NewABTestRepository(pool *pgxpool.Pool) ABTestRepository {
	return &abTestRepository{pool: pool}
}

func (r *abTestRepository) ListFormIDs(ctx context.Context, orgID, abTestID uuid.UUID) ([]uuid.UUID, error) {
	conn := db.Conn(ctx, r.pool)
	var ids []uuid.UUID
	err := conn.QueryRow(ctx, `
		SELECT form_ids FROM funnel_ab_tests
		 WHERE id = $1 AND organization_id = $2`, abTestID, orgID).Scan(&ids)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrABTestNotFound
		}
		return nil, fmt.Errorf("ABTestRepository.ListFormIDs: %w", err)
	}
	return ids, nil
}

func (r *abTestRepository) Create(ctx context.Context, orgID uuid.UUID, name string, formIDs []uuid.UUID) (uuid.UUID, error) {
	conn := db.Conn(ctx, r.pool)
	id := uuid.New()
	_, err := conn.Exec(ctx, `
		INSERT INTO funnel_ab_tests (id, organization_id, name, form_ids, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, true, now(), now())`, id, orgID, name, formIDs)
	if err != nil {
		return uuid.Nil, fmt.Errorf("ABTestRepository.Create: %w", err)
	}
	return id, nil
}
