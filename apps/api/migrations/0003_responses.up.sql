-- 0003_responses.up.sql
-- Response storage for form submissions (Sprint 5)

CREATE TABLE responses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    form_version_id UUID NOT NULL REFERENCES form_versions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    respondent_email TEXT,
    respondent_name  TEXT,
    status          TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_responses_form_id ON responses (form_id);
CREATE INDEX idx_responses_org ON responses (organization_id);
CREATE INDEX idx_responses_form_status ON responses (form_id, status);
CREATE INDEX idx_responses_created_at ON responses (form_id, created_at DESC);

ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON responses
    USING (organization_id = current_setting('app.current_org')::uuid);

-- Individual answers within a response
CREATE TABLE response_answers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    node_id     TEXT NOT NULL,
    value       JSONB NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_response_answers_response_id ON response_answers (response_id);
CREATE UNIQUE INDEX idx_response_answers_node ON response_answers (response_id, node_id);
