# TypeCall — Estrutura do Projeto

**Ultima atualizacao:** 2026-05-05

---

## Arvore Completa

```
TypeCall/
│
├── apps/
│   ├── api/                           # Go backend
│   │   ├── cmd/
│   │   │   └── api/
│   │   │       └── main.go            # HTTP entrypoint — bootstrap server, DI, graceful shutdown
│   │   │
│   │   ├── internal/
│   │   │   ├── config/                # Env vars loading (Viper ou envconfig)
│   │   │   │   └── config.go          # Struct com todas env vars tipadas
│   │   │   │
│   │   │   ├── db/                    # pgx pool wrapper
│   │   │   │   ├── pool.go            # Inicializacao do pool pgx com config
│   │   │   │   └── tx.go              # Transaction helper (WithTx pattern)
│   │   │   │
│   │   │   ├── domain/                # Core entities (Go structs puros)
│   │   │   │   ├── organization.go    # Organization entity
│   │   │   │   ├── user.go            # User entity + Role enum
│   │   │   │   ├── form.go            # Form + FormVersion entities
│   │   │   │   ├── response.go        # Response + ResponseAnswer entities
│   │   │   │   ├── event_type.go      # EventType entity
│   │   │   │   ├── availability.go    # AvailabilityRule + Override entities
│   │   │   │   ├── booking.go         # Booking entity + Status enum
│   │   │   │   ├── integration.go     # IntegrationCredential entity
│   │   │   │   └── webhook.go         # WebhookEndpoint + Delivery entities
│   │   │   │
│   │   │   ├── handler/               # HTTP handlers — um arquivo por dominio
│   │   │   │   ├── auth_handler.go    # POST /auth/login, /auth/register, /auth/refresh, /auth/logout
│   │   │   │   ├── form_handler.go    # CRUD /forms, POST /forms/:id/publish
│   │   │   │   ├── response_handler.go# GET /responses, GET /responses/:id, POST /p/:slug/respond
│   │   │   │   ├── event_type_handler.go # CRUD /event-types
│   │   │   │   ├── availability_handler.go # CRUD /availability, /overrides
│   │   │   │   ├── booking_handler.go # POST /bookings, PATCH /bookings/:id/cancel|reschedule
│   │   │   │   ├── integration_handler.go # GET /integrations, POST /integrations/google/connect
│   │   │   │   ├── analytics_handler.go # GET /analytics/forms/:id, /analytics/bookings
│   │   │   │   ├── webhook_handler.go # CRUD /webhooks, POST /webhooks/:id/redeliver
│   │   │   │   ├── org_handler.go     # GET/PATCH /org, GET /org/members
│   │   │   │   ├── upload_handler.go  # POST /uploads/presign, complete upload
│   │   │   │   └── public_handler.go  # GET /p/:slug (form public), GET /p/:slug/slots (availability)
│   │   │   │
│   │   │   ├── service/               # Business logic — um arquivo por dominio
│   │   │   │   ├── auth_service.go    # Login, registro, refresh, password hashing
│   │   │   │   ├── form_service.go    # Criacao, edicao, publicacao, versionamento de forms
│   │   │   │   ├── response_service.go# Submissao de respostas, validacao de steps
│   │   │   │   ├── event_type_service.go # CRUD de event types com validacao
│   │   │   │   ├── availability_service.go # Calculo de slots disponiveis (goroutines)
│   │   │   │   ├── booking_service.go # Criacao com double-check de conflito, cancel, reschedule
│   │   │   │   ├── integration_service.go # OAuth token management, refresh, sync
│   │   │   │   ├── analytics_service.go # Agregacao de metricas, funnel calc
│   │   │   │   ├── webhook_service.go # Dispatch de eventos, retry logic
│   │   │   │   └── upload_service.go  # Presigned URL generation, validation
│   │   │   │
│   │   │   ├── repository/            # Postgres data access (pgx queries)
│   │   │   │   ├── organization_repository.go
│   │   │   │   ├── user_repository.go
│   │   │   │   ├── form_repository.go
│   │   │   │   ├── response_repository.go
│   │   │   │   ├── event_type_repository.go
│   │   │   │   ├── availability_repository.go
│   │   │   │   ├── booking_repository.go
│   │   │   │   ├── integration_repository.go
│   │   │   │   ├── analytics_repository.go
│   │   │   │   ├── webhook_repository.go
│   │   │   │   ├── audit_repository.go
│   │   │   │   └── upload_repository.go
│   │   │   │
│   │   │   ├── integration/           # External service wrappers
│   │   │   │   ├── google_calendar.go # Google Calendar API v3 client
│   │   │   │   ├── resend.go          # Resend email API client
│   │   │   │   ├── asaas.go           # Asaas payments API client
│   │   │   │   └── s3.go             # S3-compatible storage client
│   │   │   │
│   │   │   ├── middleware/            # HTTP middleware chain
│   │   │   │   ├── auth.go           # JWT validation, claims extraction
│   │   │   │   ├── tenant.go         # Set app.current_org na conexao pgx
│   │   │   │   ├── csrf.go           # Double-submit CSRF validation
│   │   │   │   ├── ratelimit.go      # Redis-backed rate limiting (IP + org)
│   │   │   │   ├── requestid.go      # X-Request-ID generation/propagation
│   │   │   │   ├── logger.go         # Request/response logging (zerolog)
│   │   │   │   ├── cors.go           # CORS headers configuration
│   │   │   │   └── recover.go        # Panic recovery + Sentry capture
│   │   │   │
│   │   │   ├── event/                # In-process pub/sub bus
│   │   │   │   ├── bus.go            # Event bus interface + implementation (Go channels)
│   │   │   │   ├── types.go          # Event type definitions
│   │   │   │   └── subscriber.go     # Subscriber registration + fan-out
│   │   │   │
│   │   │   ├── ws/                   # WebSocket hub
│   │   │   │   ├── hub.go           # Tenant-scoped connection manager
│   │   │   │   ├── client.go        # Per-connection read/write goroutines
│   │   │   │   └── message.go       # Message types + serialization
│   │   │   │
│   │   │   ├── worker/              # Async job pool
│   │   │   │   ├── pool.go          # Goroutine pool com semaphore + graceful shutdown
│   │   │   │   ├── email_worker.go   # Confirmacoes, lembretes, notificacoes
│   │   │   │   ├── calendar_worker.go# Sync com Google Calendar
│   │   │   │   ├── webhook_worker.go # Dispatch + retry com exponential backoff
│   │   │   │   └── reminder_worker.go# Notificacoes pre-reuniao agendadas
│   │   │   │
│   │   │   └── observability/        # Instrumentacao
│   │   │       ├── sentry.go        # Sentry SDK init + middleware
│   │   │       ├── otel.go          # OpenTelemetry tracer + exporter setup
│   │   │       └── logger.go        # zerolog global config + request logger
│   │   │
│   │   ├── api/
│   │   │   └── openapi.yaml          # OpenAPI 3.1 spec (source of truth)
│   │   │
│   │   ├── migrations/               # SQL migrations (golang-migrate)
│   │   │   ├── 0001_foundation.up.sql
│   │   │   ├── 0001_foundation.down.sql
│   │   │   ├── 0002_forms.up.sql
│   │   │   ├── 0002_forms.down.sql
│   │   │   ├── 0003_responses.up.sql
│   │   │   ├── 0003_responses.down.sql
│   │   │   ├── 0004_scheduling.up.sql
│   │   │   ├── 0004_scheduling.down.sql
│   │   │   ├── 0005_integrations.up.sql
│   │   │   ├── 0005_integrations.down.sql
│   │   │   ├── 0006_analytics.up.sql
│   │   │   ├── 0006_analytics.down.sql
│   │   │   ├── 0007_billing.up.sql
│   │   │   ├── 0007_billing.down.sql
│   │   │   ├── 0008_webhooks.up.sql
│   │   │   └── 0008_webhooks.down.sql
│   │   │
│   │   ├── go.mod
│   │   ├── go.sum
│   │   └── Dockerfile                # Multi-stage: build → distroless runtime
│   │
│   ├── web/                           # Dashboard SPA
│   │   ├── public/
│   │   │   └── favicon.svg
│   │   │
│   │   └── src/
│   │       ├── main.tsx               # React entrypoint
│   │       ├── App.tsx                # Router setup (React Router)
│   │       │
│   │       ├── features/              # Feature-first pages
│   │       │   ├── auth/              # Login, registro, forgot password, reset
│   │       │   │   ├── LoginPage.tsx
│   │       │   │   ├── RegisterPage.tsx
│   │       │   │   └── components/    # Auth-specific components
│   │       │   │
│   │       │   ├── dashboard/         # Overview, metricas rapidas, recent activity
│   │       │   │   └── DashboardPage.tsx
│   │       │   │
│   │       │   ├── forms/             # Form list, form builder, form settings
│   │       │   │   ├── FormListPage.tsx
│   │       │   │   ├── FormBuilderPage.tsx
│   │       │   │   ├── FormSettingsPage.tsx
│   │       │   │   └── components/    # StepEditor, FlowCanvas, StepPalette, etc.
│   │       │   │
│   │       │   ├── responses/         # Response viewer, individual response, export
│   │       │   │   ├── ResponseListPage.tsx
│   │       │   │   ├── ResponseDetailPage.tsx
│   │       │   │   └── components/    # ResponseTable, AnswerViewer, FunnelChart
│   │       │   │
│   │       │   ├── scheduling/        # Event types, availability config, booking list
│   │       │   │   ├── EventTypeListPage.tsx
│   │       │   │   ├── EventTypeEditorPage.tsx
│   │       │   │   ├── AvailabilityPage.tsx
│   │       │   │   ├── BookingListPage.tsx
│   │       │   │   └── components/    # WeeklySchedule, SlotGrid, BookingCard
│   │       │   │
│   │       │   ├── integrations/      # Calendar connections, webhook config
│   │       │   │   ├── IntegrationsPage.tsx
│   │       │   │   ├── WebhookListPage.tsx
│   │       │   │   └── components/    # CalendarConnectionCard, WebhookEditor
│   │       │   │
│   │       │   └── settings/          # Org settings, billing, team management
│   │       │       ├── OrgSettingsPage.tsx
│   │       │       ├── BillingPage.tsx
│   │       │       ├── TeamPage.tsx
│   │       │       └── components/    # PlanCard, MemberList, InviteForm
│   │       │
│   │       ├── components/
│   │       │   └── ui/               # shadcn/ui primitives (copiados, nao importados)
│   │       │       ├── button.tsx
│   │       │       ├── dialog.tsx
│   │       │       ├── dropdown-menu.tsx
│   │       │       ├── input.tsx
│   │       │       ├── select.tsx
│   │       │       ├── table.tsx
│   │       │       ├── toast.tsx
│   │       │       └── ...           # Demais componentes shadcn conforme necessidade
│   │       │
│   │       ├── api/                  # Typed API client
│   │       │   ├── client.ts         # Fetch wrapper com auth, CSRF, snake/camel transform
│   │       │   ├── types.ts          # Gerado via openapi-typescript
│   │       │   └── endpoints/        # Funcoes por dominio (getForms, createBooking, etc.)
│   │       │
│   │       ├── hooks/                # TanStack Query hooks
│   │       │   ├── useFormQuery.ts
│   │       │   ├── useFormsQuery.ts
│   │       │   ├── useCreateFormMutation.ts
│   │       │   ├── useBookingsQuery.ts
│   │       │   ├── useCreateBookingMutation.ts
│   │       │   ├── useAvailableSlotsQuery.ts
│   │       │   ├── useResponsesQuery.ts
│   │       │   ├── useAuthMutation.ts
│   │       │   └── ...               # Um hook por operacao
│   │       │
│   │       ├── lib/                  # Utilities
│   │       │   ├── cn.ts            # clsx + tailwind-merge
│   │       │   ├── date.ts          # date-fns helpers, timezone formatting
│   │       │   ├── constants.ts     # App-wide constants
│   │       │   └── validators.ts    # Zod schemas compartilhados
│   │       │
│   │       └── styles/
│   │           └── globals.css       # Tailwind base + HSL design tokens + dark/light vars
│   │
│   └── embed/                         # Widget embedavel
│       ├── public/
│       │   └── runner.html            # HTML minimo pra iframe
│       │
│       └── src/
│           ├── loader.ts              # IIFE entry (<3KB gzip) — injeta iframe no host
│           │
│           ├── runner/                # App React minimo dentro do iframe
│           │   ├── RunnerApp.tsx      # Entrypoint do runner
│           │   ├── ConversationalRenderer.tsx  # Renderiza steps um a um
│           │   ├── StepRenderer.tsx    # Renderiza step individual por tipo
│           │   └── components/        # Input types: text, email, phone, select, rating, etc.
│           │
│           └── messenger.ts           # postMessage bridge (host <-> iframe)
│
├── packages/
│   ├── flow-engine/                   # Logica de fluxo compartilhada (TypeScript puro)
│   │   ├── src/
│   │   │   ├── index.ts              # Public API exports
│   │   │   ├── engine.ts            # Flow execution engine (next step, conditions)
│   │   │   ├── validator.ts         # Flow definition validation
│   │   │   ├── types.ts             # FlowDefinition, Step, Condition, Edge types
│   │   │   └── conditions.ts        # Conditional logic evaluator
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                        # Tipos e constantes compartilhadas
│       ├── src/
│       │   ├── index.ts              # Public API exports
│       │   ├── constants.ts          # Shared constants (step types, status enums)
│       │   └── types.ts              # Shared TypeScript types
│       ├── package.json
│       └── tsconfig.json
│
├── TypeCall-dir/                      # Obsidian vault (documentacao)
│   ├── 01 - Produto/                 # Visao do produto, personas, features
│   ├── 02 - Engenharia/             # ADRs, specs tecnicas
│   ├── 03 - Design/                 # Design tokens, UI specs
│   ├── 10 - Operacional/            # Workflows, schemas, checklists
│   └── 99 - Templates/              # Templates de ADR, feature spec, etc.
│
├── .specs/                            # Specs operacionais (lidas por agentes)
│   ├── project/                      # PROJECT.md, STATE.md
│   └── codebase/                     # ARCHITECTURE.md, STACK.md, CONVENTIONS.md, STRUCTURE.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint + test + build on PR
│       └── deploy.yml                # Build + push Docker + deploy EasyPanel
│
├── docker-compose.yml                 # Dev: Postgres 15 + Redis 7 + API hot-reload
├── pnpm-workspace.yaml                # Monorepo workspace config
├── turbo.json                         # Turborepo task pipeline
├── CLAUDE.md                          # Instrucoes para agentes AI
└── ARCHITECTURE.md                    # Pointer para .specs/codebase/ARCHITECTURE.md
```

