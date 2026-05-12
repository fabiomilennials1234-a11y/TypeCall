-- Align integration_credentials schema with code expectations (domain.IntegrationCredential).
-- Original migration 0007 created columns inconsistent with the Go code (D031).
-- Tabela ainda vazia em dev — sem necessidade de copiar dados antigos.

ALTER TABLE integration_credentials
    ADD COLUMN IF NOT EXISTS google_account_email TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS access_token_nonce   BYTEA  NOT NULL DEFAULT '\x',
    ADD COLUMN IF NOT EXISTS refresh_token_nonce  BYTEA  NOT NULL DEFAULT '\x',
    ADD COLUMN IF NOT EXISTS scope                TEXT   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS access_token_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS watch_resource_id    TEXT,
    ADD COLUMN IF NOT EXISTS last_synced_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sync_error           TEXT;

-- Backfill: copia token_expiry -> access_token_expires_at se NULL
UPDATE integration_credentials
SET access_token_expires_at = token_expiry
WHERE access_token_expires_at IS NULL AND token_expiry IS NOT NULL;

-- access_token_expires_at deve ser NOT NULL apos backfill
ALTER TABLE integration_credentials
    ALTER COLUMN access_token_expires_at SET NOT NULL;

-- Remove defaults sentinela (so eram pra cobrir add column em tabela com rows)
ALTER TABLE integration_credentials
    ALTER COLUMN google_account_email DROP DEFAULT,
    ALTER COLUMN access_token_nonce   DROP DEFAULT,
    ALTER COLUMN refresh_token_nonce  DROP DEFAULT,
    ALTER COLUMN scope                DROP DEFAULT;

-- Colunas legacy descartadas pra evitar drift futuro
ALTER TABLE integration_credentials
    DROP COLUMN IF EXISTS token_expiry,
    DROP COLUMN IF EXISTS scopes,
    DROP COLUMN IF EXISTS calendar_id;
