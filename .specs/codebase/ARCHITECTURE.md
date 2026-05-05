# TypeCall — Arquitetura

**Ultima atualizacao:** 2026-05-05

---

## Visao Geral do Sistema

```
External Sites (embed iframe)
        │
        ▼
Cloudflare / Nginx (TLS + WAF + Rate Limit)
        │
  ┌─────┼─────┐
  ▼     ▼     ▼
 web   api   embed CDN
(SPA) (Go)  (static JS)
        │
  ┌─────┼─────┐
  ▼     ▼     ▼
Postgres Redis  GCal API
```

**Tres pontos de entrada:**

1. **web** — Dashboard SPA (React) servido como static files. Todas as operacoes passam pela API.
2. **api** — Backend Go. Unica fonte de verdade. Serve REST, WebSocket (dashboard) e SSE (respondent).
3. **embed** — Loader JS estatico (<3KB gzip) hospedado em CDN. Cria iframe apontando para runner do embed app.

---

## Monorepo Layout

```
TypeCall/
├── apps/
│   ├── api/                  # Go backend — REST + WS + SSE
│   ├── web/                  # Dashboard SPA — React + TypeScript
│   └── embed/                # Widget embedavel — loader + runner
├── packages/
│   ├── flow-engine/          # Logica de fluxo compartilhada (TS)
│   └── shared/               # Tipos, constantes, helpers compartilhados
├── docker-compose.yml        # Dev environment (Postgres + Redis + API)
├── pnpm-workspace.yaml       # Monorepo config
└── turbo.json                # Build orchestration
```

### apps/api (Go)

Backend monolitico modular. Responsavel por toda logica de negocio, persistencia, auth, scheduling, real-time e integracao com servicos externos.

### apps/web (React)

Dashboard administrativo onde times configuram formularios, definem disponibilidade, visualizam respostas e gerenciam agendamentos.

### apps/embed (Lightweight)

