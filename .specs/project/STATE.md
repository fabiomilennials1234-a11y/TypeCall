# Project State

**Last updated:** 2026-05-06

---

## Decisions

### D001: Stack definida — Go backend, nao Supabase (2026-05-05)

TypeCall seguira stack Go (identica Torque-v2). Supabase descartado por lock-in, cold start em Edge Functions, e limitacao de RLS pra auth complexa. Scheduling engine requer goroutines pra availability calc.

Detalhes em [[ADR-001-backend-go-nao-supabase]]

### D002: Flow definition em JSONB (2026-05-05)

Formularios armazenados como JSONB em form_versions. Versionamento trivial, compatibilidade nativa com xyflow.

Detalhes em [[ADR-002-flow-definition-jsonb]]

### D003: Embed via iframe (2026-05-05)

Widget embedavel usa iframe + JS SDK loader. Isolamento sandbox, compatibilidade CSP.

Detalhes em [[ADR-003-embed-iframe-nao-web-component]]

### D004: Auth JWT httpOnly (2026-05-05)

Mesmo pattern do Torque-v2 ADR-003. JWT em httpOnly cookies + CSRF double-submit.

Detalhes em [[ADR-004-auth-jwt-httponly]]

### D005: Refresh tokens em Postgres, nao Redis (2026-05-05)

Refresh tokens armazenados em tabela `refresh_tokens` no Postgres. Auditabilidade e persistencia > velocidade. Operacoes de refresh sao baixa frequencia (~1 por 15min por usuario ativo). Redis fica para availability slots e rate limiting.

### D006: JWT HS256 por agora, RS256 quando SSO (2026-05-05)

Monolito Go — unico servico emite e valida tokens. HS256 suficiente. RS256 so faz sentido quando servicos diferentes precisam verificar sem compartilhar secret (SSO com Torque, v2.0). Migracao HS256 → RS256 e trivial.

### D007: SameSite=Lax, nao Strict (2026-05-05)

ADR-004 prevalece sobre vault. Strict bloqueia cookie em navegacoes cross-origin (links de email → TypeCall = nao logado). Lax envia cookie em GET top-level mas bloqueia POST/iframe. Embed usa fluxo separado, sem impacto.

### D008: organizations e refresh_tokens sem RLS (2026-05-05)

organizations: acessada sem contexto de tenant (register cria org antes do JWT). refresh_tokens: lookup por token_hash antes de ter tenant context. Ambas protegidas via service layer com filtro explicito.

### D009: React 19 + Vite 8 + TS 6 strict (2026-05-05)

Frontend scaffold definido. React 19 (latest), Vite 8 com Rolldown, TypeScript 6 com erasableSyntaxOnly (proibe parameter properties). Tailwind 4 via @tailwindcss/vite plugin. shadcn/ui copiado, nao importado.

### D010: Dark-first design com HSL tokens (2026-05-05)

:root = dark mode (default). .light class para modo claro. Cores via CSS custom properties HSL. Primary purple 263 70% 58%. Sidebar tokens separados (sidebar, sidebar-foreground). Inter como fonte primaria.

### D011: Auth flow frontend — ProtectedRoute + PublicRoute (2026-05-05)

ProtectedRoute usa useMeQuery via AuthContext. Se loading → spinner. Se erro → redirect /login. PublicRoute inverte: se autenticado → redirect /. Logout via window.location.href (full reload limpo).

### D012: API client com snake/camel transform + auto-refresh (2026-05-05)

Fetch wrapper transforma keys: camelCase (TS) ↔ snake_case (wire). Auto-refresh em 401 com dedup (isRefreshing flag). CSRF double-submit via cookie → header. ApiError class com status/code/message.

### D013: Draft em forms.draft_definition JSONB (2026-05-05)

Draft do flow fica na row do form. Publish copia draft_definition → nova form_version.flow_definition. PostgreSQL TOAST comprime JSONB >2KB. Na listagem, NAO retornar draft_definition (payload grande).

### D014: Sem tabela questions — ADR-002 prevalece (2026-05-05)

Questions vivem como nodes no flow_definition JSONB. Tabela questions da spec Fase 2 descartada — violaria ADR-002 e criaria dual source of truth.

### D015: Soft delete em forms (2026-05-05)

deleted_at TIMESTAMPTZ nullable. Partial unique index no slug (WHERE deleted_at IS NULL). Soft delete preserva responses associadas.

### D016: Tenant middleware TX-per-request (2026-05-05)

Bug critico corrigido: SET LOCAL era em conexao separada das queries (RLS nunca ativava). Fix: middleware inicia TX, faz set_config parametrizado, injeta TX no context via db.WithTxCtx. Repositories usam db.Conn(ctx, pool) que retorna TX do context ou fallback pro pool.

### D017: Flow engine como TS package puro (2026-05-06)

