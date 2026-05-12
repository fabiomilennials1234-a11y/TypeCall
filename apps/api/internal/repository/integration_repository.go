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

var ErrIntegrationNotFound = errors.New("integration credential not found")

type IntegrationRepository interface {
	Upsert(ctx context.Context, c *domain.IntegrationCredential) error
	GetByUserAndProvider(ctx context.Context, userID uuid.UUID, provider domain.IntegrationProvider) (*domain.IntegrationCredential, error)
	UpdateAccessToken(ctx context.Context, id uuid.UUID, ciphertext, nonce []byte, expiresAt any) error
	UpdateWatch(ctx context.Context, id uuid.UUID, channelID, resourceID string, expiry any) error
	UpdateSyncError(ctx context.Context, id uuid.UUID, syncError *string) error
	Delete(ctx context.Context, id uuid.UUID) error
	ListExpiringWatches(ctx context.Context, before any) ([]domain.IntegrationCredential, error)
}

type integrationRepository struct {
	pool *pgxpool.Pool
}

func NewIntegrationRepository(pool *pgxpool.Pool) IntegrationRepository {
	return &integrationRepository{pool: pool}
}

func (r *integrationRepository) Upsert(ctx context.Context, c *domain.IntegrationCredential) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		INSERT INTO integration_credentials (
			id, user_id, organization_id, provider, google_account_email,
			access_token_encrypted, access_token_nonce,
			refresh_token_encrypted, refresh_token_nonce,
			scope, access_token_expires_at,
			created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now())
		ON CONFLICT (user_id, provider) DO UPDATE SET
			google_account_email = EXCLUDED.google_account_email,
			access_token_encrypted = EXCLUDED.access_token_encrypted,
			access_token_nonce = EXCLUDED.access_token_nonce,
			refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
			refresh_token_nonce = EXCLUDED.refresh_token_nonce,
			scope = EXCLUDED.scope,
			access_token_expires_at = EXCLUDED.access_token_expires_at,
			sync_error = NULL,
			updated_at = now()
		RETURNING id, created_at, updated_at`

	err := conn.QueryRow(ctx, query,
		c.ID, c.UserID, c.OrganizationID, c.Provider, c.GoogleAccountEmail,
		c.AccessTokenEncrypted, c.AccessTokenNonce,
		c.RefreshTokenEncrypted, c.RefreshTokenNonce,
		c.Scope, c.AccessTokenExpiresAt,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return fmt.Errorf("IntegrationRepository.Upsert: %w", err)
	}
	return nil
}

func (r *integrationRepository) GetByUserAndProvider(ctx context.Context, userID uuid.UUID, provider domain.IntegrationProvider) (*domain.IntegrationCredential, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, user_id, organization_id, provider, google_account_email,
			access_token_encrypted, access_token_nonce,
			refresh_token_encrypted, refresh_token_nonce,
			scope, access_token_expires_at,
			watch_channel_id, watch_resource_id, watch_expiry,
			last_synced_at, sync_error,
			created_at, updated_at
		FROM integration_credentials
		WHERE user_id = $1 AND provider = $2`

	c := &domain.IntegrationCredential{}
	err := conn.QueryRow(ctx, query, userID, provider).Scan(
		&c.ID, &c.UserID, &c.OrganizationID, &c.Provider, &c.GoogleAccountEmail,
		&c.AccessTokenEncrypted, &c.AccessTokenNonce,
		&c.RefreshTokenEncrypted, &c.RefreshTokenNonce,
		&c.Scope, &c.AccessTokenExpiresAt,
		&c.WatchChannelID, &c.WatchResourceID, &c.WatchExpiry,
		&c.LastSyncedAt, &c.SyncError,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrIntegrationNotFound
		}
		return nil, fmt.Errorf("IntegrationRepository.GetByUserAndProvider: %w", err)
	}
	return c, nil
}

func (r *integrationRepository) UpdateAccessToken(ctx context.Context, id uuid.UUID, ciphertext, nonce []byte, expiresAt any) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		UPDATE integration_credentials
		SET access_token_encrypted = $2,
			access_token_nonce = $3,
			access_token_expires_at = $4,
			sync_error = NULL,
			updated_at = now()
		WHERE id = $1`

	tag, err := conn.Exec(ctx, query, id, ciphertext, nonce, expiresAt)
	if err != nil {
		return fmt.Errorf("IntegrationRepository.UpdateAccessToken: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrIntegrationNotFound
	}
	return nil
}

func (r *integrationRepository) UpdateWatch(ctx context.Context, id uuid.UUID, channelID, resourceID string, expiry any) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		UPDATE integration_credentials
		SET watch_channel_id = $2,
			watch_resource_id = $3,
			watch_expiry = $4,
			updated_at = now()
		WHERE id = $1`

	tag, err := conn.Exec(ctx, query, id, channelID, resourceID, expiry)
	if err != nil {
		return fmt.Errorf("IntegrationRepository.UpdateWatch: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrIntegrationNotFound
	}
	return nil
}

func (r *integrationRepository) UpdateSyncError(ctx context.Context, id uuid.UUID, syncError *string) error {
	conn := db.Conn(ctx, r.pool)
	query := `UPDATE integration_credentials SET sync_error = $2, updated_at = now() WHERE id = $1`

	_, err := conn.Exec(ctx, query, id, syncError)
	if err != nil {
		return fmt.Errorf("IntegrationRepository.UpdateSyncError: %w", err)
	}
	return nil
}

func (r *integrationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	conn := db.Conn(ctx, r.pool)
	tag, err := conn.Exec(ctx, `DELETE FROM integration_credentials WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("IntegrationRepository.Delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrIntegrationNotFound
	}
	return nil
}

func (r *integrationRepository) ListExpiringWatches(ctx context.Context, before any) ([]domain.IntegrationCredential, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, user_id, organization_id, provider, google_account_email,
			access_token_encrypted, access_token_nonce,
			refresh_token_encrypted, refresh_token_nonce,
			scope, access_token_expires_at,
			watch_channel_id, watch_resource_id, watch_expiry,
			last_synced_at, sync_error,
			created_at, updated_at
		FROM integration_credentials
		WHERE watch_channel_id IS NOT NULL AND watch_expiry < $1`

	rows, err := conn.Query(ctx, query, before)
	if err != nil {
		return nil, fmt.Errorf("IntegrationRepository.ListExpiringWatches: %w", err)
	}
	defer rows.Close()

	var out []domain.IntegrationCredential
	for rows.Next() {
		var c domain.IntegrationCredential
		if err := rows.Scan(
			&c.ID, &c.UserID, &c.OrganizationID, &c.Provider, &c.GoogleAccountEmail,
			&c.AccessTokenEncrypted, &c.AccessTokenNonce,
			&c.RefreshTokenEncrypted, &c.RefreshTokenNonce,
			&c.Scope, &c.AccessTokenExpiresAt,
			&c.WatchChannelID, &c.WatchResourceID, &c.WatchExpiry,
			&c.LastSyncedAt, &c.SyncError,
			&c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("IntegrationRepository.ListExpiringWatches: scan: %w", err)
		}
		out = append(out, c)
	}
	return out, nil
}
