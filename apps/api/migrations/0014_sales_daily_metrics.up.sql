-- 0014_sales_daily_metrics.up.sql
-- Sales Deals: materialized view de metricas diarias por organizacao,
-- agrega bookings, no-shows, sales e contagem por lead_tag.
-- REFRESH CONCURRENTLY via job no main.go (1h).

CREATE MATERIALIZED VIEW sales_daily_metrics AS
WITH booking_agg AS (
  SELECT
    organization_id,
    date(start_time AT TIME ZONE 'UTC') AS metric_date,
    COUNT(*)                                                AS bookings,
    COUNT(*) FILTER (WHERE kanban_status = 'no_show')       AS no_shows,
    COUNT(*) FILTER (WHERE kanban_status = 'rescheduled')   AS reschedules,
    COUNT(*) FILTER (WHERE kanban_status = 'completed')     AS completed,
    COUNT(*) FILTER (WHERE lead_tag = 'diamond')            AS tag_diamond,
    COUNT(*) FILTER (WHERE lead_tag = 'gold')               AS tag_gold,
    COUNT(*) FILTER (WHERE lead_tag = 'silver')             AS tag_silver,
    COUNT(*) FILTER (WHERE lead_tag = 'bronze')             AS tag_bronze,
    COUNT(*) FILTER (WHERE lead_tag = 'disqualified')       AS tag_disqualified
  FROM bookings
  GROUP BY organization_id, date(start_time AT TIME ZONE 'UTC')
),
sales_agg AS (
  SELECT
    organization_id,
    date(closed_at AT TIME ZONE 'UTC') AS metric_date,
    COUNT(*)                AS sales_count,
    COALESCE(SUM(amount), 0) AS revenue
  FROM sales
  GROUP BY organization_id, date(closed_at AT TIME ZONE 'UTC')
)
SELECT
  COALESCE(b.organization_id, s.organization_id) AS organization_id,
  COALESCE(b.metric_date, s.metric_date)         AS metric_date,
  COALESCE(b.bookings, 0)         AS bookings,
  COALESCE(b.no_shows, 0)         AS no_shows,
  COALESCE(b.reschedules, 0)      AS reschedules,
  COALESCE(b.completed, 0)        AS completed,
  COALESCE(b.tag_diamond, 0)      AS tag_diamond,
  COALESCE(b.tag_gold, 0)         AS tag_gold,
  COALESCE(b.tag_silver, 0)       AS tag_silver,
  COALESCE(b.tag_bronze, 0)       AS tag_bronze,
  COALESCE(b.tag_disqualified, 0) AS tag_disqualified,
  COALESCE(s.sales_count, 0)      AS sales_count,
  COALESCE(s.revenue, 0)          AS revenue
FROM booking_agg b
FULL OUTER JOIN sales_agg s
  ON s.organization_id = b.organization_id AND s.metric_date = b.metric_date;

CREATE UNIQUE INDEX idx_sales_daily_metrics_unique
  ON sales_daily_metrics (organization_id, metric_date);
CREATE INDEX idx_sales_daily_metrics_org_date
  ON sales_daily_metrics (organization_id, metric_date DESC);