packages/flow-engine contem types, traverser, evaluator e validator. Shared entre builder (apps/web) e runner (apps/embed). FlowDefinition usa `nodes[]` + `edges[]`. 18 step types definidos. Condition evaluator com 14 operadores. Validator detecta ciclos via DFS colorido e verifica alcancabilidade via BFS.

### D018: Builder linear-first, branching visual depois (2026-05-06)

Sprint 4 builder usa lista sortable (@dnd-kit). Edges auto-geradas da ordem dos nodes (linear). Branching condicional existe no flow-engine (evaluator) mas o builder visual de grafo (xyflow) fica pra Sprint futura. Suficiente pra MVP — 90%+ dos forms sao lineares.

### D019: Flow-engine via path alias, nao npm link (2026-05-06)

apps/web consome packages/flow-engine via tsconfig paths + vite resolve alias apontando direto pra source (.ts). Sem build step intermediario durante dev. Vite transpila on-the-fly. Build de producao inclui no bundle.

### D020: Public endpoints sem RLS — PublicFormRepository usa pool direto (2026-05-06)

Endpoints /public/forms/{slug} nao passam por tenant middleware (sem JWT). PublicFormRepository faz query direta no pool (sem TX/set_config). JOIN forms+form_versions filtra por slug + status=published + deleted_at IS NULL. Seguro: retorna apenas dados publicados, sem acesso a drafts ou dados de org.

### D021: Response storage com node_id, nao question_id (2026-05-06)

response_answers referencia `node_id TEXT` (ID do node no FlowDefinition JSONB), nao FK pra tabela questions (que nao existe — ADR-002/D014). Unique index (response_id, node_id) previne duplicatas. Answers armazenados como JSONB pra flexibilidade de tipo.

### D022: Form Runner no mesmo SPA, rota /f/{slug} (2026-05-06)

Runner vive em apps/web como rota publica /f/{slug}. Sem auth. Mesma build, bundle split futuro via lazy loading. Quando embed existir (apps/embed), runner sera extraido. Por ora, single SPA simplifica deploy.

### D023: Scheduling engine sem Google Calendar (2026-05-06)

Slot calculation engine opera 100% a partir de availability_rules + overrides + bookings existentes. Sem dependencia de GCal freeBusy. Tabela integration_credentials criada mas nao usada — reservada pra futuro. Decisao do fundador: integracao com agenda sera exclusivamente via webhook push pro Torque CRM.

### D024: Booking status default = confirmed (2026-05-06)

Sem GCal async flow, bookings sao confirmados imediatamente. Status `pending` existe na enum mas nao e usado no fluxo atual. Simplifica UX: respondente ve confirmacao instantanea.

### D025: Webhook push pro Torque CRM com HMAC-SHA256 (2026-05-06)

Integracao com Torque CRM via webhook HTTP POST, nao polling. Payload TorqueWebhookPayload compativel com endpoint lead-webhook existente do Torque. Assinatura HMAC-SHA256 no header X-TypeCall-Signature. Retry exponencial: 5 tentativas (0s, 5s, 30s, 2min, 10min). Dead letter queue apos max retries. Dispatch assincrono via goroutine (nao bloqueia booking creation).

### D026: Schedule step = inline booking no runner (2026-05-06)

THE FUSION. Step type `schedule` no flow-engine renderiza calendario completo inline: selecao de data → slots → confirmacao com nome/email (prefilled de steps anteriores). Booking criado via /public/bookings, booking_id armazenado como answer do step. Runner avanca automaticamente apos confirmacao.

### D027: Embed responder usa React (66KB gz), Preact swap reservado (2026-05-06)

Responder build com React: 66KB gz (budget era 50KB). Aceitavel pra MVP. loader.js: 1.26KB gz (budget 3KB). Se bundle size se tornar blocker, swap React → Preact (API-compatible, ~3KB) e viavel sem rewrite.

### D028: Embed auto-init via data attributes (2026-05-06)

loader.js detecta `[data-typecall-form]` no DOM e inicializa automaticamente. API programatica via `window.TypeCall.createWidget()` / `openPopup()` / `openSlider()`. postMessage bridge com origin validation e prefixo `typecall:`.

### D029: Analytics event tracking fire-and-forget (2026-05-06)

Eventos de analytics (view, start, question_seen, question_answered, submit, abandon) coletados no frontend (runner + embed) e enviados em batch pro /api/v1/public/events (publico, sem auth). Dedup via event_id (UUID) com ON CONFLICT DO NOTHING. Batch size 5 ou flush a cada 2s. Abandon usa navigator.sendBeacon pra garantir envio no beforeunload. Materialized view form_daily_metrics atualizada via REFRESH CONCURRENTLY.

### D030: Tela /bookings com toggle Lista | Agenda (2026-05-07)

