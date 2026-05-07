-- 0002_forms.up.sql
-- Forms + form_versions for the form builder (Fase 2)

CREATE TABLE forms (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    slug             TEXT NOT NULL,
    description      TEXT,
    status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'closed')),
    version          INT NOT NULL DEFAULT 0,
    draft_definition JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
    theme            JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings         JSONB NOT NULL DEFAULT '{}'::jsonb,
    published_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_forms_org_slug ON forms (organization_id, slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_forms_organization_id ON forms (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_forms_status ON forms (organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_forms_created_at ON forms (organization_id, created_at DESC) WHERE deleted_at IS NULL;

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON forms
    USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Immutable published snapshots
CREATE TABLE form_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    version_number  INT NOT NULL,
    flow_definition JSONB NOT NULL,
    published_by    UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (form_id, version_number)
);

CREATE INDEX idx_form_versions_form_id ON form_versions (form_id);
CREATE INDEX idx_form_versions_organization_id ON form_versions (organization_id);
CREATE INDEX idx_form_versions_flow_definition ON form_versions USING GIN (flow_definition);

ALTER TABLE form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_versions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON form_versions
    USING (organization_id = current_setting('app.current_org')::uuid);
