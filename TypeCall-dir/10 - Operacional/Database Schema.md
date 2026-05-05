---
tags:
  - operacional
  - database
created: 2026-05-05
updated: 2026-05-05
---

# Database Schema — TypeCall

PostgreSQL 15+ com RLS habilitado em todas as tabelas de dominio. UUIDs como primary keys. TIMESTAMPTZ para todos os campos temporais.

---

## Convencao de Migrations

Gerenciadas via `golang-migrate`. Arquivos em `apps/api/migrations/`.

```
0001_foundation.up.sql       — organizations, users
0002_forms.up.sql            — forms, form_versions
0003_responses.up.sql        — responses, response_answers
0004_scheduling.up.sql       — event_types, availability_rules, availability_overrides, schedule_members, bookings
0005_integrations.up.sql     — integration_credentials
0006_analytics.up.sql        — response_events
0007_system.up.sql           — audit_logs, file_uploads, api_keys
0008_billing.up.sql          — subscriptions
0009_webhooks.up.sql         — webhook_endpoints, webhook_deliveries
```

Cada migration tem um correspondente `.down.sql` com `DROP TABLE` na ordem inversa de dependencia.

---

## Padrao RLS

Aplicado em **toda tabela** que possui `organization_id`:

```sql
ALTER TABLE {tabela} ENABLE ROW LEVEL SECURITY;
ALTER TABLE {tabela} FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON {tabela}
  USING (organization_id = current_setting('app.current_org')::uuid);
```

O middleware Go seta `app.current_org` na conexao pgx antes de cada query:

```sql
SET LOCAL app.current_org = '{organization_uuid}';
```

---

## Trigger de updated_at

Reutilizado em todas as tabelas que possuem `updated_at`:

```sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Aplicacao por tabela:

```sql
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON {tabela}
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
```

---

## 0001 — Foundation

### organizations

```sql
CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  logo_url        TEXT,
  timezone        TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  plan            TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_organizations_slug ON organizations (slug);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
```

> Nota: `organizations` nao tem RLS — acessada apenas via service layer com filtro explicito.

### users

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  password_hash   TEXT NOT NULL,  -- bcrypt
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'master')),
  avatar_url      TEXT,
  timezone        TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organization_id, email)
);

CREATE INDEX idx_users_organization_id ON users (organization_id);
CREATE INDEX idx_users_email ON users (email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON users
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
```

---

## 0002 — Forms

### forms

```sql
CREATE TABLE forms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'closed')),
  version         INT NOT NULL DEFAULT 1,
  theme           JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings        JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organization_id, slug)
);

CREATE INDEX idx_forms_organization_id ON forms (organization_id);
CREATE INDEX idx_forms_status ON forms (organization_id, status);
CREATE INDEX idx_forms_slug ON forms (organization_id, slug);

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON forms
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
```

**Campos JSONB:**

- `theme`: Customizacao visual do formulario (cores, fontes, background)
  ```json
  {
    "primary_color": "#6366f1",
    "background_color": "#0a0a0a",
    "font_family": "Inter",
    "border_radius": "0.75rem"
  }
  ```

- `settings`: Configuracoes comportamentais
  ```json
  {
    "show_progress_bar": true,
    "allow_partial_save": true,
    "redirect_url": "https://example.com/obrigado",
    "close_message": "Obrigado por responder!",
    "notifications_email": "vendas@empresa.com"
  }
  ```

### form_versions

```sql
CREATE TABLE form_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version_number  INT NOT NULL,
  flow_definition JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (form_id, version_number)
);

CREATE INDEX idx_form_versions_form_id ON form_versions (form_id);
CREATE INDEX idx_form_versions_organization_id ON form_versions (organization_id);
CREATE INDEX idx_form_versions_flow_definition ON form_versions USING GIN (flow_definition);

ALTER TABLE form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_versions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON form_versions
  USING (organization_id = current_setting('app.current_org')::uuid);
```

**flow_definition JSONB** — Estrutura compativel com xyflow:

```json
{
  "nodes": [
    {
      "id": "step_welcome",
      "type": "welcome",
      "position": { "x": 0, "y": 0 },
      "data": {
        "title": "Bem-vindo!",
        "description": "Vamos agendar uma demonstracao."
      }
    },
    {
      "id": "step_name",
      "type": "short_text",
      "position": { "x": 0, "y": 100 },
      "data": {
        "question": "Qual e o seu nome?",
        "placeholder": "Ex: Maria Silva",
        "required": true,
        "validation": { "min_length": 2, "max_length": 100 }
      }
    },
    {
      "id": "step_booking",
      "type": "scheduling",
      "position": { "x": 0, "y": 300 },
      "data": {
        "event_type_id": "uuid-do-event-type",
        "question": "Escolha o melhor horario para voce"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "step_welcome", "target": "step_name" },
    { "id": "e2", "source": "step_name", "target": "step_booking" }
  ]
}
```

