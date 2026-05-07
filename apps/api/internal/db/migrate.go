package db

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

func RunMigrations(ctx context.Context, pool *pgxpool.Pool, migrationsFS embed.FS, dir string) error {
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	if err != nil {
		return fmt.Errorf("db.RunMigrations: create tracking table: %w", err)
	}

	entries, err := migrationsFS.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("db.RunMigrations: read dir: %w", err)
	}

	var upFiles []string
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".up.sql") {
			upFiles = append(upFiles, e.Name())
		}
	}
	sort.Strings(upFiles)

	for _, name := range upFiles {
		version := strings.TrimSuffix(name, ".up.sql")

		var exists bool
		err := pool.QueryRow(ctx,
			"SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)",
			version,
		).Scan(&exists)
		if err != nil {
			return fmt.Errorf("db.RunMigrations: check version %s: %w", version, err)
		}
		if exists {
			continue
		}

		path := name
		if dir != "." {
			path = dir + "/" + name
		}
		content, err := migrationsFS.ReadFile(path)
		if err != nil {
			return fmt.Errorf("db.RunMigrations: read %s: %w", name, err)
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("db.RunMigrations: begin tx for %s: %w", version, err)
		}

		if _, execErr := tx.Exec(ctx, string(content)); execErr != nil {
			tx.Rollback(ctx)

			var pgErr *pgconn.PgError
			if errors.As(execErr, &pgErr) && (pgErr.Code == "42P07" || pgErr.Code == "42710") {
				// Table already exists — DB was set up before migrator. Mark as applied.
				if _, err := pool.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING", version); err != nil {
					return fmt.Errorf("db.RunMigrations: mark existing %s: %w", version, err)
				}
				log.Info().Str("version", version).Msg("migration marked as applied (already exists)")
				continue
			}

			return fmt.Errorf("db.RunMigrations: exec %s: %w", name, execErr)
		}

		if _, err := tx.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", version); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("db.RunMigrations: record %s: %w", version, err)
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("db.RunMigrations: commit %s: %w", version, err)
		}

		log.Info().Str("version", version).Msg("migration applied")
	}

	return nil
}
