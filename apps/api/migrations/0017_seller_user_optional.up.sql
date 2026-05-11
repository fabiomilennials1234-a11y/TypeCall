-- 0017_seller_user_optional.up.sql
-- Multi-vendedor permite multiplos sellers per user OU sellers sem user (perfil-only).
-- Drop unique (user_id, org_id) e torna user_id nullable.

ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_user_id_organization_id_key;
ALTER TABLE sellers ALTER COLUMN user_id DROP NOT NULL;
