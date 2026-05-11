// Package sellers implements seller profiles, weekly availability and goals
// for the Sales Deals product.
package sellers

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

var (
	ErrSellerNotFound = errors.New("seller not found")
	ErrGoalNotFound   = errors.New("seller goal not found")
)

type Repository interface {
	Create(ctx context.Context, s *domain.Seller) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Seller, error)
	GetByUser(ctx context.Context, userID, orgID uuid.UUID) (*domain.Seller, error)
	List(ctx context.Context, orgID uuid.UUID, activeOnly bool) ([]domain.Seller, error)
	ListByTag(ctx context.Context, orgID uuid.UUID, tag string) ([]domain.Seller, error)
	Update(ctx context.Context, s *domain.Seller) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetRotationLastSeller(ctx context.Context, orgID uuid.UUID, tag string) (*uuid.UUID, error)
	UpsertRotationLastSeller(ctx context.Context, orgID uuid.UUID, tag string, sellerID uuid.UUID) error

	ListAvailability(ctx context.Context, sellerID uuid.UUID) ([]domain.SellerAvailability, error)
	ReplaceAvailability(ctx context.Context, sellerID, orgID uuid.UUID, slots []domain.SellerAvailability) error

	CreateGoal(ctx context.Context, g *domain.SellerGoal) error
	UpdateGoal(ctx context.Context, g *domain.SellerGoal) error
	DeleteGoal(ctx context.Context, id uuid.UUID) error
	ListGoals(ctx context.Context, sellerID uuid.UUID) ([]domain.SellerGoal, error)
}

type pgRepo struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgRepo{pool: pool}
}

// --- sellers --------------------------------------------------------------

func (r *pgRepo) Create(ctx context.Context, s *domain.Seller) error {
	conn := db.Conn(ctx, r.pool)
	tags := s.AllowedTags
	if tags == nil {
		tags = []string{"diamond", "gold", "silver", "bronze"}
	}
	query := `
		INSERT INTO sellers (id, user_id, organization_id, name, meeting_duration_minutes,
			buffer_after_minutes, location_type, allowed_tags, active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
		RETURNING created_at, updated_at, allowed_tags`

	err := conn.QueryRow(ctx, query,
		s.ID, s.UserID, s.OrganizationID, s.Name,
		s.MeetingDurationMinutes, s.BufferAfterMinutes, s.LocationType, tags, s.Active,
	).Scan(&s.CreatedAt, &s.UpdatedAt, &s.AllowedTags)
	if err != nil {
		return fmt.Errorf("sellers.Repository.Create: %w", err)
	}
	return nil
}

func (r *pgRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Seller, error) {
	conn := db.Conn(ctx, r.pool)
	s := &domain.Seller{}
	err := conn.QueryRow(ctx, `
		SELECT id, user_id, organization_id, name, meeting_duration_minutes, buffer_after_minutes,
			location_type, allowed_tags, active, created_at, updated_at
		  FROM sellers WHERE id = $1`, id).Scan(
		&s.ID, &s.UserID, &s.OrganizationID, &s.Name,
		&s.MeetingDurationMinutes, &s.BufferAfterMinutes, &s.LocationType, &s.AllowedTags, &s.Active,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSellerNotFound
		}
		return nil, fmt.Errorf("sellers.Repository.GetByID: %w", err)
	}
	return s, nil
}

func (r *pgRepo) GetByUser(ctx context.Context, userID, orgID uuid.UUID) (*domain.Seller, error) {
	conn := db.Conn(ctx, r.pool)
	s := &domain.Seller{}
	err := conn.QueryRow(ctx, `
		SELECT id, user_id, organization_id, name, meeting_duration_minutes, buffer_after_minutes,
			location_type, allowed_tags, active, created_at, updated_at
		  FROM sellers WHERE user_id = $1 AND organization_id = $2`, userID, orgID).Scan(
		&s.ID, &s.UserID, &s.OrganizationID, &s.Name,
		&s.MeetingDurationMinutes, &s.BufferAfterMinutes, &s.LocationType, &s.AllowedTags, &s.Active,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSellerNotFound
		}
		return nil, fmt.Errorf("sellers.Repository.GetByUser: %w", err)
	}
	return s, nil
}

