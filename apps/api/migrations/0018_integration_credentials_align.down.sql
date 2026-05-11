-- Revert: restore legacy schema do migration 0007
ALTER TABLE integration_credentials
    ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS scopes       TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    ADD COLUMN IF NOT EXISTS calendar_id  TEXT;

UPDATE integration_credentials
SET token_expiry = access_token_expires_at
WHERE token_expiry IS NULL;

ALTER TABLE integration_credentials
    ALTER COLUMN token_expiry SET NOT NULL,
    DROP COLUMN IF EXISTS google_account_email,
    DROP COLUMN IF EXISTS access_token_nonce,
    DROP COLUMN IF EXISTS refresh_token_nonce,
    DROP COLUMN IF EXISTS scope,
    DROP COLUMN IF EXISTS access_token_expires_at,
    DROP COLUMN IF EXISTS watch_resource_id,
    DROP COLUMN IF EXISTS last_synced_at,
    DROP COLUMN IF EXISTS sync_error;
