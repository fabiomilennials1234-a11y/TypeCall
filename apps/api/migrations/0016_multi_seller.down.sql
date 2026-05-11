-- 0016_multi_seller.down.sql
ALTER TABLE bookings ALTER COLUMN event_type_id SET NOT NULL;
DROP TABLE IF EXISTS seller_rotation_state;
DROP INDEX IF EXISTS idx_sellers_allowed_tags;
ALTER TABLE sellers DROP COLUMN IF EXISTS allowed_tags;