---

## 0003 — Responses

### responses

```sql
CREATE TABLE responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  form_version_id UUID NOT NULL REFERENCES form_versions(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  respondent_email TEXT,
  respondent_name  TEXT,
  respondent_ip    INET,
  source          TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('direct', 'embed', 'api', 'link')),
  status          TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  is_partial      BOOLEAN NOT NULL DEFAULT true,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_responses_form_id ON responses (form_id);
CREATE INDEX idx_responses_organization_id ON responses (organization_id);
CREATE INDEX idx_responses_status ON responses (organization_id, status);
CREATE INDEX idx_responses_started_at ON responses (organization_id, started_at DESC);

ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON responses
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON responses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
```

### response_answers

```sql
CREATE TABLE response_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id     UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id     TEXT NOT NULL,  -- Corresponde ao step_id no flow_definition
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  step_type       TEXT NOT NULL,  -- 'short_text', 'email', 'phone', 'select', 'rating', 'scheduling', etc.
  value           JSONB NOT NULL, -- Valor da resposta (formato depende do step_type)
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_response_answers_response_id ON response_answers (response_id);
CREATE INDEX idx_response_answers_organization_id ON response_answers (organization_id);
CREATE INDEX idx_response_answers_question_id ON response_answers (response_id, question_id);

ALTER TABLE response_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_answers FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON response_answers
  USING (organization_id = current_setting('app.current_org')::uuid);
```

**Exemplos de `value` JSONB por step_type:**

```json
// short_text
{ "text": "Maria Silva" }

// email
{ "email": "maria@empresa.com" }

// phone
{ "phone": "+5511999999999", "country": "BR" }

// select (single)
{ "selected": "option_2", "label": "10-50 funcionarios" }

// select (multi)
{ "selected": ["option_1", "option_3"], "labels": ["Marketing", "Vendas"] }

// rating
{ "rating": 8, "max": 10 }

// scheduling
{ "booking_id": "uuid-do-booking", "start_time": "2026-05-10T14:00:00-03:00" }
```

---

## 0004 — Scheduling

### event_types

```sql
CREATE TABLE event_types (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT,
  duration_minutes  INT NOT NULL DEFAULT 30,
  color             TEXT NOT NULL DEFAULT '#6366f1',
  location_type     TEXT NOT NULL DEFAULT 'google_meet'
                    CHECK (location_type IN ('google_meet', 'zoom', 'phone', 'in_person', 'custom')),
  location_value    TEXT,  -- URL do Zoom, endereco fisico, etc.
  buffer_before     INT NOT NULL DEFAULT 0,   -- minutos antes do evento
  buffer_after      INT NOT NULL DEFAULT 0,   -- minutos depois do evento
  min_notice_hours  INT NOT NULL DEFAULT 2,   -- antecedencia minima em horas
  max_advance_days  INT NOT NULL DEFAULT 60,  -- maximo de dias no futuro
  max_per_day       INT,                      -- limite de bookings por dia (NULL = sem limite)
  is_active         BOOLEAN NOT NULL DEFAULT true,
  settings          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organization_id, slug)
);

CREATE INDEX idx_event_types_organization_id ON event_types (organization_id);
CREATE INDEX idx_event_types_active ON event_types (organization_id) WHERE is_active = true;

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON event_types
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON event_types
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
```

**settings JSONB:**

```json
{
  "confirmation_email": true,
  "reminder_minutes": [30, 1440],
  "require_phone": false,
  "custom_questions": [],
  "redirect_url": null
}
```

### availability_rules

```sql
CREATE TABLE availability_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_of_week     INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0 = domingo
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  timezone        TEXT NOT NULL DEFAULT 'America/Sao_Paulo',

  CHECK (start_time < end_time)
);

CREATE INDEX idx_availability_rules_user_id ON availability_rules (user_id);
CREATE INDEX idx_availability_rules_organization_id ON availability_rules (organization_id);
CREATE INDEX idx_availability_rules_day ON availability_rules (user_id, day_of_week);

ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON availability_rules
  USING (organization_id = current_setting('app.current_org')::uuid);
```

### availability_overrides

