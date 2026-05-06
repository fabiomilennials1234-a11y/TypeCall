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

type AvailabilityRepository interface {
	ListRules(ctx context.Context, eventTypeID uuid.UUID) ([]domain.AvailabilityRule, error)
	ReplaceRules(ctx context.Context, eventTypeID uuid.UUID, userID uuid.UUID, rules []domain.AvailabilityRule) error
	CreateOverride(ctx context.Context, o *domain.AvailabilityOverride) error
	ListOverrides(ctx context.Context, eventTypeID uuid.UUID) ([]domain.AvailabilityOverride, error)
	DeleteOverride(ctx context.Context, id uuid.UUID) error
	GetOverrideByID(ctx context.Context, id uuid.UUID) (*domain.AvailabilityOverride, error)
	ListRulesByUserAndDay(ctx context.Context, userID uuid.UUID, eventTypeID uuid.UUID, dayOfWeek int) ([]domain.AvailabilityRule, error)
	ListOverridesByUserAndDate(ctx context.Context, userID uuid.UUID, eventTypeID uuid.UUID, date string) ([]domain.AvailabilityOverride, error)
}

type availabilityRepository struct {
	pool *pgxpool.Pool
}

func NewAvailabilityRepository(pool *pgxpool.Pool) AvailabilityRepository {
	return &availabilityRepository{pool: pool}
}

func (r *availabilityRepository) ListRules(ctx context.Context, eventTypeID uuid.UUID) ([]domain.AvailabilityRule, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, event_type_id, user_id, day_of_week, start_time::text, end_time::text, created_at
		FROM availability_rules
		WHERE event_type_id = $1
		ORDER BY day_of_week, start_time`

	rows, err := conn.Query(ctx, query, eventTypeID)
	if err != nil {
		return nil, fmt.Errorf("AvailabilityRepository.ListRules: %w", err)
	}
	defer rows.Close()

	var rules []domain.AvailabilityRule
	for rows.Next() {
		var rule domain.AvailabilityRule
		if err := rows.Scan(
			&rule.ID, &rule.EventTypeID, &rule.UserID,
			&rule.DayOfWeek, &rule.StartTime, &rule.EndTime, &rule.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("AvailabilityRepository.ListRules: scan: %w", err)
		}
		rules = append(rules, rule)
	}
	return rules, nil
}

func (r *availabilityRepository) ReplaceRules(ctx context.Context, eventTypeID uuid.UUID, userID uuid.UUID, rules []domain.AvailabilityRule) error {
	conn := db.Conn(ctx, r.pool)

	_, err := conn.Exec(ctx,
		`DELETE FROM availability_rules WHERE event_type_id = $1 AND user_id = $2`,
		eventTypeID, userID,
	)
	if err != nil {
		return fmt.Errorf("AvailabilityRepository.ReplaceRules: delete: %w", err)
	}

	for _, rule := range rules {
		_, err := conn.Exec(ctx,
			`INSERT INTO availability_rules (id, event_type_id, user_id, day_of_week, start_time, end_time)
			 VALUES ($1, $2, $3, $4, $5::time, $6::time)`,
			rule.ID, rule.EventTypeID, rule.UserID, rule.DayOfWeek, rule.StartTime, rule.EndTime,
		)
		if err != nil {
			return fmt.Errorf("AvailabilityRepository.ReplaceRules: insert: %w", err)
		}
	}

	return nil
}

func (r *availabilityRepository) CreateOverride(ctx context.Context, o *domain.AvailabilityOverride) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		INSERT INTO availability_overrides (id, event_type_id, user_id, date, is_available, start_time, end_time, reason)
		VALUES ($1, $2, $3, $4::date, $5, $6::time, $7::time, $8)`

	_, err := conn.Exec(ctx, query,
		o.ID, o.EventTypeID, o.UserID, o.Date, o.IsAvailable, o.StartTime, o.EndTime, o.Reason,
	)
	if err != nil {
		return fmt.Errorf("AvailabilityRepository.CreateOverride: %w", err)
	}
	return nil
}