---

## Descricao dos Dominios por Camada

### Handler Layer (`internal/handler/`)

| Arquivo                    | Dominio         | Endpoints Principais                                    |
|---------------------------|-----------------|--------------------------------------------------------|
| `auth_handler.go`         | Autenticacao    | login, register, refresh, logout, me                    |
| `form_handler.go`         | Formularios     | CRUD forms, publish, duplicate, archive                 |
| `response_handler.go`     | Respostas       | list responses, get detail, export CSV, public submit   |
| `event_type_handler.go`   | Agendamento     | CRUD event types, toggle active                         |
| `availability_handler.go` | Disponibilidade | CRUD rules, CRUD overrides, get available slots         |
| `booking_handler.go`      | Agendamentos    | create booking, cancel, reschedule, confirm, no-show    |
| `integration_handler.go`  | Integracoes     | OAuth connect/disconnect Google/Outlook, sync status    |
| `analytics_handler.go`    | Analytics       | form funnel, completion rate, booking conversion        |
| `webhook_handler.go`      | Webhooks        | CRUD endpoints, test, redeliver, delivery history       |
| `org_handler.go`          | Organizacao     | update org settings, list/invite/remove members         |
| `upload_handler.go`       | Uploads         | presign URL, confirm upload, list uploads               |
| `public_handler.go`       | Publico         | form view (sem auth), slot check, SSE events            |

