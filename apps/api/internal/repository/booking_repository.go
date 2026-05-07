package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/typecall/api/internal/db"
	"github.com/typecall/api/internal/domain"
)

type BookingRepository interface {
	Create(ctx context.Context, b *domain.Booking) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Booking, error)
	List(ctx context.Context, params domain.ListBookingsParams) (*domain.ListBookingsResult, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.BookingStatus) error
	SetGoogleEvent(ctx context.Context, id uuid.UUID, googleEventID, meetingURL string) error
	Cancel(ctx context.Context, id uuid.UUID, reason *string) error
	GetByCancelToken(ctx context.Context, token string) (*domain.Booking, error)
	GetByRescheduleToken(ctx context.Context, token string) (*domain.Booking, error)
	CheckConflict(ctx context.Context, hostUserID uuid.UUID, start time.Time, end time.Time) (bool, error)
	CountByHostAndDate(ctx context.Context, hostUserID uuid.UUID, date time.Time) (int, error)
	ListByHostAndRange(ctx context.Context, hostUserID uuid.UUID, start time.Time, end time.Time) ([]domain.Booking, error)
}

type PublicEventTypeRepository interface {
	GetActiveByID(ctx context.Context, id uuid.UUID) (*domain.EventType, error)
}

type bookingRepository struct {
	pool *pgxpool.Pool
}

func NewBookingRepository(pool *pgxpool.Pool) BookingRepository {
	return &bookingRepository{pool: pool}
}