```sql
CREATE TABLE availability_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  available       BOOLEAN NOT NULL DEFAULT false,  -- false = dia bloqueado, true = horario extra
  start_time      TIME,  -- NULL se available = false (dia inteiro bloqueado)
  end_time        TIME,  -- NULL se available = false
  reason          TEXT,  -- "Feriado", "Ferias", "Consulta medica", etc.

  UNIQUE (user_id, date),
  CHECK (
    (available = false AND start_time IS NULL AND end_time IS NULL)
    OR
    (available = true AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

CREATE INDEX idx_availability_overrides_user_id ON availability_overrides (user_id);
CREATE INDEX idx_availability_overrides_organization_id ON availability_overrides (organization_id);
CREATE INDEX idx_availability_overrides_date ON availability_overrides (user_id, date);

ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_overrides FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON availability_overrides
  USING (organization_id = current_setting('app.current_org')::uuid);
```

### schedule_members

Relaciona event_types com users (quais membros da org atendem quais tipos de evento):

```sql
CREATE TABLE schedule_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id   UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_primary      BOOLEAN NOT NULL DEFAULT false,  -- host principal
  priority        INT NOT NULL DEFAULT 0,           -- round-robin priority
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (event_type_id, user_id)
);

CREATE INDEX idx_schedule_members_event_type_id ON schedule_members (event_type_id);
CREATE INDEX idx_schedule_members_user_id ON schedule_members (user_id);
CREATE INDEX idx_schedule_members_organization_id ON schedule_members (organization_id);

ALTER TABLE schedule_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_members FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON schedule_members
  USING (organization_id = current_setting('app.current_org')::uuid);
```

### bookings

```sql
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type_id     UUID NOT NULL REFERENCES event_types(id),
  host_user_id      UUID NOT NULL REFERENCES users(id),
  response_id       UUID REFERENCES responses(id),  -- NULL se booking direto (sem form)
  invitee_name      TEXT NOT NULL,
  invitee_email     TEXT NOT NULL,
  invitee_phone     TEXT,
  invitee_timezone  TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  status            TEXT NOT NULL DEFAULT 'confirmed'
                    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'rescheduled', 'completed', 'no_show')),
  cancel_reason     TEXT,
  reschedule_token  UUID DEFAULT gen_random_uuid(),
  cancel_token      UUID DEFAULT gen_random_uuid(),
  external_provider TEXT,  -- 'google', 'outlook'
  external_event_id TEXT,  -- ID do evento no Google Calendar / Outlook
  meeting_url       TEXT,  -- URL do Google Meet / Zoom
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (start_time < end_time)
);

-- Index principal para checagem de conflito de horarios
CREATE INDEX idx_bookings_conflict_check
  ON bookings (event_type_id, start_time, end_time)
  WHERE status NOT IN ('cancelled', 'rescheduled');

-- Index para busca por host
CREATE INDEX idx_bookings_host ON bookings (host_user_id, start_time DESC);

-- Index para busca por organizacao
CREATE INDEX idx_bookings_organization_id ON bookings (organization_id);

-- Index para busca por status
CREATE INDEX idx_bookings_status ON bookings (organization_id, status);

-- Index para tokens de cancel/reschedule (acesso publico)
CREATE UNIQUE INDEX idx_bookings_reschedule_token ON bookings (reschedule_token) WHERE reschedule_token IS NOT NULL;
CREATE UNIQUE INDEX idx_bookings_cancel_token ON bookings (cancel_token) WHERE cancel_token IS NOT NULL;

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON bookings
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
```

---

## 0005 — Integrations

### integration_credentials

```sql
CREATE TABLE integration_credentials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
  access_token_enc    BYTEA NOT NULL,   -- Encrypted com AES-256-GCM
  refresh_token_enc   BYTEA NOT NULL,   -- Encrypted com AES-256-GCM
  token_type          TEXT NOT NULL DEFAULT 'Bearer',
  expires_at          TIMESTAMPTZ NOT NULL,
  scopes              TEXT[] NOT NULL DEFAULT '{}',
  external_account_id TEXT,             -- Email da conta Google/Outlook conectada
  last_synced_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organization_id, user_id, provider)
);

CREATE INDEX idx_integration_credentials_organization_id ON integration_credentials (organization_id);
CREATE INDEX idx_integration_credentials_user_id ON integration_credentials (user_id);
CREATE INDEX idx_integration_credentials_expires ON integration_credentials (expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON integration_credentials
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON integration_credentials
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
```

