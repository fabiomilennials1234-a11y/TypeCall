-- 0004_scheduling.down.sql

DROP TABLE IF EXISTS integration_credentials;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS availability_overrides;
DROP TABLE IF EXISTS availability_rules;
DROP TABLE IF EXISTS event_types;

DROP TYPE IF EXISTS integration_provider;
DROP TYPE IF EXISTS booking_status;
DROP TYPE IF EXISTS location_type;
