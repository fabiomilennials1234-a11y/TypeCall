-- 0006_analytics.up.sql
-- Response events for analytics funnel tracking + materialized views

CREATE TYPE event_type AS ENUM (
    'view', 'start', 'question_seen', 'question_answered',
    'booking_slot_selected', 'submit', 'abandon', 'share'
);

CREATE TABLE response_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL,
    form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    response_id     UUID REFERENCES responses(id) ON DELETE SET NULL,
    step_id         TEXT,
    event_type      event_type NOT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_response_events_event_id ON response_events (event_id);
CREATE INDEX idx_response_events_form_created ON response_events (form_id, created_at DESC);
CREATE INDEX idx_response_events_form_type ON response_events (form_id, event_type);
CREATE INDEX idx_response_events_org ON response_events (organization_id, created_at DESC);

ALTER TABLE response_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_response_events ON response_events
    USING (organization_id = current_setting('app.current_org')::uuid);

-- Materialized view: daily metrics per form
CREATE MATERIALIZED VIEW form_daily_metrics AS
SELECT
    form_id,
    organization_id,
    date_trunc('day', created_at)::date AS date,
    COUNT(*) FILTER (WHERE event_type = 'view') AS views,
    COUNT(*) FILTER (WHERE event_type = 'start') AS starts,
    COUNT(*) FILTER (WHERE event_type = 'submit') AS completions,
    COUNT(*) FILTER (WHERE event_type = 'abandon') AS abandons
FROM response_events
GROUP BY form_id, organization_id, date_trunc('day', created_at)::date;

CREATE UNIQUE INDEX idx_form_daily_metrics_pk ON form_daily_metrics (form_id, date);
CREATE INDEX idx_form_daily_metrics_org ON form_daily_metrics (organization_id, date);
