-- 0011_bookings_kanban.up.sql
-- Sales Deals: estende bookings com fluxo Kanban (status operacional do deal),
-- ownership de vendedor, etiqueta de qualificacao herdada do lead, e UTMs de
-- origem. Adiciona whatsapp em responses. Cria booking_history para auditoria
-- de mudancas de status.

-- ============================================================
-- enum kanban_status (fluxo operacional do deal)
-- ============================================================
CREATE TYPE kanban_status AS ENUM (
  'to_confirm',
  'pre_confirmed',
  'confirmed',
  'rescheduled',
  'no_show',
  'completed'
);

-- ============================================================
-- bookings — adicoes
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN kanban_status kanban_status NOT NULL DEFAULT 'to_confirm',
  ADD COLUMN seller_id     UUID REFERENCES sellers(id) ON DELETE SET NULL,
  ADD COLUMN lead_tag      lead_tag,
  ADD COLUMN utm_source    TEXT,
  ADD COLUMN utm_medium    TEXT,
  ADD COLUMN utm_campaign  TEXT,
  ADD COLUMN utm_content   TEXT;

CREATE INDEX idx_bookings_kanban_status ON bookings (organization_id, kanban_status);
CREATE INDEX idx_bookings_seller ON bookings (seller_id) WHERE seller_id IS NOT NULL;
CREATE INDEX idx_bookings_lead_tag ON bookings (organization_id, lead_tag) WHERE lead_tag IS NOT NULL;

-- ============================================================
-- responses — adiciona whatsapp
-- ============================================================
ALTER TABLE responses
  ADD COLUMN whatsapp TEXT;

CREATE INDEX idx_responses_whatsapp ON responses (organization_id, whatsapp) WHERE whatsapp IS NOT NULL;

-- ============================================================
-- booking_history — log de transicoes de status
-- ============================================================
CREATE TABLE booking_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_status       kanban_status,
  to_status         kanban_status NOT NULL,
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes             TEXT,
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_history_booking ON booking_history (booking_id);
CREATE INDEX idx_booking_history_org ON booking_history (organization_id);
CREATE INDEX idx_booking_history_changed_at ON booking_history (organization_id, changed_at DESC);

ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_history FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_booking_history ON booking_history
  USING (organization_id = current_setting('app.current_org')::uuid);
