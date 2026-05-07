package db

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func WithTx(ctx context.Context, pool *pgxpool.Pool, fn func(tx pgx.Tx) error) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("db.WithTx: begin: %w", err)
	}

	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(ctx); rbErr != nil {
			return fmt.Errorf("db.WithTx: rollback failed (%v) after: %w", rbErr, err)
		}
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("db.WithTx: commit: %w", err)
	}

	return nil
}

// WithTenantTx runs fn inside a transaction with `app.current_org` set so RLS
// policies allow access. Use from contexts that don't pass through the Tenant
// middleware (e.g., OAuth callbacks identified by signed state).
//
// The callback receives a context already bound to the transaction.
func WithTenantTx(ctx context.Context, pool *pgxpool.Pool, orgID uuid.UUID, fn func(ctx context.Context) error) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("db.WithTenantTx: begin: %w", err)
	}

	if _, err := tx.Exec(ctx, "SELECT set_config('app.current_org', $1, true)", orgID.String()); err != nil {
		_ = tx.Rollback(ctx)
		return fmt.Errorf("db.WithTenantTx: set_config: %w", err)
	}

	tenantCtx := WithTxCtx(ctx, tx)
	if err := fn(tenantCtx); err != nil {
		if rbErr := tx.Rollback(ctx); rbErr != nil {
			return fmt.Errorf("db.WithTenantTx: rollback failed (%v) after: %w", rbErr, err)
		}
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("db.WithTenantTx: commit: %w", err)
	}
	return nil
}