> **Seguranca**: Tokens OAuth sao encriptados em repouso com AES-256-GCM. A chave de encriptacao e armazenada como env var (`ENCRYPTION_KEY`), nunca no banco.

---

## 0006 — Analytics

### response_events

```sql
CREATE TABLE response_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  response_id     UUID REFERENCES responses(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL CHECK (event_type IN (
    'view',                   -- Formulario visualizado
    'start',                  -- Respondente comecou a preencher
    'question_seen',          -- Step exibido ao respondente
    'question_answered',      -- Step respondido
    'booking_slot_selected',  -- Slot de agendamento selecionado
    'submit',                 -- Formulario enviado
    'abandon',                -- Respondente abandonou
    'share'                   -- Formulario compartilhado
  )),
  question_id     TEXT,       -- step_id (NULL pra eventos globais como view, start, submit)
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_response_events_form_id ON response_events (form_id);
CREATE INDEX idx_response_events_organization_id ON response_events (organization_id);
CREATE INDEX idx_response_events_type ON response_events (form_id, event_type);
CREATE INDEX idx_response_events_occurred ON response_events (form_id, occurred_at DESC);

ALTER TABLE response_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON response_events
  USING (organization_id = current_setting('app.current_org')::uuid);
```

> **Nota**: Tabela append-only. Nao tem `updated_at` nem trigger de update. Dados nunca sao alterados.

**Exemplos de metadata JSONB:**

```json
// question_seen
{ "step_type": "short_text", "position": 3 }

// question_answered
{ "step_type": "email", "time_to_answer_ms": 4500 }

// booking_slot_selected
{ "slot_start": "2026-05-10T14:00:00-03:00", "event_type_id": "uuid" }

// abandon
{ "last_step": "step_email", "steps_completed": 3, "total_steps": 7 }
```

---

## 0007 — System

### audit_logs

```sql
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id        UUID,  -- user_id, system, ou NULL
  actor_type      TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'master', 'api')),
  action          TEXT NOT NULL,  -- 'form.created', 'booking.cancelled', 'member.invited', etc.
  resource_type   TEXT NOT NULL,  -- 'form', 'booking', 'user', 'organization', etc.
  resource_id     UUID,
  changes         JSONB,          -- { "before": {...}, "after": {...} }
  ip              INET,
  user_agent      TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_organization_id ON audit_logs (organization_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_occurred ON audit_logs (organization_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs (organization_id, action);
```

> **Nota**: audit_logs NAO tem RLS — acessada apenas via service layer com filtro explicito no codigo. Permite que o actor_type 'master' veja logs cross-org.

### file_uploads

```sql
CREATE TABLE file_uploads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  response_id     UUID REFERENCES responses(id) ON DELETE SET NULL,
  original_name   TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size_bytes      BIGINT NOT NULL,
  storage_key     TEXT NOT NULL,  -- Chave no S3 (path completo)
  scan_status     TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'infected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_file_uploads_organization_id ON file_uploads (organization_id);
CREATE INDEX idx_file_uploads_response_id ON file_uploads (response_id);
CREATE INDEX idx_file_uploads_storage_key ON file_uploads (storage_key);

ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON file_uploads
  USING (organization_id = current_setting('app.current_org')::uuid);
```

### api_keys

```sql
CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash        TEXT NOT NULL,   -- SHA-256 hash da key completa
  key_prefix      TEXT NOT NULL,   -- Primeiros 8 caracteres (pra identificacao visual: "tc_live_a1b2...")
  name            TEXT NOT NULL,   -- Nome descritivo ("Integracao Torque CRM")
  scopes          TEXT[] NOT NULL DEFAULT '{}',  -- ['forms:read', 'bookings:write', etc.]
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,     -- NULL = nunca expira
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_organization_id ON api_keys (organization_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys (key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys (key_prefix);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON api_keys
  USING (organization_id = current_setting('app.current_org')::uuid);
```

> **Seguranca**: A API key completa e mostrada apenas uma vez na criacao. Apenas o hash e armazenado. Autenticacao via header `Authorization: Bearer tc_live_...`.

---

## 0008 — Billing

### subscriptions

```sql
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan                    TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  asaas_subscription_id   TEXT,          -- ID da subscription no Asaas
  asaas_customer_id       TEXT,          -- ID do customer no Asaas
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
  trial_ends_at           TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organization_id)
);

CREATE INDEX idx_subscriptions_organization_id ON subscriptions (organization_id);
CREATE INDEX idx_subscriptions_asaas ON subscriptions (asaas_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON subscriptions
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
```

---

