-- 0013_role_seller.up.sql
-- Sales Deals: amplia enum role de users para incluir 'seller'.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'member', 'master', 'seller'));
