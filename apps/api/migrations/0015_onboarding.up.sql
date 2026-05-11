-- 0015_onboarding.up.sql
-- Adiciona flags de onboarding no organizations: timestamp de conclusao do wizard
-- e referencia opcional pro form criado a partir do template default.

ALTER TABLE organizations
  ADD COLUMN onboarded_at     TIMESTAMPTZ,
  ADD COLUMN template_form_id UUID REFERENCES forms(id) ON DELETE SET NULL;

CREATE INDEX idx_organizations_onboarded_at ON organizations (onboarded_at)
  WHERE onboarded_at IS NULL;
