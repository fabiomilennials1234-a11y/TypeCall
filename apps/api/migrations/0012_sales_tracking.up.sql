-- 0012_sales_tracking.up.sql
-- Sales Deals: vendas concluidas, testes A/B de funis, e config de pixel
-- (Meta) por organizacao.

-- ============================================================
-- sales — venda fechada associada a um booking
-- ============================================================
CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seller_id       UUID NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount          NUMERIC(14,2) NOT NULL,
  closed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (booking_id),
  CONSTRAINT sales_amount_non_negative CHECK (amount >= 0)
);

CREATE INDEX idx_sales_org ON sales (organization_id);
CREATE INDEX idx_sales_seller ON sales (seller_id);
CREATE INDEX idx_sales_closed_at ON sales (organization_id, closed_at DESC);
CREATE INDEX idx_sales_seller_closed_at ON sales (seller_id, closed_at DESC);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_sales ON sales
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- funnel_ab_tests — agrupa form_ids em teste A/B
-- ============================================================
CREATE TABLE funnel_ab_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  form_ids        UUID[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT funnel_ab_tests_min_forms CHECK (array_length(form_ids, 1) >= 2)
);

CREATE INDEX idx_funnel_ab_tests_org ON funnel_ab_tests (organization_id);
CREATE INDEX idx_funnel_ab_tests_form_ids ON funnel_ab_tests USING GIN (form_ids);

ALTER TABLE funnel_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_ab_tests FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_funnel_ab_tests ON funnel_ab_tests
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON funnel_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- pixel_config — Meta Pixel + dispatch flags por org
-- ============================================================
CREATE TABLE pixel_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meta_pixel_id     TEXT,
  fire_on_start     BOOLEAN NOT NULL DEFAULT false,
  fire_on_booking   BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organization_id)
);

CREATE INDEX idx_pixel_config_org ON pixel_config (organization_id);

ALTER TABLE pixel_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pixel_config FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_pixel_config ON pixel_config
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON pixel_config
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
