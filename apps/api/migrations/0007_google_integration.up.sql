-- 0007_google_integration.up.sql
-- Stores OAuth credentials (Google Calendar etc.) per user with AES-256-GCM at rest.
-- Tokens are encrypted in the application layer; this table never sees plaintext.

CREATE TABLE integration_credentials (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider                 integration_provider NOT NULL,
  google_account_email     TEXT NOT NULL,
  access_token_encrypted   BYTEA NOT NULL,
  access_token_nonce       BYTEA NOT NULL,
  refresh_token_encrypted  BYTEA NOT NULL,
  refresh_token_nonce      BYTEA NOT NULL,
  scope                    TEXT NOT NULL,
  access_token_expires_at  TIMESTAMPTZ NOT NULL,
  watch_channel_id         TEXT,
  watch_resource_id        TEXT,
  watch_expiry             TIMESTAMPTZ,
  last_synced_at           TIMESTAMPTZ,
  sync_error               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, provider)
);

CREATE INDEX idx_integration_creds_user ON integration_credentials (user_id);
CREATE INDEX idx_integration_creds_org ON integration_credentials (organization_id);
CREATE INDEX idx_integration_creds_watch_expiry
  ON integration_credentials (watch_expiry)
  WHERE watch_channel_id IS NOT NULL;

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_integration_credentials ON integration_credentials
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON integration_credentials
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
