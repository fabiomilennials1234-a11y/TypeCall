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

	GetSalesOverview(ctx context.Context, orgID uuid.UUID, from time.Time) (*domain.SalesOverview, error)
	RefreshSalesDailyMetrics(ctx context.Context) error
	GetFormFunnel(ctx context.Context, orgID, formID uuid.UUID, from time.Time) (*domain.ABTestForm, error)
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

// --- Sales Deals analytics --------------------------------------------------

func (r *analyticsRepository) RefreshSalesDailyMetrics(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, `REFRESH MATERIALIZED VIEW CONCURRENTLY sales_daily_metrics`)
	if err != nil {
		return fmt.Errorf("AnalyticsRepository.RefreshSalesDailyMetrics: %w", err)
	}
	return nil
}

func (r *analyticsRepository) GetSalesOverview(ctx context.Context, orgID uuid.UUID, from time.Time) (*domain.SalesOverview, error) {
	conn := db.Conn(ctx, r.pool)
	out := &domain.SalesOverview{ByTag: map[string]int{}}

	// totals + by_tag (1 round-trip)
	row := conn.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE kanban_status = 'no_show'),
			COUNT(*) FILTER (WHERE kanban_status = 'rescheduled'),
			COUNT(*) FILTER (WHERE lead_tag = 'diamond'),
			COUNT(*) FILTER (WHERE lead_tag = 'gold'),
			COUNT(*) FILTER (WHERE lead_tag = 'silver'),
			COUNT(*) FILTER (WHERE lead_tag = 'bronze'),
			COUNT(*) FILTER (WHERE lead_tag = 'disqualified')
		FROM bookings WHERE organization_id = $1 AND start_time >= $2`, orgID, from)
	var noShow, rescheduled, td, tg, tsi, tb, tdq int
	if err := row.Scan(&out.TotalBookings, &noShow, &rescheduled, &td, &tg, &tsi, &tb, &tdq); err != nil {
		return nil, fmt.Errorf("AnalyticsRepository.GetSalesOverview: totals: %w", err)
	}
	if out.TotalBookings > 0 {
		out.NoShowRate = float64(noShow) / float64(out.TotalBookings) * 100
		out.RescheduleRate = float64(rescheduled) / float64(out.TotalBookings) * 100
	}
	out.ByTag = map[string]int{"diamond": td, "gold": tg, "silver": tsi, "bronze": tb, "disqualified": tdq}

	// sales totals
	var revenue float64
	if err := conn.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(amount), 0)::float
		  FROM sales WHERE organization_id = $1 AND closed_at >= $2`, orgID, from).
		Scan(&out.TotalSales, &revenue); err != nil {
		return nil, fmt.Errorf("AnalyticsRepository.GetSalesOverview: sales: %w", err)
	}
	out.Revenue = fmt.Sprintf("%.2f", revenue)
	if out.TotalSales > 0 {
		out.AvgTicket = fmt.Sprintf("%.2f", revenue/float64(out.TotalSales))
	} else {
		out.AvgTicket = "0.00"
	}

	// by_seller
	rows, err := conn.Query(ctx, `
		SELECT s.id, s.name,
			COUNT(b.id) FILTER (WHERE b.start_time >= $2),
			COUNT(sa.id) FILTER (WHERE sa.closed_at >= $2),
			COALESCE(SUM(sa.amount) FILTER (WHERE sa.closed_at >= $2), 0)::float
		  FROM sellers s
		  LEFT JOIN bookings b ON b.seller_id = s.id
		  LEFT JOIN sales sa ON sa.seller_id = s.id
		 WHERE s.organization_id = $1
		 GROUP BY s.id, s.name
		 ORDER BY 5 DESC`, orgID, from)
	if err != nil {
		return nil, fmt.Errorf("AnalyticsRepository.GetSalesOverview: by_seller: %w", err)
	}
	defer rows.Close()
	out.BySeller = make([]domain.SalesBySellerRow, 0)
	for rows.Next() {
		var row domain.SalesBySellerRow
		var rev float64
		if err := rows.Scan(&row.SellerID, &row.Name, &row.Bookings, &row.Sales, &rev); err != nil {
			return nil, fmt.Errorf("AnalyticsRepository.GetSalesOverview: scan: %w", err)
		}
		row.Revenue = fmt.Sprintf("%.2f", rev)
		if row.Bookings > 0 {
			row.ConversionRate = float64(row.Sales) / float64(row.Bookings) * 100
		}
		out.BySeller = append(out.BySeller, row)
	}

	// funnel_dropoff: aproveita response_events agregados por step
	dropRows, err := conn.Query(ctx, `
		SELECT step_id::text,
			COUNT(*) FILTER (WHERE event_type = 'question_seen'),
			COUNT(*) FILTER (WHERE event_type = 'question_answered')
		  FROM response_events
		 WHERE organization_id = $1 AND created_at >= $2 AND step_id IS NOT NULL
		 GROUP BY step_id
		 ORDER BY 2 DESC
		 LIMIT 50`, orgID, from)
	if err != nil {
		return out, nil // soft-fail
	}
	defer dropRows.Close()
	out.FunnelDropoff = make([]domain.FunnelDropoffRow, 0)
	idx := 0
	for dropRows.Next() {
		var stepID string
		var seen, answered int
		if err := dropRows.Scan(&stepID, &seen, &answered); err != nil {
			continue
		}
		out.FunnelDropoff = append(out.FunnelDropoff, domain.FunnelDropoffRow{
			StepIndex: idx,
			StepTitle: stepID,
			Entered:   seen,
			Exited:    seen - answered,
		})
		idx++
	}
	return out, nil
}

func (r *analyticsRepository) GetFormFunnel(ctx context.Context, orgID, formID uuid.UUID, from time.Time) (*domain.ABTestForm, error) {
	conn := db.Conn(ctx, r.pool)
	out := &domain.ABTestForm{FormID: formID.String()}

	if err := conn.QueryRow(ctx, `SELECT title FROM forms WHERE id = $1`, formID).Scan(&out.Name); err != nil {
		out.Name = formID.String()
	}

	if err := conn.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE event_type = 'start'),
			COUNT(*) FILTER (WHERE event_type = 'submit')
		  FROM response_events
		 WHERE organization_id = $1 AND form_id = $2 AND created_at >= $3`,
		orgID, formID, from).Scan(&out.Starts, &out.Completions); err != nil {
		return nil, fmt.Errorf("AnalyticsRepository.GetFormFunnel: events: %w", err)
	}

	if err := conn.QueryRow(ctx, `
		SELECT COUNT(*)
		  FROM bookings b
		  JOIN responses r ON r.id = b.response_id
		 WHERE b.organization_id = $1 AND r.form_id = $2 AND b.created_at >= $3`,
		orgID, formID, from).Scan(&out.Bookings); err != nil {
		out.Bookings = 0
	}

	if out.Starts > 0 {
		out.ConversionRate = float64(out.Bookings) / float64(out.Starts) * 100
	}
	return out, nil
}