func (r *pgRepo) List(ctx context.Context, orgID uuid.UUID, activeOnly bool) ([]domain.Seller, error) {
	conn := db.Conn(ctx, r.pool)
	q := `
		SELECT id, user_id, organization_id, name, meeting_duration_minutes, buffer_after_minutes,
			location_type, allowed_tags, active, created_at, updated_at
		  FROM sellers WHERE organization_id = $1`
	if activeOnly {
		q += ` AND active = true`
	}
	q += ` ORDER BY name`

	rows, err := conn.Query(ctx, q, orgID)
	if err != nil {
		return nil, fmt.Errorf("sellers.Repository.List: %w", err)
	}
	defer rows.Close()

	out := make([]domain.Seller, 0)
	for rows.Next() {
		var s domain.Seller
		if err := rows.Scan(
			&s.ID, &s.UserID, &s.OrganizationID, &s.Name,
			&s.MeetingDurationMinutes, &s.BufferAfterMinutes, &s.LocationType, &s.AllowedTags, &s.Active,
			&s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("sellers.Repository.List: scan: %w", err)
		}
		out = append(out, s)
	}
	return out, nil
}

// ListByTag retorna sellers ativos da org que cobrem a tag dada.
func (r *pgRepo) ListByTag(ctx context.Context, orgID uuid.UUID, tag string) ([]domain.Seller, error) {
	conn := db.Conn(ctx, r.pool)
	rows, err := conn.Query(ctx, `
		SELECT id, user_id, organization_id, name, meeting_duration_minutes, buffer_after_minutes,
			location_type, allowed_tags, active, created_at, updated_at
		  FROM sellers
		 WHERE organization_id = $1 AND active = true AND allowed_tags @> ARRAY[$2]::TEXT[]
		 ORDER BY id`, orgID, tag)
	if err != nil {
		return nil, fmt.Errorf("sellers.Repository.ListByTag: %w", err)
	}
	defer rows.Close()

	out := make([]domain.Seller, 0)
	for rows.Next() {
		var s domain.Seller
		if err := rows.Scan(
			&s.ID, &s.UserID, &s.OrganizationID, &s.Name,
			&s.MeetingDurationMinutes, &s.BufferAfterMinutes, &s.LocationType, &s.AllowedTags, &s.Active,
			&s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("sellers.Repository.ListByTag: scan: %w", err)
		}
		out = append(out, s)
	}
	return out, nil
}

func (r *pgRepo) Update(ctx context.Context, s *domain.Seller) error {
	conn := db.Conn(ctx, r.pool)
	tags := s.AllowedTags
	if tags == nil {
		tags = []string{}
	}
	tag, err := conn.Exec(ctx, `
		UPDATE sellers
		   SET name = $2, meeting_duration_minutes = $3, buffer_after_minutes = $4,
		       location_type = $5, allowed_tags = $6, active = $7, updated_at = now()
		 WHERE id = $1`,
		s.ID, s.Name, s.MeetingDurationMinutes, s.BufferAfterMinutes, s.LocationType, tags, s.Active,
	)
	if err != nil {
		return fmt.Errorf("sellers.Repository.Update: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrSellerNotFound
	}
	return nil
}

// GetRotationLastSeller retorna ultimo seller atribuido pra (org, tag).
// nil se nunca atribuido.
func (r *pgRepo) GetRotationLastSeller(ctx context.Context, orgID uuid.UUID, tag string) (*uuid.UUID, error) {
	conn := db.Conn(ctx, r.pool)
	var id uuid.UUID
	err := conn.QueryRow(ctx, `
		SELECT last_seller_id FROM seller_rotation_state
		 WHERE organization_id = $1 AND tag = $2`, orgID, tag).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("sellers.Repository.GetRotationLastSeller: %w", err)
	}
	return &id, nil
}

func (r *pgRepo) UpsertRotationLastSeller(ctx context.Context, orgID uuid.UUID, tag string, sellerID uuid.UUID) error {
	conn := db.Conn(ctx, r.pool)
	_, err := conn.Exec(ctx, `
		INSERT INTO seller_rotation_state (organization_id, tag, last_seller_id, updated_at)
		VALUES ($1, $2, $3, now())
		ON CONFLICT (organization_id, tag) DO UPDATE SET
			last_seller_id = EXCLUDED.last_seller_id,
			updated_at     = now()`,
		orgID, tag, sellerID,
	)
	if err != nil {
		return fmt.Errorf("sellers.Repository.UpsertRotationLastSeller: %w", err)
	}
	return nil
}