### Service Layer (`internal/service/`)

| Arquivo                      | Responsabilidade                                                              |
|-----------------------------|-------------------------------------------------------------------------------|
| `auth_service.go`           | Hashing bcrypt, geracao JWT, refresh token rotation, sessao Redis             |
| `form_service.go`           | Validacao de flow definition, versionamento, publicacao, slug generation      |
| `response_service.go`       | Validacao de respostas por step type, parcial save, completion logic          |
| `event_type_service.go`     | Validacao de configuracao, buffer calc, max bookings per day                  |
| `availability_service.go`   | Calculo de slots com goroutines, merge rules + overrides + bookings existentes|
| `booking_service.go`        | Double-check de conflito (SELECT FOR UPDATE), token generation, notifications |
| `integration_service.go`    | OAuth2 flow, token refresh, credential encryption/decryption                  |
| `analytics_service.go`      | Agregacao de metricas, funnel calculation, period comparison                  |
| `webhook_service.go`        | Event matching, payload build, dispatch via worker, HMAC signing              |
| `upload_service.go`         | Presigned URL generation, MIME validation, size limits                        |

### Repository Layer (`internal/repository/`)

| Arquivo                          | Tabelas Acessadas                                         |
|---------------------------------|----------------------------------------------------------|
| `organization_repository.go`    | `organizations`                                           |
| `user_repository.go`            | `users`                                                   |
| `form_repository.go`            | `forms`, `form_versions`                                  |
| `response_repository.go`        | `responses`, `response_answers`                           |
| `event_type_repository.go`      | `event_types`                                             |
| `availability_repository.go`    | `availability_rules`, `availability_overrides`            |
| `booking_repository.go`         | `bookings`                                                |
| `integration_repository.go`     | `integration_credentials`                                 |
| `analytics_repository.go`       | `response_events` (read-only aggregations)                |
| `webhook_repository.go`         | `webhook_endpoints`, `webhook_deliveries`                 |
| `audit_repository.go`           | `audit_logs` (append-only)                                |
| `upload_repository.go`          | `file_uploads`                                            |
