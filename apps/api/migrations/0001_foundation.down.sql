-- 0001_foundation.down.sql
-- Drop in reverse dependency order

DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;
DROP FUNCTION IF EXISTS trigger_set_updated_at();
DROP EXTENSION IF EXISTS "pgcrypto";
