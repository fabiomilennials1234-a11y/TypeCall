-- 0010_seller_config.up.sql
-- Sales Deals: vendedores (perfil + preferencias de reuniao), disponibilidade
-- semanal, e metas por periodo.

-- ============================================================
-- enum seller_location_type (online | whatsapp | presencial)
-- Nome distinto do enum location_type (0004) que e mais amplo.
-- ============================================================
CREATE TYPE seller_location_type AS ENUM ('online', 'whatsapp', 'presencial');

-- ============================================================
-- sellers — perfil do vendedor (1:1 com user)
-- ============================================================
CREATE TABLE sellers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  meeting_duration_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_after_minutes     INTEGER NOT NULL DEFAULT 15,
  location_type            seller_location_type NOT NULL DEFAULT 'online',
  active                   BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, organization_id),
  CONSTRAINT sellers_duration_positive CHECK (meeting_duration_minutes > 0),
  CONSTRAINT sellers_buffer_non_negative CHECK (buffer_after_minutes >= 0)
);

CREATE INDEX idx_sellers_org ON sellers (organization_id);
CREATE INDEX idx_sellers_user ON sellers (user_id);
CREATE INDEX idx_sellers_org_active ON sellers (organization_id) WHERE active = true;

ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_sellers ON sellers
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON sellers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- seller_availability — horarios semanais por vendedor
-- ============================================================
CREATE TABLE seller_availability (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_of_week     INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT seller_availability_time_range CHECK (start_time < end_time)
);

CREATE INDEX idx_seller_availability_seller ON seller_availability (seller_id);
CREATE INDEX idx_seller_availability_org ON seller_availability (organization_id);
CREATE INDEX idx_seller_availability_seller_dow ON seller_availability (seller_id, day_of_week);

ALTER TABLE seller_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_availability FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_seller_availability ON seller_availability
  USING (organization_id = current_setting('app.current_org')::uuid);

-- ============================================================
-- seller_goals — metas por periodo (mes, trimestre, etc)
-- ============================================================
CREATE TABLE seller_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  goal_meetings   INTEGER NOT NULL DEFAULT 0,
  goal_sales      INTEGER NOT NULL DEFAULT 0,
  goal_revenue    NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT seller_goals_period_range CHECK (period_start <= period_end),
  CONSTRAINT seller_goals_no_overlap UNIQUE (seller_id, period_start, period_end)
);

CREATE INDEX idx_seller_goals_seller ON seller_goals (seller_id);
CREATE INDEX idx_seller_goals_org ON seller_goals (organization_id);
CREATE INDEX idx_seller_goals_period ON seller_goals (organization_id, period_start, period_end);

ALTER TABLE seller_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_goals FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_seller_goals ON seller_goals
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON seller_goals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
