---
title: "MVP Completion Checklist"
tags: [backlog, mvp, hardening, checklist]
created: 2026-05-06
status: active
type: checklist
---

# MVP Completion Checklist

> **Fonte de verdade para levar o TypeCall de "feature-complete" a "production-ready".**
> Atualizar checkboxes conforme cada item for entregue. Cada item tem criterio de aceitacao claro.

---

## Status Geral

| Camada | Status | Progresso |
|--------|--------|-----------|
| Features (Fases 1-5) | Completo | 8/8 sprints entregues |
| Seguranca | Parcial | CORS, headers, input validation pendentes |
| Testes | Critico | 0 testes em todo codebase |
| Observabilidade | Parcial | Logger existe, Sentry ausente |
| Infraestrutura | Parcial | Dockerfile existe, prod compose ausente |
| Documentacao API | Ausente | OpenAPI spec nao existe |
| Deploy | Ausente | Nenhum deploy realizado |

---

## Sprint 9 — Hardening (Estimativa: 2 semanas)

### 9.1 Quick Wins (Dia 1)

Itens que desbloqueiam seguranca basica. Todos < 2h de trabalho.

- [ ] **CORS env-aware** — Ler allowed origins de env var `CORS_ORIGINS` (comma-separated). Remover hardcode `localhost:5173`.
  - Arquivo: `apps/api/internal/middleware/cors.go`
  - Criterio: `CORS_ORIGINS=https://app.typecall.com.br` funciona em producao
  - Fallback: `localhost:5173,localhost:3000` quando `ENV=development`

