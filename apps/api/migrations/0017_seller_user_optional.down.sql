-- 0017_seller_user_optional.down.sql
-- ATENCAO: down so funciona se nao houver sellers com user_id NULL ou duplicates.
ALTER TABLE sellers ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE sellers ADD CONSTRAINT sellers_user_id_organization_id_key UNIQUE (user_id, organization_id);