func (r *availabilityRepository) ListOverrides(ctx context.Context, eventTypeID uuid.UUID) ([]domain.AvailabilityOverride, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, event_type_id, user_id, date::text, is_available, start_time::text, end_time::text, reason, created_at
		FROM availability_overrides
		WHERE event_type_id = $1
		ORDER BY date`

	rows, err := conn.Query(ctx, query, eventTypeID)
	if err != nil {
		return nil, fmt.Errorf("AvailabilityRepository.ListOverrides: %w", err)
	}
	defer rows.Close()

	var overrides []domain.AvailabilityOverride
	for rows.Next() {
		var o domain.AvailabilityOverride
		if err := rows.Scan(
			&o.ID, &o.EventTypeID, &o.UserID, &o.Date, &o.IsAvailable,
			&o.StartTime, &o.EndTime, &o.Reason, &o.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("AvailabilityRepository.ListOverrides: scan: %w", err)
		}
		overrides = append(overrides, o)
	}
	return overrides, nil
}

func (r *availabilityRepository) DeleteOverride(ctx context.Context, id uuid.UUID) error {
	conn := db.Conn(ctx, r.pool)
	tag, err := conn.Exec(ctx, `DELETE FROM availability_overrides WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("AvailabilityRepository.DeleteOverride: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("AvailabilityRepository.DeleteOverride: not found")
	}
	return nil
}

func (r *availabilityRepository) GetOverrideByID(ctx context.Context, id uuid.UUID) (*domain.AvailabilityOverride, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, event_type_id, user_id, date::text, is_available, start_time::text, end_time::text, reason, created_at
		FROM availability_overrides
		WHERE id = $1`

	o := &domain.AvailabilityOverride{}
	err := conn.QueryRow(ctx, query, id).Scan(
		&o.ID, &o.EventTypeID, &o.UserID, &o.Date, &o.IsAvailable,
		&o.StartTime, &o.EndTime, &o.Reason, &o.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("AvailabilityRepository.GetOverrideByID: %w", err)
	}
	return o, nil
}

func (r *availabilityRepository) ListRulesByUserAndDay(ctx context.Context, userID uuid.UUID, eventTypeID uuid.UUID, dayOfWeek int) ([]domain.AvailabilityRule, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, event_type_id, user_id, day_of_week, start_time::text, end_time::text, created_at
		FROM availability_rules
		WHERE user_id = $1 AND event_type_id = $2 AND day_of_week = $3
		ORDER BY start_time`

	rows, err := conn.Query(ctx, query, userID, eventTypeID, dayOfWeek)
	if err != nil {
		return nil, fmt.Errorf("AvailabilityRepository.ListRulesByUserAndDay: %w", err)
	}
	defer rows.Close()

	var rules []domain.AvailabilityRule
	for rows.Next() {
		var rule domain.AvailabilityRule
		if err := rows.Scan(
			&rule.ID, &rule.EventTypeID, &rule.UserID,
			&rule.DayOfWeek, &rule.StartTime, &rule.EndTime, &rule.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("AvailabilityRepository.ListRulesByUserAndDay: scan: %w", err)
		}
		rules = append(rules, rule)
	}
	return rules, nil
}

func (r *availabilityRepository) ListOverridesByUserAndDate(ctx context.Context, userID uuid.UUID, eventTypeID uuid.UUID, date string) ([]domain.AvailabilityOverride, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, event_type_id, user_id, date::text, is_available, start_time::text, end_time::text, reason, created_at
		FROM availability_overrides
		WHERE user_id = $1 AND event_type_id = $2 AND date = $3::date`

	rows, err := conn.Query(ctx, query, userID, eventTypeID, date)
	if err != nil {
		return nil, fmt.Errorf("AvailabilityRepository.ListOverridesByUserAndDate: %w", err)
	}
	defer rows.Close()

	var overrides []domain.AvailabilityOverride
	for rows.Next() {
		var o domain.AvailabilityOverride
		if err := rows.Scan(
			&o.ID, &o.EventTypeID, &o.UserID, &o.Date, &o.IsAvailable,
			&o.StartTime, &o.EndTime, &o.Reason, &o.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("AvailabilityRepository.ListOverridesByUserAndDate: scan: %w", err)
		}
		overrides = append(overrides, o)
	}
	return overrides, nil
}
