-- 0004_scheduling.up.sql
-- Scheduling engine: event types, availability, bookings, integration credentials (Sprint 6)

-- Location type enum
CREATE TYPE location_type AS ENUM ('google_meet', 'custom_url', 'in_person');

-- Booking status enum
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show');

-- Integration provider enum
CREATE TYPE integration_provider AS ENUM ('google_calendar', 'outlook');

-- Event types: scheduling templates
CREATE TABLE event_types (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title                 TEXT NOT NULL,
    slug                  TEXT NOT NULL,
    description           TEXT,
    duration_minutes      INTEGER NOT NULL DEFAULT 30,
    buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
    buffer_after_minutes  INTEGER NOT NULL DEFAULT 15,
    min_notice_hours      INTEGER NOT NULL DEFAULT 2,
    max_advance_days      INTEGER NOT NULL DEFAULT 30,
    max_per_day           INTEGER,
    location_type         location_type NOT NULL DEFAULT 'google_meet',
    location_value        TEXT,
    color                 TEXT NOT NULL DEFAULT '#6366f1',
    is_active             BOOLEAN NOT NULL DEFAULT true,
    settings              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_event_types_org_slug ON event_types (organization_id, slug);
CREATE INDEX idx_event_types_org ON event_types (organization_id);
CREATE INDEX idx_event_types_user ON event_types (user_id);

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_event_types ON event_types
    USING (organization_id = current_setting('app.current_org')::uuid);

-- Availability rules: weekly recurring schedule
CREATE TABLE availability_rules (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type_id  UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week    INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time     TIME NOT NULL,
    end_time       TIME NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

CREATE INDEX idx_availability_rules_event_type ON availability_rules (event_type_id);
CREATE INDEX idx_availability_rules_user ON availability_rules (user_id);

-- Availability overrides: date-specific exceptions
CREATE TABLE availability_overrides (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type_id  UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date           DATE NOT NULL,
    is_available   BOOLEAN NOT NULL DEFAULT false,
    start_time     TIME,
    end_time       TIME,
    reason         TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_override_range CHECK (
        (is_available = false AND start_time IS NULL AND end_time IS NULL)
        OR (is_available = true AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    )
);

CREATE INDEX idx_availability_overrides_event_type ON availability_overrides (event_type_id);
CREATE UNIQUE INDEX idx_availability_overrides_unique ON availability_overrides (event_type_id, user_id, date);

-- Bookings: confirmed meetings
CREATE TABLE bookings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type_id       UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
    host_user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response_id         UUID REFERENCES responses(id) ON DELETE SET NULL,
    attendee_name       TEXT NOT NULL,
    attendee_email      TEXT NOT NULL,
    attendee_phone      TEXT,
    start_time          TIMESTAMPTZ NOT NULL,
    end_time            TIMESTAMPTZ NOT NULL,
    timezone            TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    status              booking_status NOT NULL DEFAULT 'pending',
    location_type       location_type NOT NULL,
    location_value      TEXT,
    google_event_id     TEXT,
    meeting_url         TEXT,
    cancel_token        TEXT NOT NULL,
    reschedule_token    TEXT NOT NULL,
    notes               TEXT,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    cancelled_at        TIMESTAMPTZ,
    cancel_reason       TEXT,
    rescheduled_from_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_booking_range CHECK (start_time < end_time)
);

CREATE INDEX idx_bookings_org ON bookings (organization_id);
CREATE INDEX idx_bookings_event_type ON bookings (event_type_id);
CREATE INDEX idx_bookings_host ON bookings (host_user_id);
CREATE INDEX idx_bookings_host_time ON bookings (host_user_id, start_time, end_time) WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_created_at ON bookings (organization_id, created_at DESC);
CREATE INDEX idx_bookings_cancel_token ON bookings (cancel_token) WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_bookings_reschedule_token ON bookings (reschedule_token) WHERE status IN ('pending', 'confirmed');

-- Partial unique index: prevent double-booking same host at same start time
CREATE UNIQUE INDEX idx_no_double_booking
    ON bookings (host_user_id, start_time)
    WHERE status IN ('pending', 'confirmed');

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_bookings ON bookings
    USING (organization_id = current_setting('app.current_org')::uuid);

-- Integration credentials: encrypted OAuth tokens
CREATE TABLE integration_credentials (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider                integration_provider NOT NULL,
    access_token_encrypted  BYTEA NOT NULL,
    refresh_token_encrypted BYTEA NOT NULL,
    token_expiry            TIMESTAMPTZ NOT NULL,
    scopes                  TEXT[] NOT NULL DEFAULT '{}',
    calendar_id             TEXT,
    watch_channel_id        TEXT,
    watch_expiry            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_integration_creds_user_provider ON integration_credentials (user_id, provider);
CREATE INDEX idx_integration_creds_org ON integration_credentials (organization_id);

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_integration_creds ON integration_credentials
    USING (organization_id = current_setting('app.current_org')::uuid);
