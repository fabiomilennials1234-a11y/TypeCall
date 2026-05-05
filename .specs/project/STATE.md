# Project State

**Last updated:** 2026-05-05

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
- [ ] Configurar Sentry + OpenTelemetry
- [ ] Definir OpenAPI 3.1 spec inicial
- [ ] Sprint 4: Visual builder (drag-and-drop, block palette, property panel)
- [ ] Sprint 5: Form runner + response storage
