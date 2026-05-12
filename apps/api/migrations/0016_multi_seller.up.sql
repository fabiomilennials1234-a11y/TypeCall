-- 0016_multi_seller.up.sql
-- Multi-vendedor por org com ranks atendidos + ponteiro round-robin por tag.
-- Default allowed_tags inclui todos exceto 'disqualified'.

ALTER TABLE sellers
  ADD COLUMN allowed_tags TEXT[] NOT NULL DEFAULT ARRAY['diamond','gold','silver','bronze']::TEXT[];

CREATE INDEX idx_sellers_allowed_tags ON sellers USING GIN (allowed_tags);

-- ============================================================
-- seller_rotation_state — ponteiro round-robin por (org, tag)
-- ============================================================
CREATE TABLE seller_rotation_state (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tag             TEXT NOT NULL,
  last_seller_id  UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (organization_id, tag)
);

CREATE INDEX idx_seller_rotation_org ON seller_rotation_state (organization_id);

ALTER TABLE seller_rotation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_rotation_state FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_seller_rotation ON seller_rotation_state
  USING (organization_id = current_setting('app.current_org')::uuid);

-- ============================================================
-- bookings.event_type_id agora nullable.
-- Bookings via schedule step do form runner (multi-seller agregado) nao
-- tem event_type associado. Bookings legados continuam com event_type.
-- ============================================================
ALTER TABLE bookings ALTER COLUMN event_type_id DROP NOT NULL;

