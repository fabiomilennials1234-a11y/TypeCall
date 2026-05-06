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

type WebhookRepository interface {
	GetConfig(ctx context.Context, orgID uuid.UUID) (*domain.WebhookConfig, error)
	GetConfigByID(ctx context.Context, id uuid.UUID) (*domain.WebhookConfig, error)
	UpsertConfig(ctx context.Context, cfg *domain.WebhookConfig) error
	DeleteConfig(ctx context.Context, id uuid.UUID) error
	CreateDelivery(ctx context.Context, d *domain.WebhookDelivery) error
	UpdateDelivery(ctx context.Context, d *domain.WebhookDelivery) error
	ListDeliveries(ctx context.Context, orgID uuid.UUID, limit int) ([]domain.WebhookDelivery, error)
	GetPendingDeliveries(ctx context.Context, limit int) ([]domain.WebhookDelivery, error)
}

type webhookRepository struct {
	pool *pgxpool.Pool
}

func NewWebhookRepository(pool *pgxpool.Pool) WebhookRepository {
	return &webhookRepository{pool: pool}
}

func (r *webhookRepository) GetConfig(ctx context.Context, orgID uuid.UUID) (*domain.WebhookConfig, error) {
	conn := db.Conn(ctx, r.pool)
	cfg := &domain.WebhookConfig{}
	err := conn.QueryRow(ctx,
		`SELECT id, organization_id, name, url, secret, is_active, events, created_at, updated_at
		 FROM webhook_configs WHERE organization_id = $1`, orgID,
	).Scan(
		&cfg.ID, &cfg.OrganizationID, &cfg.Name, &cfg.URL, &cfg.Secret,
		&cfg.IsActive, &cfg.Events, &cfg.CreatedAt, &cfg.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("WebhookRepository.GetConfig: %w", err)
	}
	return cfg, nil
}

func (r *webhookRepository) GetConfigByID(ctx context.Context, id uuid.UUID) (*domain.WebhookConfig, error) {
	conn := db.Conn(ctx, r.pool)
	cfg := &domain.WebhookConfig{}
	err := conn.QueryRow(ctx,
		`SELECT id, organization_id, name, url, secret, is_active, events, created_at, updated_at
		 FROM webhook_configs WHERE id = $1`, id,
	).Scan(
		&cfg.ID, &cfg.OrganizationID, &cfg.Name, &cfg.URL, &cfg.Secret,
		&cfg.IsActive, &cfg.Events, &cfg.CreatedAt, &cfg.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("WebhookRepository.GetConfigByID: %w", err)
	}
	return cfg, nil
}

func (r *webhookRepository) UpsertConfig(ctx context.Context, cfg *domain.WebhookConfig) error {
	conn := db.Conn(ctx, r.pool)
	_, err := conn.Exec(ctx,
		`INSERT INTO webhook_configs (id, organization_id, name, url, secret, is_active, events, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 ON CONFLICT (organization_id) DO UPDATE SET
		   name = $3, url = $4, secret = $5, is_active = $6, events = $7, updated_at = $9`,
		cfg.ID, cfg.OrganizationID, cfg.Name, cfg.URL, cfg.Secret,
		cfg.IsActive, cfg.Events, cfg.CreatedAt, cfg.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("WebhookRepository.UpsertConfig: %w", err)
	}
	return nil
}

func (r *webhookRepository) DeleteConfig(ctx context.Context, id uuid.UUID) error {
	conn := db.Conn(ctx, r.pool)
	tag, err := conn.Exec(ctx, `DELETE FROM webhook_configs WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("WebhookRepository.DeleteConfig: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("WebhookRepository.DeleteConfig: not found")
	}
	return nil
}

func (r *webhookRepository) CreateDelivery(ctx context.Context, d *domain.WebhookDelivery) error {
	conn := db.Conn(ctx, r.pool)
	_, err := conn.Exec(ctx,
		`INSERT INTO webhook_deliveries (id, webhook_id, organization_id, event, payload, status, attempts, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		d.ID, d.WebhookID, d.OrganizationID, d.Event, d.Payload, d.Status, d.Attempts, d.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("WebhookRepository.CreateDelivery: %w", err)
	}
	return nil
}

func (r *webhookRepository) UpdateDelivery(ctx context.Context, d *domain.WebhookDelivery) error {
	conn := db.Conn(ctx, r.pool)
	_, err := conn.Exec(ctx,
		`UPDATE webhook_deliveries SET status = $2, attempts = $3, last_attempt_at = $4, last_error = $5, response_status = $6
		 WHERE id = $1`,
		d.ID, d.Status, d.Attempts, d.LastAttemptAt, d.LastError, d.ResponseStatus,
	)
	if err != nil {
		return fmt.Errorf("WebhookRepository.UpdateDelivery: %w", err)
	}
	return nil
}

func (r *webhookRepository) ListDeliveries(ctx context.Context, orgID uuid.UUID, limit int) ([]domain.WebhookDelivery, error) {
	conn := db.Conn(ctx, r.pool)
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	rows, err := conn.Query(ctx,
		`SELECT id, webhook_id, organization_id, event, payload, status, attempts, last_attempt_at, last_error, response_status, created_at
		 FROM webhook_deliveries WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2`,
		orgID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("WebhookRepository.ListDeliveries: %w", err)
	}
	defer rows.Close()

	var deliveries []domain.WebhookDelivery
	for rows.Next() {
		var d domain.WebhookDelivery
		if err := rows.Scan(
			&d.ID, &d.WebhookID, &d.OrganizationID, &d.Event, &d.Payload,
			&d.Status, &d.Attempts, &d.LastAttemptAt, &d.LastError, &d.ResponseStatus, &d.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("WebhookRepository.ListDeliveries: scan: %w", err)
		}
		deliveries = append(deliveries, d)
	}
	return deliveries, nil
}

func (r *webhookRepository) GetPendingDeliveries(ctx context.Context, limit int) ([]domain.WebhookDelivery, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT d.id, d.webhook_id, d.organization_id, d.event, d.payload, d.status, d.attempts,
		        d.last_attempt_at, d.last_error, d.response_status, d.created_at
		 FROM webhook_deliveries d
		 JOIN webhook_configs c ON c.id = d.webhook_id AND c.is_active = true
		 WHERE d.status IN ('pending', 'failed') AND d.attempts < 5
		 ORDER BY d.created_at
		 LIMIT $1`, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("WebhookRepository.GetPendingDeliveries: %w", err)
	}
	defer rows.Close()

	var deliveries []domain.WebhookDelivery
	for rows.Next() {
		var d domain.WebhookDelivery
		if err := rows.Scan(
			&d.ID, &d.WebhookID, &d.OrganizationID, &d.Event, &d.Payload,
			&d.Status, &d.Attempts, &d.LastAttemptAt, &d.LastError, &d.ResponseStatus, &d.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("WebhookRepository.GetPendingDeliveries: scan: %w", err)
		}
		deliveries = append(deliveries, d)
	}
	return deliveries, nil
}
