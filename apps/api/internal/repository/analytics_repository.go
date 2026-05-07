package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/typecall/api/internal/db"
	"github.com/typecall/api/internal/domain"
)

type AnalyticsRepository interface {
	IngestEvents(ctx context.Context, orgID uuid.UUID, events []domain.IngestEventInput) (int, error)
	GetDailyMetrics(ctx context.Context, formID uuid.UUID, from, to time.Time) ([]domain.FormDailyMetric, error)
	GetSummary(ctx context.Context, formID uuid.UUID, from, to time.Time) (*domain.AnalyticsSummary, error)
	GetStepDropoff(ctx context.Context, formID uuid.UUID, from, to time.Time) ([]domain.StepDropoff, error)
	RefreshMaterializedView(ctx context.Context) error
}

type PublicAnalyticsRepository interface {
	IngestEvents(ctx context.Context, orgID uuid.UUID, events []domain.IngestEventInput) (int, error)
}

type analyticsRepository struct {
	pool *pgxpool.Pool
}

func NewAnalyticsRepository(pool *pgxpool.Pool) AnalyticsRepository {
	return &analyticsRepository{pool: pool}
}

func NewPublicAnalyticsRepository(pool *pgxpool.Pool) PublicAnalyticsRepository {
	return &analyticsRepository{pool: pool}
}

func (r *analyticsRepository) IngestEvents(ctx context.Context, orgID uuid.UUID, events []domain.IngestEventInput) (int, error) {
	inserted := 0
	for _, e := range events {
		metadata := e.Metadata
		if len(metadata) == 0 {
			metadata = []byte(`{}`)
		}

		tag, err := r.pool.Exec(ctx,
			`INSERT INTO response_events (event_id, form_id, organization_id, response_id, step_id, event_type, metadata)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 ON CONFLICT (event_id) DO NOTHING`,
			e.EventID, e.FormID, orgID, e.ResponseID, e.StepID, e.EventType, metadata,
		)
		if err != nil {
			return inserted, fmt.Errorf("AnalyticsRepository.IngestEvents: %w", err)
		}
		if tag.RowsAffected() > 0 {
			inserted++
		}
	}
	return inserted, nil
}

func (r *analyticsRepository) GetDailyMetrics(ctx context.Context, formID uuid.UUID, from, to time.Time) ([]domain.FormDailyMetric, error) {
	conn := db.Conn(ctx, r.pool)
	rows, err := conn.Query(ctx,
		`SELECT form_id, date, views, starts, completions, abandons
		 FROM form_daily_metrics
		 WHERE form_id = $1 AND date >= $2 AND date <= $3
		 ORDER BY date`,
		formID, from, to,
	)
	if err != nil {
		return nil, fmt.Errorf("AnalyticsRepository.GetDailyMetrics: %w", err)
	}
	defer rows.Close()

	var metrics []domain.FormDailyMetric
	for rows.Next() {
		var m domain.FormDailyMetric
		if err := rows.Scan(&m.FormID, &m.Date, &m.Views, &m.Starts, &m.Completions, &m.Abandons); err != nil {
			return nil, fmt.Errorf("AnalyticsRepository.GetDailyMetrics: scan: %w", err)
		}
		metrics = append(metrics, m)
	}
	return metrics, nil
}

func (r *analyticsRepository) GetSummary(ctx context.Context, formID uuid.UUID, from, to time.Time) (*domain.AnalyticsSummary, error) {
	conn := db.Conn(ctx, r.pool)
	var s domain.AnalyticsSummary
	err := conn.QueryRow(ctx,
		`SELECT
			COALESCE(SUM(views), 0),
			COALESCE(SUM(starts), 0),
			COALESCE(SUM(completions), 0),
			COALESCE(SUM(abandons), 0)
		 FROM form_daily_metrics
		 WHERE form_id = $1 AND date >= $2 AND date <= $3`,
		formID, from, to,
	).Scan(&s.Views, &s.Starts, &s.Completions, &s.Abandons)
	if err != nil {
		return nil, fmt.Errorf("AnalyticsRepository.GetSummary: %w", err)
	}

	if s.Starts > 0 {
		s.CompletionRate = float64(s.Completions) / float64(s.Starts) * 100
	}
	return &s, nil
}

func (r *analyticsRepository) GetStepDropoff(ctx context.Context, formID uuid.UUID, from, to time.Time) ([]domain.StepDropoff, error) {
	conn := db.Conn(ctx, r.pool)
	rows, err := conn.Query(ctx,
		`SELECT
			step_id,
			COUNT(*) FILTER (WHERE event_type = 'question_seen') AS seen,
			COUNT(*) FILTER (WHERE event_type = 'question_answered') AS answered
		 FROM response_events
		 WHERE form_id = $1 AND created_at >= $2 AND created_at <= $3
		   AND step_id IS NOT NULL
		   AND event_type IN ('question_seen', 'question_answered')
		 GROUP BY step_id
		 ORDER BY seen DESC`,
		formID, from, to,
	)
	if err != nil {
		return nil, fmt.Errorf("AnalyticsRepository.GetStepDropoff: %w", err)
	}
	defer rows.Close()

	var dropoffs []domain.StepDropoff
	for rows.Next() {
		var d domain.StepDropoff
		if err := rows.Scan(&d.StepID, &d.Seen, &d.Answered); err != nil {
			return nil, fmt.Errorf("AnalyticsRepository.GetStepDropoff: scan: %w", err)
		}
		if d.Seen > 0 {
			d.DropoffPc = float64(d.Seen-d.Answered) / float64(d.Seen) * 100
		}
		dropoffs = append(dropoffs, d)
	}
	return dropoffs, nil
}

func (r *analyticsRepository) RefreshMaterializedView(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, `REFRESH MATERIALIZED VIEW CONCURRENTLY form_daily_metrics`)
	if err != nil {
		return fmt.Errorf("AnalyticsRepository.RefreshMaterializedView: %w", err)
	}
	return nil
}