- [ ] **Security headers middleware** — HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
  - Arquivo: criar `apps/api/internal/middleware/security.go`
  - Registrar no middleware stack em `main.go` (antes do CORS)
  - Spec: seguir [[Autenticacao e Seguranca#Headers de Seguranca]]
  - Runner/embed: `frame-ancestors *` (permitir embed). Dashboard: `frame-ancestors 'self'`

- [ ] **Request body size limit** — `http.MaxBytesReader` em handlers que aceitam body.
  - Default: 1MB para JSON endpoints
  - File upload (futuro): 10MB
  - Retornar 413 Payload Too Large quando excedido

- [ ] **React Error Boundary** — Componente global que captura erros de renderizacao.
  - Arquivo: criar `apps/web/src/components/ErrorBoundary.tsx`
  - Wrap `<AppLayout>` com ErrorBoundary
  - UI: tela de erro com botao "Recarregar" (nao tela branca)

- [ ] **404 page** — Pagina para rotas nao encontradas no frontend.
  - Substituir `<Navigate to="/" replace />` por pagina 404 dedicada

---

### 9.2 Input Validation (Dia 2-3)

Handlers confiam cegamente no body. Validacao precisa existir em toda mutation.

- [ ] **Go validation structs** — Definir structs de input com validacao pra cada handler.
  - Opcao A: `go-playground/validator` com struct tags
  - Opcao B: validacao manual no inicio do handler (pattern atual, mas sistematico)
  - Decisao: Dev Senior opina

- [ ] **Handlers a validar** (lista completa de mutations):
  - [ ] `POST /auth/register` — email format, password min length, org name required
  - [ ] `POST /auth/login` — email + password required
  - [ ] `POST /forms` — title required, max 200 chars
  - [ ] `PATCH /forms/{id}` — title max 200 chars se presente
  - [ ] `PATCH /forms/{id}/draft` — flowDefinition max 500KB
  - [ ] `POST /forms/{id}/publish` — draft_definition nao pode ser null/empty
  - [ ] `POST /event-types` — title required, duration_minutes > 0, slug format
  - [ ] `POST /event-types/{id}/availability-rules` — day_of_week 0-6, start < end
  - [ ] `POST /public/bookings` — attendee_name, attendee_email format, start_time futuro
  - [ ] `POST /public/forms/{slug}/responses` — answers array nao vazio
  - [ ] `POST /webhooks/config` — url format (https://), name required
  - [ ] `POST /public/events` — events array 1-10, event_type valido (ja validado no service)

- [ ] **Erro padrao de validacao** — Retornar 422 com corpo:
  ```json
  {
    "error": "validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "email", "message": "invalid email format" }
    ]
  }
  ```

---

### 9.3 Testes Backend (Dia 4-7)

Zero testes hoje. Priorizar por risco: auth > booking > analytics > CRUD.

#### Testes Unitarios (Go table-driven)

- [ ] **Auth service** — register, login, refresh, logout. Password hash. Token generation. Token validation. Expired token. Invalid credentials.
  - Arquivo: `apps/api/internal/service/auth_service_test.go`

- [ ] **Booking service** — create booking, conflict detection, slot validation, timezone handling.
  - Arquivo: `apps/api/internal/service/booking_service_test.go`
  - Casos criticos: double-booking prevention, slot em horario passado, buffer time

- [ ] **Availability service** — slot calculation engine. Regras semanais + overrides + bookings existentes.
  - Arquivo: `apps/api/internal/service/availability_service_test.go`
  - Casos: DST transitions, midnight boundary, override cancela regra, no availability

- [ ] **Analytics service** — ingest validation (event types, batch size), summary aggregation.
  - Arquivo: `apps/api/internal/service/analytics_service_test.go`

- [ ] **Webhook service** — HMAC signature generation, retry logic, dead letter transition.
  - Arquivo: `apps/api/internal/service/webhook_service_test.go`

- [ ] **Form service** — create, update, publish (version snapshot), soft delete.
  - Arquivo: `apps/api/internal/service/form_service_test.go`

#### Testes de Integracao (testcontainers + Postgres real)

- [ ] **Setup testcontainers** — Postgres 16 container com migrations aplicadas automaticamente.
  - Arquivo: `apps/api/internal/testutil/setup.go`

- [ ] **RLS isolation** — Tenant A nao ve dados de tenant B. Testar com 2 orgs em todas as tabelas de dominio.
  - Arquivo: `apps/api/internal/repository/rls_test.go`

- [ ] **Auth flow E2E** — Register → login → me → refresh → logout (HTTP handlers reais contra DB real).
  - Arquivo: `apps/api/internal/handler/auth_handler_test.go`

- [ ] **Booking atomico** — 2 goroutines tentam bookar mesmo slot simultaneamente. Uma ganha, outra recebe conflict.
  - Arquivo: `apps/api/internal/service/booking_concurrency_test.go`

#### Coverage target

- **Minimo**: 60% coverage nos packages `service/` e `repository/`
- **Ideal**: 80%+ nos services criticos (auth, booking, availability)

---

### 9.4 Testes Frontend (Dia 8-9)

- [ ] **Vitest setup** — Configurar vitest no apps/web com jsdom, Testing Library, MSW (Mock Service Worker).
  - Arquivo: `apps/web/vitest.config.ts`

- [ ] **Hooks tests** (vitest):
  - [ ] `useRunner` — init, navigation (next/previous), answer setting, completion detection
  - [ ] `useAuth` — login mutation, logout, token refresh
  - [ ] API client — snake/camel transform, CSRF injection, 401 retry

- [ ] **Component tests** (vitest + Testing Library):
  - [ ] `RunnerStep` — renderiza cada tipo de step, emite onChange
  - [ ] `ScheduleStep` — selecao de data e slot
  - [ ] `FormBuilder` — drag-and-drop node creation

- [ ] **Playwright E2E** — Golden path completo:
  - [ ] Register → login → create form → add questions → publish
  - [ ] Open public link → fill form → submit → check response in admin
  - [ ] Create event type → set availability → book via schedule step
  - Arquivo: `apps/web/e2e/golden-path.spec.ts`

---

### 9.5 OpenAPI Spec (Dia 10)

- [ ] **Criar `apps/api/api/openapi.yaml`** — OpenAPI 3.1
  - Documentar todos os endpoints existentes (auth, forms, event-types, bookings, webhooks, analytics, public)
  - Schemas para request/response bodies
  - Auth scheme: cookie-based JWT
  - Error response schema padronizado

- [ ] **Validacao** — `npx @redocly/cli lint openapi.yaml` green

- [ ] **Considerar**: middleware de validacao OpenAPI no Go (kin-openapi) pra garantir que spec e realidade coincidem

---

### 9.6 Infraestrutura de Producao (Dia 11-12)

- [ ] **docker-compose.prod.yml** — Stack de producao.
  - Postgres 16 com volume persistente, max_connections configurado
  - Redis 7 com persistence (AOF)
  - Go API (imagem distroless) com env vars de producao
  - Caddy ou Traefik como reverse proxy com TLS automatico
  - Network interna isolada

- [ ] **Variáveis de producao** — Documentar todas as env vars necessarias.
  - Arquivo: `apps/api/.env.production.example`
  - Incluir: DATABASE_URL (com SSL), REDIS_URL, JWT_SECRET (32+ chars, random), CSRF_SECRET, ENCRYPTION_KEY, CORS_ORIGINS, PORT, ENV=production

- [ ] **Go API Dockerfile refinado**:
  - Health check instruction no Dockerfile
  - Non-root user (distroless ja faz isso)
  - Build args pra version/commit hash

- [ ] **Frontend build** — Verificar que `pnpm build` gera bundle otimizado.
  - Analisar bundle size (vite-bundle-visualizer)
  - Verificar code splitting por rota
  - Confirmar que sourcemaps ficam separados (nao servidos em prod)

---

### 9.7 Observabilidade (Dia 13)

- [ ] **Sentry Go SDK** — Error tracking no backend.
  - PII scrubbing configurado (email, phone, cpf)
  - Panic recovery integrado com Sentry
  - Performance tracing (opcional, avaliar overhead)
  - Arquivo: `apps/api/internal/observability/sentry.go`

- [ ] **Sentry React SDK** — Error tracking no frontend.
  - ErrorBoundary do Sentry (substitui o criado em 9.1 ou wrapa ele)
  - Breadcrumbs de navegacao
  - Source maps uploaded no build

- [ ] **Logging review** — Adicionar logs nos pontos criticos que nao tem.
  - Service layer: log em erro paths (ja tem via fmt.Errorf, mas log.Error tambem)
  - Booking creation: log com form_id, event_type_id, attendee_email_hash
  - Webhook delivery: log cada tentativa com status code (ja existe)
  - Auth: log login failures (brute force detection)

- [ ] **Metricas basicas** — Endpoint `/metrics` com:
  - Request count por rota
  - Response time histograma
  - Active connections
  - Go runtime stats (goroutines, heap)
  - Opcao: Prometheus exporter ou custom JSON

---

### 9.8 Polish e Edge Cases (Dia 14)

- [ ] **Loading states** — Verificar que toda pagina tem loading state (spinner ou skeleton).
  - Dashboard, FormsPage, FormDetailPage, EventTypesPage, BookingsPage, WebhooksPage, AnalyticsPage, EmbedPage

- [ ] **Empty states** — Toda listagem vazia mostra mensagem util + CTA.
  - "Nenhum formulario ainda. Criar primeiro formulario →"
  - "Nenhum agendamento configurado. Criar tipo de evento →"

- [ ] **Error states** — Toda query com erro mostra mensagem + retry.
  - Nao mostrar stack traces pro usuario
  - Botao "Tentar novamente" que refaz a query

- [ ] **Mobile responsive** — Testar todas as paginas em viewport 375px.
  - Sidebar collapsa em mobile (hamburger menu ou drawer)
  - Runner funciona 100% em mobile (ja funciona, mas verificar)
  - Builder: pelo menos visualizacao readonly em mobile

- [ ] **Micro-copy PT-BR** — Revisar todos os textos da interface.
  - Mensagens de erro em portugues
  - Placeholders, tooltips, labels consistentes
  - Sem "Lorem ipsum" ou "TODO" remanescentes

- [ ] **Favicon e meta tags** — OG tags, favicon, apple-touch-icon.
  - Arquivo: `apps/web/index.html`
  - OG tags pra quando link for compartilhado

---

## Sprint 10 — Deploy e Validacao (Estimativa: 3-4 dias)

### 10.1 Primeiro Deploy

- [ ] **Servidor** — Hostinger VPS provisionado.
  - Ubuntu 22.04 LTS
  - Docker + Docker Compose instalados
  - Firewall: apenas 80, 443, 22

- [ ] **Dominio** — DNS configurado.
  - `app.typecall.com.br` → VPS (A record)
  - `api.typecall.com.br` → VPS (A record) ou path-based routing

- [ ] **TLS** — Certificado SSL automatico (Let's Encrypt via Caddy ou Certbot).

- [ ] **Deploy** — `docker compose -f docker-compose.prod.yml up -d`
  - Migrations aplicadas automaticamente no startup
  - Health check passing
  - Logs fluindo

- [ ] **Smoke test** — Verificar todos os fluxos em producao.
  - Register
  - Create form
  - Publish
  - Fill form via public link
  - Create event type + availability
  - Book via schedule step
  - Check analytics
  - Webhook delivery (pra endpoint de teste)

### 10.2 Monitoramento

- [ ] **Uptime monitoring** — Configurar check externo no /healthz.
  - UptimeRobot, Betterstack, ou similar (free tier)
  - Alerta via email/WhatsApp se down > 2min

- [ ] **Backup** — Postgres backup automatico.
  - pg_dump diario via cron
  - Reter ultimos 7 dias
  - Testar restore pelo menos 1x

- [ ] **Log rotation** — Docker log driver com max-size e max-file.

---

## O que NAO entra no MVP

Funcionalidades explicitamente adiadas pra pos-lancamento:

| Feature | Razao do adiamento | Quando |
|---------|--------------------|----|
| Google Calendar | Decisao de produto (D023). Integracao sera via Torque CRM | v1.1 |
| Logic branching visual | Flow-engine suporta, builder visual nao. 90%+ forms sao lineares | v1.1 |
| File upload | Requer S3/storage infra | v1.1 |
| Hidden fields | Requer pre-fill via query string | v1.1 |
| Email reminders | Requer Resend ou SMTP setup | v1.1 |
| WhatsApp | Requer Evolution API / Uazapi + template approval Meta | v1.1 |
| PIX payment | Requer integracao Asaas | v2.0 |
| Round-robin | Requer multi-user scheduling | v2.0 |
| Public API + API keys | Requer auth layer adicional | v2.0 |
| Billing/subscription | Requer gateway + plano management | v2.0 |
| White-label / custom domains | Requer infra DNS/TLS adicional | v2.0 |
| SSO com Torque | Requer Torque como IdP | v2.0 |
| A/B testing | Requer traffic splitting + stats engine | v2.0 |

---

## Criterios de Gate — MVP Pronto pra Lancamento

Todos devem ser TRUE pra considerar MVP production-ready:

- [ ] CORS aceita dominio de producao (nao localhost)
- [ ] Security headers aplicados em todas as respostas
- [ ] Input validation em toda mutation
- [ ] Request body size limitado
- [ ] Error boundary captura crashes no frontend
- [ ] Testes backend: `go test ./...` green com >= 60% coverage nos services
- [ ] Testes frontend: `pnpm test` green
- [ ] Playwright E2E: golden path green
- [ ] OpenAPI spec existe e esta atualizada
- [ ] Docker compose producao funcional
- [ ] Deploy realizado em VPS com TLS
- [ ] Health check respondendo em producao
- [ ] Backup de banco configurado
- [ ] Uptime monitoring ativo
- [ ] Sentry capturando erros (ou decisao explicita de nao usar)
- [ ] Smoke test completo passando em producao

---

## Timeline Visual

```
Sprint 9 — Hardening (2 semanas)
|
Dia  1     Quick wins (CORS, headers, body limit, error boundary)
Dia  2-3   Input validation em todos handlers
Dia  4-7   Testes backend (unit + integration + RLS + concurrency)
Dia  8-9   Testes frontend (vitest + playwright)
Dia  10    OpenAPI spec
Dia  11-12 Infra producao (docker-compose.prod, env vars, build)
Dia  13    Observabilidade (Sentry, logging, metricas)
Dia  14    Polish (loading/empty/error states, mobile, PT-BR)
|
Sprint 10 — Deploy (3-4 dias)
|
Dia  1     Servidor + dominio + TLS
Dia  2     Deploy + migrations
Dia  3     Smoke test + monitoring + backup
Dia  4     Buffer / fixes
|
                MVP LIVE
```

---

## Relacionamentos

- [[MVP Roadmap]] — roadmap original (features)
- [[Master Plan]] — timeline de fases
- [[00 - Indice]] — status geral
- [[Autenticacao e Seguranca]] — spec de security headers e rate limiting
- [[Fase 6 - Advanced]] — o que vem depois do MVP
