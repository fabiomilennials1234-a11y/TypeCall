-- 0006_analytics.down.sql

DROP MATERIALIZED VIEW IF EXISTS form_daily_metrics;
DROP TABLE IF EXISTS response_events;
DROP TYPE IF EXISTS event_type;
