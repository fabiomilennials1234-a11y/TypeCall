-- 0008_form_assets.up.sql
-- Per-form uploaded assets (images for theme backgrounds, etc).
-- Files live on disk under data/uploads/{org_id}/{uuid}.{ext}; this row tracks metadata.

CREATE TABLE form_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL,
  url             TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size_bytes      BIGINT NOT NULL,
  width           INTEGER,
  height          INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_assets_form ON form_assets (form_id);
CREATE INDEX idx_form_assets_org ON form_assets (organization_id);

ALTER TABLE form_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_assets FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_form_assets ON form_assets
  USING (organization_id = current_setting('app.current_org')::uuid);