Tela de Reunioes ganha duas visoes alternaveis:
- **Lista**: cards verticais ordenados por proximidade (futuras asc primeiro, passadas desc no fim). Botao "Acessar" decorativo por reuniao (sem acao por enquanto, reservado para feature futura de sala/portal).
- **Agenda**: grid mensal estilo Google Calendar (7 colunas Dom-Sab, ate 3 chips por dia + overflow), navegacao prev/next mes. Click em chip abre `BookingDetailDialog` (reusa cancelMutation).

Duas queries TanStack distintas: `['bookings','list']` (limit 100) e `['bookings','calendar', monthKey]` (from/to do mes, limit 200). cancelMutation invalida ambas. Helpers de data via Date API nativa (sem date-fns) em `features/scheduling/lib/bookings.ts` com 22 testes vitest.

---

## Blockers

Nenhum no momento.

---

## Lessons

- TS 6 `erasableSyntaxOnly` bloqueia `public` em constructor params. Declarar propriedades explicitamente.
- `baseUrl` deprecado no TS 6. Usar `paths` sem `baseUrl`.
- SET LOCAL so funciona dentro de TX. Sem TX, setting nao persiste pra queries subsequentes em connections pooled.
- PostgreSQL SET nao suporta bind params ($1). Usar `SELECT set_config('name', $1, true)` pra parametrizar.

---

## Todos

- [x] Iniciar Fase 1: Foundation (Go skeleton + React scaffold) — Sprint 1 completa
- [x] Configurar CI/CD GitHub Actions — backend-ci + frontend-ci
- [x] Setup Docker compose dev environment
- [x] Definir design tokens especificos do TypeCall (cores, tipografia) — HSL dark-first
- [x] Configurar PostgreSQL com RLS habilitado — migration 0001
- [x] Setup Redis para cache de availability slots — docker-compose
- [x] Implementar auth flow (login, registro, JWT refresh) — auth_service.go
- [x] Criar migration 0001_foundation.up.sql — organizations, users, refresh_tokens
- [x] Frontend shell — scaffold, auth pages, app shell, protected routes
- [x] Form CRUD API — migration 0002, handler, service, repository
- [x] Form CRUD frontend — listagem, criacao, detalhe, publicacao
- [x] Fix tenant middleware — TX-per-request com set_config
- [x] Sprint 4: Visual builder — flow-engine, @dnd-kit canvas, block palette, property panel, preview, auto-save
- [x] Sprint 5: Form runner + response storage — migration 0003, public/admin endpoints, runner UI, responses admin
- [x] Sprint 6: Scheduling engine — migration 0004 (event_types, availability, bookings), CRUD API + frontend, slot calculation engine (7 etapas), booking creation com conflict prevention, schedule step no builder e runner (THE FUSION)
- [x] Sprint 6b: Webhook Torque CRM — migration 0005 (webhook_configs, webhook_deliveries), HMAC-SHA256 dispatch, retry exponencial, dead letter queue, admin UI pra config e delivery history
- [x] Sprint 7: Embed — apps/embed (responder 66KB gz), loader.js IIFE (1.26KB gz), postMessage bridge, 4 modos (inline/popup/slider/fullpage), embed code generator no dashboard
- [x] Sprint 8: Analytics — migration 0006 (response_events, form_daily_metrics materialized view), event ingestion API (public), summary/daily/dropoff/export endpoints, dashboard com metric cards + bar chart + drop-off funnel, event tracking no runner + embed (batch + sendBeacon)
- [x] Sprint 9: Hardening
  - [x] 9.1 Quick wins: CORS env-aware, security headers, body size limit, error boundary
  - [x] 9.2 Input validation em todos handlers Go
  - [x] 9.3 Testes backend: 47 unit tests (auth, form, booking, webhook, analytics, availability) + 15 mocks manuais
  - [x] 9.4 Testes frontend: 14 vitest tests (useAuth, useForms hooks, ErrorBoundary)
  - [x] 9.5 OpenAPI 3.1 spec: apps/api/api/openapi.yaml (45 endpoints)
  - [x] 9.6 Infra producao: docker-compose.prod.yml, Dockerfile Go 1.25 + web Dockerfile + nginx, .env.example
  - [x] 9.7 Observabilidade: /metrics endpoint (uptime, goroutines, heap, request/error counters), zerolog structured logging
  - [x] 9.8 Polish: error states em 10 pages, PT-BR accents fix, index.html meta/OG tags
- [ ] Sprint 10: Validacao Local E2E
  - [ ] Auto-migration on boot (embed.FS + schema_migrations table)
  - [ ] docker-compose.yml com API service integrado
  - [ ] Smoke test script (scripts/smoke-test.sh) — 25+ endpoint checks
  - [ ] Seed script (scripts/seed.sh) — org + 3 forms + 2 event types + 5 responses + analytics
  - [ ] Validation checklist manual (scripts/VALIDATION_CHECKLIST.md)
