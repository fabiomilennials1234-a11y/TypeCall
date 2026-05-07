package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/typecall/api/internal/db"
	"github.com/typecall/api/internal/domain"
)

type EventTypeRepository interface {
	Create(ctx context.Context, et *domain.EventType) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.EventType, error)
	List(ctx context.Context, params domain.ListEventTypesParams) (*domain.ListEventTypesResult, error)
	Update(ctx context.Context, et *domain.EventType) error
	Delete(ctx context.Context, id uuid.UUID) error
	SlugExists(ctx context.Context, orgID uuid.UUID, slug string) (bool, error)
}

type eventTypeRepository struct {
	pool *pgxpool.Pool
}

func NewEventTypeRepository(pool *pgxpool.Pool) EventTypeRepository {
	return &eventTypeRepository{pool: pool}
}

func (r *eventTypeRepository) Create(ctx context.Context, et *domain.EventType) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		INSERT INTO event_types (id, organization_id, user_id, title, slug, description,
			duration_minutes, buffer_before_minutes, buffer_after_minutes,
			min_notice_hours, max_advance_days, max_per_day,
			location_type, location_value, color, is_active, settings, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`

	_, err := conn.Exec(ctx, query,
		et.ID, et.OrganizationID, et.UserID, et.Title, et.Slug, et.Description,
		et.DurationMinutes, et.BufferBeforeMinutes, et.BufferAfterMinutes,
		et.MinNoticeHours, et.MaxAdvanceDays, et.MaxPerDay,
		et.LocationType, et.LocationValue, et.Color, et.IsActive, et.Settings,
		et.CreatedAt, et.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("EventTypeRepository.Create: %w", err)
	}
	return nil
}

func (r *eventTypeRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.EventType, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT id, organization_id, user_id, title, slug, description,
			duration_minutes, buffer_before_minutes, buffer_after_minutes,
			min_notice_hours, max_advance_days, max_per_day,
			location_type, location_value, color, is_active, settings, created_at, updated_at
		FROM event_types
		WHERE id = $1`

	et := &domain.EventType{}
	err := conn.QueryRow(ctx, query, id).Scan(
		&et.ID, &et.OrganizationID, &et.UserID, &et.Title, &et.Slug, &et.Description,
		&et.DurationMinutes, &et.BufferBeforeMinutes, &et.BufferAfterMinutes,
		&et.MinNoticeHours, &et.MaxAdvanceDays, &et.MaxPerDay,
		&et.LocationType, &et.LocationValue, &et.Color, &et.IsActive, &et.Settings,
		&et.CreatedAt, &et.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("EventTypeRepository.GetByID: %w", err)
	}
	return et, nil
}

func (r *eventTypeRepository) List(ctx context.Context, params domain.ListEventTypesParams) (*domain.ListEventTypesResult, error) {
	conn := db.Conn(ctx, r.pool)

	conditions := []string{}
	args := []any{}
	argIdx := 1

	if params.Active != nil {
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", argIdx))
		args = append(args, *params.Active)
		argIdx++
	}

	if params.Cursor != nil {
		cursorTime, cursorID, err := decodeCursor(*params.Cursor)
		if err == nil {
			conditions = append(conditions, fmt.Sprintf("(created_at, id) < ($%d, $%d)", argIdx, argIdx+1))
			args = append(args, cursorTime, cursorID)
			argIdx += 2
		}
	}

	limit := params.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
		SELECT id, organization_id, user_id, title, slug, description,
			duration_minutes, buffer_before_minutes, buffer_after_minutes,
			min_notice_hours, max_advance_days, max_per_day,
			location_type, location_value, color, is_active, settings, created_at, updated_at
		FROM event_types
		%s
		ORDER BY created_at DESC, id DESC
		LIMIT $%d`, whereClause, argIdx)
	args = append(args, limit+1)

	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("EventTypeRepository.List: %w", err)
	}
	defer rows.Close()

	items := make([]domain.EventType, 0, limit)
	for rows.Next() {
		var et domain.EventType
		if err := rows.Scan(
			&et.ID, &et.OrganizationID, &et.UserID, &et.Title, &et.Slug, &et.Description,
			&et.DurationMinutes, &et.BufferBeforeMinutes, &et.BufferAfterMinutes,
			&et.MinNoticeHours, &et.MaxAdvanceDays, &et.MaxPerDay,
			&et.LocationType, &et.LocationValue, &et.Color, &et.IsActive, &et.Settings,
			&et.CreatedAt, &et.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("EventTypeRepository.List: scan: %w", err)
		}
		items = append(items, et)
	}

	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}

	var nextCursor *string
	if hasMore && len(items) > 0 {
		last := items[len(items)-1]
		c := encodeCursor(last.CreatedAt, last.ID)
		nextCursor = &c
	}

	return &domain.ListEventTypesResult{
		EventTypes: items,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

func (r *eventTypeRepository) Update(ctx context.Context, et *domain.EventType) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		UPDATE event_types
		SET title = $2, slug = $3, description = $4,
			duration_minutes = $5, buffer_before_minutes = $6, buffer_after_minutes = $7,
			min_notice_hours = $8, max_advance_days = $9, max_per_day = $10,
			location_type = $11, location_value = $12, color = $13, is_active = $14,
			settings = $15, updated_at = now()
		WHERE id = $1`

	tag, err := conn.Exec(ctx, query,
		et.ID, et.Title, et.Slug, et.Description,
		et.DurationMinutes, et.BufferBeforeMinutes, et.BufferAfterMinutes,
		et.MinNoticeHours, et.MaxAdvanceDays, et.MaxPerDay,
		et.LocationType, et.LocationValue, et.Color, et.IsActive, et.Settings,
	)
	if err != nil {
		return fmt.Errorf("EventTypeRepository.Update: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("EventTypeRepository.Update: not found")
	}
	return nil
}

func (r *eventTypeRepository) Delete(ctx context.Context, id uuid.UUID) error {
	conn := db.Conn(ctx, r.pool)
	query := `DELETE FROM event_types WHERE id = $1`

	tag, err := conn.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("EventTypeRepository.Delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("EventTypeRepository.Delete: not found")
	}
	return nil
}

func (r *eventTypeRepository) SlugExists(ctx context.Context, orgID uuid.UUID, slug string) (bool, error) {
	conn := db.Conn(ctx, r.pool)
	query := `SELECT EXISTS(SELECT 1 FROM event_types WHERE organization_id = $1 AND slug = $2)`

	var exists bool
	err := conn.QueryRow(ctx, query, orgID, slug).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("EventTypeRepository.SlugExists: %w", err)
	}
	return exists, nil
}