func (r *bookingRepository) Create(ctx context.Context, b *domain.Booking) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		INSERT INTO bookings (id, organization_id, event_type_id, host_user_id, response_id,
			attendee_name, attendee_email, attendee_phone, start_time, end_time, timezone,
			status, location_type, location_value, google_event_id, meeting_url,
			cancel_token, reschedule_token, notes, metadata,
			rescheduled_from_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`

	_, err := conn.Exec(ctx, query,
		b.ID, b.OrganizationID, b.EventTypeID, b.HostUserID, b.ResponseID,
		b.AttendeeName, b.AttendeeEmail, b.AttendeePhone, b.StartTime, b.EndTime, b.Timezone,
		b.Status, b.LocationType, b.LocationValue, b.GoogleEventID, b.MeetingURL,
		b.CancelToken, b.RescheduleToken, b.Notes, b.Metadata,
		b.RescheduledFromID, b.CreatedAt, b.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("BookingRepository.Create: %w", err)
	}
	return nil
}

func (r *bookingRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Booking, error) {
	conn := db.Conn(ctx, r.pool)
	return r.scanBooking(conn.QueryRow(ctx, bookingSelectQuery+" WHERE b.id = $1", id))
}

func (r *bookingRepository) List(ctx context.Context, params domain.ListBookingsParams) (*domain.ListBookingsResult, error) {
	conn := db.Conn(ctx, r.pool)

	conditions := []string{}
	args := []any{}
	argIdx := 1

	if params.Status != nil {
		conditions = append(conditions, fmt.Sprintf("b.status = $%d", argIdx))
		args = append(args, string(*params.Status))
		argIdx++
	}
	if params.EventType != nil {
		conditions = append(conditions, fmt.Sprintf("b.event_type_id = $%d", argIdx))
		args = append(args, *params.EventType)
		argIdx++
	}
	if params.HostUserID != nil {
		conditions = append(conditions, fmt.Sprintf("b.host_user_id = $%d", argIdx))
		args = append(args, *params.HostUserID)
		argIdx++
	}
	if params.From != nil {
		conditions = append(conditions, fmt.Sprintf("b.start_time >= $%d", argIdx))
		args = append(args, *params.From)
		argIdx++
	}
	if params.To != nil {
		conditions = append(conditions, fmt.Sprintf("b.start_time <= $%d", argIdx))
		args = append(args, *params.To)
		argIdx++
	}
	if params.Cursor != nil {
		cursorTime, cursorID, err := decodeCursor(*params.Cursor)
		if err == nil {
			conditions = append(conditions, fmt.Sprintf("(b.created_at, b.id) < ($%d, $%d)", argIdx, argIdx+1))
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

	query := fmt.Sprintf(`%s %s ORDER BY b.created_at DESC, b.id DESC LIMIT $%d`,
		bookingSelectQuery, whereClause, argIdx)
	args = append(args, limit+1)

	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("BookingRepository.List: %w", err)
	}
	defer rows.Close()

	items := make([]domain.Booking, 0, limit)
	for rows.Next() {
		b, err := r.scanBookingRow(rows)
		if err != nil {
			return nil, fmt.Errorf("BookingRepository.List: scan: %w", err)
		}
		items = append(items, *b)
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

	return &domain.ListBookingsResult{
		Bookings:   items,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

func (r *bookingRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.BookingStatus) error {
	conn := db.Conn(ctx, r.pool)
	tag, err := conn.Exec(ctx,
		`UPDATE bookings SET status = $2, updated_at = now() WHERE id = $1`,
		id, status,
	)
	if err != nil {
		return fmt.Errorf("BookingRepository.UpdateStatus: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("BookingRepository.UpdateStatus: not found")
	}
	return nil
}

func (r *bookingRepository) SetGoogleEvent(ctx context.Context, id uuid.UUID, googleEventID, meetingURL string) error {
	conn := db.Conn(ctx, r.pool)
	tag, err := conn.Exec(ctx,
		`UPDATE bookings SET google_event_id = $2, meeting_url = $3, updated_at = now() WHERE id = $1`,
		id, googleEventID, meetingURL,
	)
	if err != nil {
		return fmt.Errorf("BookingRepository.SetGoogleEvent: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("BookingRepository.SetGoogleEvent: not found")
	}
	return nil
}

func (r *bookingRepository) Cancel(ctx context.Context, id uuid.UUID, reason *string) error {
	conn := db.Conn(ctx, r.pool)
	tag, err := conn.Exec(ctx,
		`UPDATE bookings SET status = 'cancelled', cancelled_at = now(), cancel_reason = $2, updated_at = now() WHERE id = $1`,
		id, reason,
	)
	if err != nil {
		return fmt.Errorf("BookingRepository.Cancel: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("BookingRepository.Cancel: not found")
	}
	return nil
}

func (r *bookingRepository) GetByCancelToken(ctx context.Context, token string) (*domain.Booking, error) {
	conn := db.Conn(ctx, r.pool)
	return r.scanBooking(conn.QueryRow(ctx,
		bookingSelectQuery+" WHERE b.cancel_token = $1 AND b.status IN ('pending', 'confirmed')", token))
}

func (r *bookingRepository) GetByRescheduleToken(ctx context.Context, token string) (*domain.Booking, error) {
	conn := db.Conn(ctx, r.pool)
	return r.scanBooking(conn.QueryRow(ctx,
		bookingSelectQuery+" WHERE b.reschedule_token = $1 AND b.status IN ('pending', 'confirmed')", token))
}

func (r *bookingRepository) CheckConflict(ctx context.Context, hostUserID uuid.UUID, start time.Time, end time.Time) (bool, error) {
	conn := db.Conn(ctx, r.pool)
	query := `
		SELECT EXISTS(
			SELECT 1 FROM bookings
			WHERE host_user_id = $1
			  AND status IN ('pending', 'confirmed')
			  AND start_time < $3
			  AND end_time > $2
		)`

	var exists bool
	err := conn.QueryRow(ctx, query, hostUserID, start, end).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("BookingRepository.CheckConflict: %w", err)
	}
	return exists, nil
}

func (r *bookingRepository) CountByHostAndDate(ctx context.Context, hostUserID uuid.UUID, date time.Time) (int, error) {
	conn := db.Conn(ctx, r.pool)
	dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
	dayEnd := dayStart.Add(24 * time.Hour)

	var count int
	err := conn.QueryRow(ctx,
		`SELECT COUNT(*) FROM bookings WHERE host_user_id = $1 AND status IN ('pending', 'confirmed') AND start_time >= $2 AND start_time < $3`,
		hostUserID, dayStart, dayEnd,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("BookingRepository.CountByHostAndDate: %w", err)
	}
	return count, nil
}

func (r *bookingRepository) ListByHostAndRange(ctx context.Context, hostUserID uuid.UUID, start time.Time, end time.Time) ([]domain.Booking, error) {
	conn := db.Conn(ctx, r.pool)
	query := bookingSelectQuery + ` WHERE b.host_user_id = $1 AND b.status IN ('pending', 'confirmed') AND b.start_time < $3 AND b.end_time > $2 ORDER BY b.start_time`

	rows, err := conn.Query(ctx, query, hostUserID, start, end)
	if err != nil {
		return nil, fmt.Errorf("BookingRepository.ListByHostAndRange: %w", err)
	}
	defer rows.Close()

	var bookings []domain.Booking
	for rows.Next() {
		b, err := r.scanBookingRow(rows)
		if err != nil {
			return nil, fmt.Errorf("BookingRepository.ListByHostAndRange: scan: %w", err)
		}
		bookings = append(bookings, *b)
	}
	return bookings, nil
}

const bookingSelectQuery = `
	SELECT b.id, b.organization_id, b.event_type_id, b.host_user_id, b.response_id,
		b.attendee_name, b.attendee_email, b.attendee_phone,
		b.start_time, b.end_time, b.timezone, b.status,
		b.location_type, b.location_value, b.google_event_id, b.meeting_url,
		b.cancel_token, b.reschedule_token, b.notes, b.metadata,
		b.cancelled_at, b.cancel_reason, b.rescheduled_from_id,
		b.created_at, b.updated_at
	FROM bookings b`

func (r *bookingRepository) scanBooking(row pgx.Row) (*domain.Booking, error) {
	b := &domain.Booking{}
	err := row.Scan(
		&b.ID, &b.OrganizationID, &b.EventTypeID, &b.HostUserID, &b.ResponseID,
		&b.AttendeeName, &b.AttendeeEmail, &b.AttendeePhone,
		&b.StartTime, &b.EndTime, &b.Timezone, &b.Status,
		&b.LocationType, &b.LocationValue, &b.GoogleEventID, &b.MeetingURL,
		&b.CancelToken, &b.RescheduleToken, &b.Notes, &b.Metadata,
		&b.CancelledAt, &b.CancelReason, &b.RescheduledFromID,
		&b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return b, nil
}

func (r *bookingRepository) scanBookingRow(rows pgx.Rows) (*domain.Booking, error) {
	b := &domain.Booking{}
	err := rows.Scan(
		&b.ID, &b.OrganizationID, &b.EventTypeID, &b.HostUserID, &b.ResponseID,
		&b.AttendeeName, &b.AttendeeEmail, &b.AttendeePhone,
		&b.StartTime, &b.EndTime, &b.Timezone, &b.Status,
		&b.LocationType, &b.LocationValue, &b.GoogleEventID, &b.MeetingURL,
		&b.CancelToken, &b.RescheduleToken, &b.Notes, &b.Metadata,
		&b.CancelledAt, &b.CancelReason, &b.RescheduledFromID,
		&b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return b, nil
}

// PublicEventTypeRepository — queries without RLS (direct pool)

type publicEventTypeRepository struct {
	pool *pgxpool.Pool
}

func NewPublicEventTypeRepository(pool *pgxpool.Pool) PublicEventTypeRepository {
	return &publicEventTypeRepository{pool: pool}
}

func (r *publicEventTypeRepository) GetActiveByID(ctx context.Context, id uuid.UUID) (*domain.EventType, error) {
	query := `
		SELECT id, organization_id, user_id, title, slug, description,
			duration_minutes, buffer_before_minutes, buffer_after_minutes,
			min_notice_hours, max_advance_days, max_per_day,
			location_type, location_value, color, is_active, settings, created_at, updated_at
		FROM event_types
		WHERE id = $1 AND is_active = true`

	et := &domain.EventType{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
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
		return nil, fmt.Errorf("PublicEventTypeRepository.GetActiveByID: %w", err)
	}
	return et, nil
}
