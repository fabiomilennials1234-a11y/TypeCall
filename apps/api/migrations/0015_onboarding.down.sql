-- 0015_onboarding.down.sql
DROP INDEX IF EXISTS idx_organizations_onboarded_at;

ALTER TABLE organizations
  DROP COLUMN IF EXISTS template_form_id,
  DROP COLUMN IF EXISTS onboarded_at;