Runtime embedavel em sites externos. Composto por:
- **loader.ts** — IIFE minimo que injeta iframe
- **runner/** — Renderizador conversacional dentro do iframe
- **messenger.ts** — Bridge postMessage entre host e iframe

### packages/flow-engine (TypeScript)

Logica pura de navegacao de fluxo. Compartilhada entre web (editor visual) e embed (runtime de execucao). Sem dependencias de DOM ou framework.

### packages/shared (TypeScript)

Tipos TypeScript gerados do OpenAPI, constantes de dominio, e helpers utilitarios compartilhados entre web e embed.

---

## Go Backend — Clean Architecture

```
HTTP Request
     │
     ▼
┌──────────┐
│  Router   │  chi.NewRouter() — rotas agrupadas por dominio
│  (chi)    │
└────┬─────┘
     │
     ▼
┌──────────┐
│Middleware │  Auth → Tenant → CSRF → RateLimit → RequestID → Logger
└────┬─────┘
     │
     ▼
┌──────────┐
│ Handler   │  Decodifica request, valida input, chama service, codifica response
└────┬─────┘
     │
     ▼
┌──────────┐
│ Service   │  Regras de negocio. Orquestra repositories e integrations.
└────┬─────┘
     │
     ├──────────────┐
     ▼              ▼
┌──────────┐  ┌──────────────┐
│Repository│  │ Integration  │  Google Calendar, Resend, Asaas, S3
│  (pgx)   │  │  (external)  │
└──────────┘  └──────────────┘
     │
     ▼
┌──────────┐
│ Postgres │  RLS policies aplicadas em toda query
└──────────┘
```

**Regras:**
- Handlers nunca acessam o banco diretamente
- Services nunca conhecem HTTP (nao recebem `http.Request`)
- Repositories sao interfaces — testabilidade via mocks
- Integrations sao wrappers finos sobre SDKs externos

### Dominios do Handler Layer

| Handler               | Rota Base          | Responsabilidade                               |
|----------------------|--------------------|-------------------------------------------------|
| `auth_handler`       | `/api/v1/auth`     | Login, registro, refresh, logout                 |
| `form_handler`       | `/api/v1/forms`    | CRUD de formularios, publicacao, versionamento   |
| `response_handler`   | `/api/v1/responses`| Submissao, listagem, export de respostas         |
| `event_type_handler` | `/api/v1/event-types` | CRUD de tipos de evento (scheduling)          |
| `availability_handler` | `/api/v1/availability` | Regras e overrides de disponibilidade      |
| `booking_handler`    | `/api/v1/bookings` | Criacao, cancelamento, reschedule de agendamentos|
| `integration_handler`| `/api/v1/integrations` | OAuth flows, status de conexoes             |
| `analytics_handler`  | `/api/v1/analytics`| Metricas de formularios e agendamentos           |
| `webhook_handler`    | `/api/v1/webhooks` | CRUD de endpoints, redelivery                    |
| `org_handler`        | `/api/v1/org`      | Configuracoes da organizacao, membros            |
| `upload_handler`     | `/api/v1/uploads`  | Upload de arquivos (presigned URLs)              |
| `public_handler`     | `/p/`              | Rotas publicas (form view, booking page, SSE)    |

---

## Frontend — Arquitetura

```
src/
├── features/           # Feature-first organization
│   ├── auth/           # Login, registro, forgot password
│   ├── forms/          # Form builder, form list, form settings
│   ├── responses/      # Response viewer, analytics
│   ├── scheduling/     # Event types, availability, bookings
│   ├── integrations/   # Calendar connections, webhooks
│   ├── settings/       # Org settings, billing, team
│   └── dashboard/      # Overview, metricas rapidas
├── components/ui/      # shadcn/ui primitives (Button, Dialog, etc.)
├── api/                # Typed client gerado do OpenAPI
├── hooks/              # TanStack Query hooks (useForm, useBookings, etc.)
├── lib/                # Utilities (date formatting, cn(), etc.)
└── styles/             # globals.css, HSL design tokens
```

**Principios:**
- **Feature-first** — Cada feature e autocontida (page, components, hooks, types)
- **shadcn/ui** — Componentes copiados, nao importados. Customizaveis via design tokens HSL.
- **TanStack Query** — Server state gerenciado exclusivamente via hooks de query/mutation
- **Zod + React Hook Form** — Validacao de formularios client-side
- **@dnd-kit** — Drag and drop no form builder
- **Framer Motion** — Animacoes na experiencia conversacional

---

## Embed — Arquitetura

```
Site Externo                          TypeCall CDN
┌─────────────────┐            ┌──────────────────────┐
│                 │            │                      │
│  <script src=   │            │  loader.ts (IIFE)    │
│   "loader.js">  │───load────▶│   - Cria <iframe>    │
│                 │            │   - Injeta no DOM     │
│  <div id=       │            │   - Configura sandbox │
│   "typecall">   │            │                      │
│                 │            │  runner/ (dentro iframe)│
│                 │◀─message──▶│   - Renderiza form    │
│                 │            │   - Executa flow      │
│                 │            │   - Submete respostas │
│                 │            │                      │
│  messenger.ts   │            │  messenger.ts         │
│  (host-side)    │◀─bridge───▶│  (iframe-side)        │
└─────────────────┘            └──────────────────────┘
```

**loader.ts** (<3KB gzip):
- IIFE que injeta iframe com sandbox attributes
- Recebe config via `data-*` attributes ou `window.TypeCall.init()`
- Zero dependencias

**runner/**:
- App React minimo renderizado dentro do iframe
- Consome flow-engine pra navegacao entre steps
- Conecta via SSE ao backend para real-time (nao WS — respondent nao tem auth)

**messenger.ts**:
- postMessage bridge bidirecional
- Eventos: `typecall:ready`, `typecall:resize`, `typecall:submit`, `typecall:booking`
- Origin validation rigorosa

---

## Real-time

Dois protocolos distintos por contexto de seguranca:

| Protocolo  | Contexto          | Uso                                       | Auth             |
|-----------|-------------------|-------------------------------------------|------------------|
| WebSocket | Dashboard (auth)  | Updates de respostas, notificacoes         | JWT via cookie   |
| SSE       | Respondent (publico) | Progress tracking, slot availability live | Nenhuma (public) |

### WebSocket Hub (Dashboard)

```
WebSocket Connection (autenticado)
     │
     ▼
┌──────────┐
│  WS Hub  │  Tenant-scoped — cada org tem seu proprio hub
└────┬─────┘
     │
     ▼
┌──────────┐
│ Channels │  Subscriptions por recurso (form:uuid, booking:uuid)
└──────────┘
```

- Implementado com `nhooyr.io/websocket`
- Upgrade feito apos validacao JWT
- Fan-out por tenant — mensagens nunca cruzam organizacoes
- Heartbeat a cada 30s, reconnect automatico no client

### SSE (Respondent)

- Endpoint publico: `GET /p/{form_slug}/events`
- Sem auth — rate limited por IP
- Usado pra: atualizacao de slots de disponibilidade em tempo real
- Timeout de 5 minutos, client reconecta automaticamente

---

## Event Bus — In-Process

```
Event Producer (Service Layer)
     │
     ▼
┌──────────────┐
│  Event Bus   │  Go channels — buffered, tenant-scoped
│  (in-process)│
└──────┬───────┘
       │
  ┌────┼────┐
  ▼    ▼    ▼
 WS   Worker  Analytics
 Hub   Pool   Aggregator
```

**Caracteristicas:**
- Baseado em Go channels (nao precisa de message broker externo)
- Fan-out por tenant — subscribers recebem apenas eventos da sua org
- Tipos de evento: `response.submitted`, `booking.created`, `booking.cancelled`, `form.published`
- Graceful shutdown — drain de eventos antes de encerrar o processo

**Escala futura:** Se o volume justificar, migrar para NATS ou Redis Streams. A interface do bus e abstrata — swap transparente.

---

## Worker Pool — In-Process

```
Event Bus / Cron Scheduler
     │
     ▼
┌──────────────┐
│ Worker Pool  │  Goroutine pool com semaphore (max concurrency)
└──────┬───────┘
       │
  ┌────┼────┬────────────┐
  ▼    ▼    ▼            ▼
Email  GCal Webhook     Reminder
Send   Sync Delivery    Notifications
```

**Jobs:**
- **Email** — Confirmacao de booking, lembretes (via Resend)
- **GCal Sync** — Criacao/atualizacao de eventos no Google Calendar
- **Webhook Delivery** — POST para endpoints configurados, retry com exponential backoff
- **Reminders** — Notificacoes pre-reuniao (30min, 1h, 24h antes)

**Retry policy:** 3 tentativas, backoff exponencial (1s, 4s, 16s). Falhas persistidas em `webhook_deliveries` pra redelivery manual.

---

## Database — PostgreSQL 15+

### Multi-tenancy via RLS

Tres camadas de isolamento garantem que dados nunca vazam entre organizacoes:

```
1. JWT Claims    → organization_id extraido do token
2. Middleware    → Seta current_setting('app.current_org')
3. RLS Policy   → WHERE organization_id = current_setting('app.current_org')::uuid
```

**Padrao RLS aplicado em TODA tabela de dominio:**

```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
ALTER TABLE {table} FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON {table}
  USING (organization_id = current_setting('app.current_org')::uuid);
```

### JSONB para Flow Definitions

Formularios sao armazenados como JSONB em `form_versions.flow_definition`. Isso permite:
- Versionamento trivial (nova versao = novo registro)
- Compatibilidade nativa com xyflow (editor visual)
- Queries flexiveis via operadores JSONB do Postgres
- Sem necessidade de schema migration pra novos tipos de step

### Migrations

Gerenciadas via `golang-migrate`. Convencao de numeracao:

```
migrations/
├── 0001_foundation.up.sql      # orgs, users, auth
├── 0001_foundation.down.sql
├── 0002_forms.up.sql           # forms, form_versions
├── 0002_forms.down.sql
├── 0003_responses.up.sql       # responses, response_answers
├── 0003_responses.down.sql
├── 0004_scheduling.up.sql      # event_types, availability, bookings
├── 0004_scheduling.down.sql
├── 0005_integrations.up.sql    # integration_credentials
├── 0005_integrations.down.sql
└── ...
```

---

## Cache — Redis

| Chave Pattern                          | TTL    | Uso                                    |
|---------------------------------------|--------|----------------------------------------|
| `avail:{event_type_id}:{date}`        | 15 min | Slots de disponibilidade calculados     |
| `rate:{ip}:{endpoint}`                | 1 min  | Rate limiting por IP                    |
| `rate:{org_id}:{endpoint}`            | 1 min  | Rate limiting por organizacao           |
| `session:{user_id}`                   | 24h    | Dados de sessao (refresh token ref)     |
| `form_cache:{form_id}:{version}`      | 1h     | Form definition pra embed (public)      |

**Invalidacao:**
- Availability: invalidado quando booking e criado/cancelado ou regra de disponibilidade muda
- Form cache: invalidado quando form e publicado (nova versao)
- Rate limit: TTL natural, sem invalidacao manual

---

## Auth — JWT httpOnly + CSRF

Conforme **ADR-004**, identico ao pattern do Torque-v2:

```
Login Request
     │
     ▼
┌──────────┐
│  Verify   │  bcrypt compare
│ Password  │
└────┬─────┘
     │
     ▼
┌──────────┐
│ Generate  │  Access token (15min) + Refresh token (7d)
│   JWT     │
└────┬─────┘
     │
     ▼
┌──────────┐
│ Set Cookie│  httpOnly, Secure, SameSite=Lax, Path=/
│ + CSRF    │  CSRF token em header X-CSRF-Token (double-submit)
└──────────┘
```

**Access token claims:**
```json
{
  "sub": "user_uuid",
  "org": "organization_uuid",
  "role": "admin|member|master",
  "exp": 1234567890
}
```

**Refresh flow:** POST `/api/v1/auth/refresh` — rotaciona ambos tokens. Refresh token vinculado a sessao no Redis.

---

## Multi-tenancy — 3 Camadas

| Camada     | Onde          | O Que Faz                                              |
|-----------|---------------|--------------------------------------------------------|
| JWT       | Token         | `org` claim identifica a organizacao                   |
| Middleware| Go middleware | Extrai `org` do JWT, seta `app.current_org` na conexao |
| RLS       | PostgreSQL    | Policy filtra automaticamente por `organization_id`    |

Mesmo que um bug no codigo esqueca um `WHERE organization_id = ?`, o RLS garante que dados nao vazam. Defense in depth.

---

## API Contract

- **Spec:** OpenAPI 3.1 (arquivo `apps/api/api/openapi.yaml`)
- **Wire format:** snake_case JSON (`organization_id`, `created_at`)
- **Frontend:** camelCase TypeScript (`organizationId`, `createdAt`)
- **Transformacao:** Bidirecional na camada `apps/web/src/api/`
- **Geracao de tipos:** `openapi-typescript` gera tipos TS do spec
- **Versionamento:** `/api/v1/` — breaking changes incrementam major

---

## ADRs Referenciados

| ADR   | Titulo                                    | Status    |
|-------|------------------------------------------|-----------|
| ADR-001 | Backend Go, nao Supabase               | Aceito    |
| ADR-002 | Flow definition em JSONB               | Aceito    |
| ADR-003 | Embed via iframe, nao Web Component    | Aceito    |
| ADR-004 | Auth JWT httpOnly + CSRF double-submit | Aceito    |