## 0009 — Webhooks

### webhook_endpoints

```sql
CREATE TABLE webhook_endpoints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  events          TEXT[] NOT NULL DEFAULT '{}',  -- ['response.submitted', 'booking.created', etc.]
  secret          TEXT NOT NULL,                 -- HMAC-SHA256 signing secret
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_endpoints_organization_id ON webhook_endpoints (organization_id);
CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints (organization_id) WHERE is_active = true;

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON webhook_endpoints
  USING (organization_id = current_setting('app.current_org')::uuid);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
```

**Events disponiveis:**

```
response.submitted       — Resposta completa submetida
response.started         — Respondente comecou a preencher
booking.created          — Agendamento criado
booking.confirmed        — Agendamento confirmado
booking.cancelled        — Agendamento cancelado
booking.rescheduled      — Agendamento reagendado
booking.completed        — Reuniao concluida
booking.no_show          — No-show registrado
form.published           — Formulario publicado
form.closed              — Formulario fechado
```

### webhook_deliveries

```sql
CREATE TABLE webhook_deliveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL,
  payload             JSONB NOT NULL,
  request_headers     JSONB,           -- Headers enviados
  response_status     INT,             -- HTTP status code da resposta
  response_body       TEXT,            -- Body da resposta (truncado em 10KB)
  response_headers    JSONB,           -- Headers da resposta
  duration_ms         INT,             -- Tempo de resposta em ms
  attempts            INT NOT NULL DEFAULT 0,
  max_attempts        INT NOT NULL DEFAULT 3,
  next_retry_at       TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'delivering', 'delivered', 'failed')),
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries (webhook_endpoint_id);
CREATE INDEX idx_webhook_deliveries_organization_id ON webhook_deliveries (organization_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries (status) WHERE status IN ('pending', 'delivering');
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries (next_retry_at) WHERE status = 'pending' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries (webhook_endpoint_id, created_at DESC);

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON webhook_deliveries
  USING (organization_id = current_setting('app.current_org')::uuid);
```

**Payload JSONB exemplo (booking.created):**

```json
{
  "event": "booking.created",
  "timestamp": "2026-05-10T14:00:00-03:00",
  "data": {
    "booking_id": "uuid",
    "event_type": {
      "id": "uuid",
      "title": "Demonstracao 30min"
    },
    "invitee": {
      "name": "Maria Silva",
      "email": "maria@empresa.com",
      "phone": "+5511999999999"
    },
    "start_time": "2026-05-12T14:00:00-03:00",
    "end_time": "2026-05-12T14:30:00-03:00",
    "meeting_url": "https://meet.google.com/abc-defg-hij",
    "response_id": "uuid"
  }
}
```

---

## Resumo de Tabelas

| Migration | Tabela                  | RLS | Audit | Descricao                          |
|-----------|------------------------|-----|-------|------------------------------------|
| 0001      | organizations          | Nao | Sim   | Tenants (empresas)                 |
| 0001      | users                  | Sim | Sim   | Membros da organizacao             |
| 0002      | forms                  | Sim | Sim   | Formularios conversacionais        |
| 0002      | form_versions          | Sim | Nao   | Versoes do flow definition (JSONB) |
| 0003      | responses              | Sim | Nao   | Respostas de formularios           |
| 0003      | response_answers       | Sim | Nao   | Respostas individuais por step     |
| 0004      | event_types            | Sim | Sim   | Tipos de evento (agendamento)      |
| 0004      | availability_rules     | Sim | Nao   | Janelas de disponibilidade semanais|
| 0004      | availability_overrides | Sim | Nao   | Excecoes de disponibilidade        |
| 0004      | schedule_members       | Sim | Nao   | Membros por tipo de evento         |
| 0004      | bookings               | Sim | Sim   | Agendamentos                       |
| 0005      | integration_credentials| Sim | Sim   | Tokens OAuth encriptados           |
| 0006      | response_events        | Sim | Nao   | Eventos analytics (append-only)    |
| 0007      | audit_logs             | Nao | -     | Log de auditoria (append-only)     |
| 0007      | file_uploads           | Sim | Nao   | Metadados de arquivos uploaded     |
| 0007      | api_keys               | Sim | Sim   | Chaves de API publica              |
| 0008      | subscriptions          | Sim | Sim   | Subscriptions de billing (Asaas)   |
| 0009      | webhook_endpoints      | Sim | Sim   | Endpoints de webhook configurados  |
| 0009      | webhook_deliveries     | Sim | Nao   | Historico de entregas de webhook   |