func (r *pgRepo) Delete(ctx context.Context, id uuid.UUID) error {
	conn := db.Conn(ctx, r.pool)
	tag, err := conn.Exec(ctx, `DELETE FROM sellers WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("sellers.Repository.Delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrSellerNotFound
	}
	return nil
}

// --- availability ---------------------------------------------------------

func (r *pgRepo) ListAvailability(ctx context.Context, sellerID uuid.UUID) ([]domain.SellerAvailability, error) {
	conn := db.Conn(ctx, r.pool)
	rows, err := conn.Query(ctx, `
		SELECT id, seller_id, organization_id, day_of_week,
			start_time::text, end_time::text, created_at
		  FROM seller_availability
		 WHERE seller_id = $1
		 ORDER BY day_of_week, start_time`, sellerID)
	if err != nil {
		return nil, fmt.Errorf("sellers.Repository.ListAvailability: %w", err)
	}
	defer rows.Close()

	out := make([]domain.SellerAvailability, 0)
	for rows.Next() {
		var a domain.SellerAvailability
		if err := rows.Scan(
			&a.ID, &a.SellerID, &a.OrganizationID, &a.DayOfWeek,
			&a.StartTime, &a.EndTime, &a.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("sellers.Repository.ListAvailability: scan: %w", err)
		}
		out = append(out, a)
	}
	return out, nil
}

func (r *pgRepo) ReplaceAvailability(ctx context.Context, sellerID, orgID uuid.UUID, slots []domain.SellerAvailability) error {
	conn := db.Conn(ctx, r.pool)
	if _, err := conn.Exec(ctx, `DELETE FROM seller_availability WHERE seller_id = $1`, sellerID); err != nil {
		return fmt.Errorf("sellers.Repository.ReplaceAvailability: delete: %w", err)
	}
	for _, slot := range slots {
		_, err := conn.Exec(ctx, `
			INSERT INTO seller_availability (id, seller_id, organization_id, day_of_week, start_time, end_time)
			VALUES ($1, $2, $3, $4, $5::time, $6::time)`,
			uuid.New(), sellerID, orgID, slot.DayOfWeek, slot.StartTime, slot.EndTime,
		)
		if err != nil {
			return fmt.Errorf("sellers.Repository.ReplaceAvailability: insert: %w", err)
		}
	}
	return nil
}

// --- goals ----------------------------------------------------------------

func (r *pgRepo) CreateGoal(ctx context.Context, g *domain.SellerGoal) error {
	conn := db.Conn(ctx, r.pool)
	query := `
		INSERT INTO seller_goals (id, seller_id, organization_id, period_start, period_end,
			goal_meetings, goal_sales, goal_revenue, created_at, updated_at)
		VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, now(), now())
		RETURNING created_at, updated_at`

	err := conn.QueryRow(ctx, query,
		g.ID, g.SellerID, g.OrganizationID, g.PeriodStart, g.PeriodEnd,
		g.GoalMeetings, g.GoalSales, g.GoalRevenue,
	).Scan(&g.CreatedAt, &g.UpdatedAt)
	if err != nil {
		return fmt.Errorf("sellers.Repository.CreateGoal: %w", err)
	}
	return nil
}

func (r *pgRepo) UpdateGoal(ctx context.Context, g *domain.SellerGoal) error {
	conn := db.Conn(ctx, r.pool)
	tag, err := conn.Exec(ctx, `
		UPDATE seller_goals
		   SET goal_meetings = $2, goal_sales = $3, goal_revenue = $4, updated_at = now()
		 WHERE id = $1`,
		g.ID, g.GoalMeetings, g.GoalSales, g.GoalRevenue,
	)
	if err != nil {
		return fmt.Errorf("sellers.Repository.UpdateGoal: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrGoalNotFound
	}
	return nil
}

func (r *pgRepo) DeleteGoal(ctx context.Context, id uuid.UUID) error {
	conn := db.Conn(ctx, r.pool)
	tag, err := conn.Exec(ctx, `DELETE FROM seller_goals WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("sellers.Repository.DeleteGoal: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrGoalNotFound
	}
	return nil
}

func (r *pgRepo) ListGoals(ctx context.Context, sellerID uuid.UUID) ([]domain.SellerGoal, error) {
	conn := db.Conn(ctx, r.pool)
	rows, err := conn.Query(ctx, `
		SELECT id, seller_id, organization_id, period_start::text, period_end::text,
			goal_meetings, goal_sales, goal_revenue::text, created_at, updated_at
		  FROM seller_goals
		 WHERE seller_id = $1
		 ORDER BY period_start DESC`, sellerID)
	if err != nil {
		return nil, fmt.Errorf("sellers.Repository.ListGoals: %w", err)
	}
	defer rows.Close()

	out := make([]domain.SellerGoal, 0)
	for rows.Next() {
		var g domain.SellerGoal
		if err := rows.Scan(
			&g.ID, &g.SellerID, &g.OrganizationID, &g.PeriodStart, &g.PeriodEnd,
			&g.GoalMeetings, &g.GoalSales, &g.GoalRevenue, &g.CreatedAt, &g.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("sellers.Repository.ListGoals: scan: %w", err)
		}
		out = append(out, g)
	}
	return out, nil
}
