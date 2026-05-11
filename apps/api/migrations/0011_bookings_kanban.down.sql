-- 0011_bookings_kanban.down.sql

DROP TABLE IF EXISTS booking_history;

ALTER TABLE responses
  DROP COLUMN IF EXISTS whatsapp;

ALTER TABLE bookings
  DROP COLUMN IF EXISTS utm_content,
  DROP COLUMN IF EXISTS utm_campaign,
  DROP COLUMN IF EXISTS utm_medium,
  DROP COLUMN IF EXISTS utm_source,
  DROP COLUMN IF EXISTS lead_tag,
  DROP COLUMN IF EXISTS seller_id,
  DROP COLUMN IF EXISTS kanban_status;

DROP TYPE IF EXISTS kanban_status;
