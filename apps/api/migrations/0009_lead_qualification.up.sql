-- 0009_lead_qualification.up.sql
-- Sales Deals: tags de qualificacao de lead, regras condicionais por bloco do quiz,
-- e snapshot final de qualificacao por response.

-- ============================================================
-- enum lead_tag
-- ============================================================
CREATE TYPE lead_tag AS ENUM ('diamond', 'gold', 'silver', 'bronze', 'disqualified');

-- ============================================================
-- lead_tags — metadata customizavel por org (label/cor da tag)
-- ============================================================
CREATE TABLE lead_tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tag             lead_tag NOT NULL,
  label           TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT '#6366f1',
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organization_id, tag)
);

CREATE INDEX idx_lead_tags_org ON lead_tags (organization_id);

ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_lead_tags ON lead_tags
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON lead_tags
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- qualification_rules — regras condicionais por bloco do quiz
-- ============================================================
CREATE TABLE qualification_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  block_id        TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  answer_value    TEXT NOT NULL,
  tag             lead_tag NOT NULL,
  priority        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qualification_rules_org ON qualification_rules (organization_id);
CREATE INDEX idx_qualification_rules_form ON qualification_rules (form_id);
CREATE INDEX idx_qualification_rules_form_block ON qualification_rules (form_id, block_id);
CREATE INDEX idx_qualification_rules_priority ON qualification_rules (form_id, priority DESC);

ALTER TABLE qualification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_rules FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_qualification_rules ON qualification_rules
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON qualification_rules
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- lead_scores — snapshot final de qualificacao por response
-- ============================================================
CREATE TABLE lead_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id     UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  final_tag       lead_tag NOT NULL,
  scores          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (response_id)
);

CREATE INDEX idx_lead_scores_org ON lead_scores (organization_id);
CREATE INDEX idx_lead_scores_response ON lead_scores (response_id);
CREATE INDEX idx_lead_scores_final_tag ON lead_scores (organization_id, final_tag);

ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_lead_scores ON lead_scores
  USING (organization_id = current_setting('app.current_org')::uuid);
