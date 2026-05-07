---
title: "Fase 1 - Foundation"
tags: [features, fase-1, foundation]
created: 2026-05-05
status: delivered
timeline: Semanas 1-3
---

# Fase 1 — Foundation

Alicerce tecnico do TypeCall. Estabelece o esqueleto do backend Go, autenticacao, multi-tenancy, frontend React e pipeline CI/CD. Nenhuma funcionalidade de produto visivel ao usuario final — tudo infraestrutura e scaffolding.

## Escopo

- Go API skeleton completo com middleware stack
- Autenticacao JWT com httpOnly cookies
- Multi-tenancy com Row Level Security (RLS)
- Migrations iniciais (organizations, users)
- React scaffold com auth flow
- CI/CD via GitHub Actions
- Docker compose para dev local

## Timeline

| Semana | Foco |
|--------|------|
| 1 | Go API skeleton, config, DB pool, middleware stack, health endpoints, Docker compose |
| 2 | Migrations (orgs + users + RLS), auth endpoints, JWT implementation |
| 3 | Frontend scaffold, auth flow UI, CI/CD pipelines, integracao end-to-end |

## Deliverables

### Backend — Go API

- **Entrypoint**: `cmd/api/main.go` — bootstraps server, carrega config, conecta DB, registra rotas
- **Config**: carregamento via environment variables com validacao (struct tags), suporte a `.env` para dev
- **DB connection**: pool pgx com connection pooling, health check, graceful shutdown
- **Middleware stack** (ordem importa):
  1. `RequestID` — UUID por request para tracing
  2. `Logger` — structured logging (slog) com request_id, method, path, duration
  3. `Recover` — panic recovery com stack trace no log
  4. `CORS` — origins configuraveis por environment
  5. `RateLimit` — token bucket por IP (Redis-backed), configurable por rota
  6. `CSRF` — double-submit cookie pattern para rotas autenticadas
  7. `Auth` — extrai e valida JWT do httpOnly cookie, injeta claims no context
  8. `Tenant` — extrai `organization_id` dos claims, injeta no context, configura RLS
- **Health endpoints**:
  - `GET /healthz` — liveness (sempre 200)
  - `GET /readyz` — readiness (verifica DB + Redis)
- **Router**: chi v5 com subrouters por dominio

### Migrations

Tabelas iniciais com RLS habilitado.

**`organizations`**:
- `id` UUID PK
- `name`, `slug` (unique)
- `plan` ENUM (free, pro, enterprise)
- `created_at`, `updated_at`

**`users`**:
- `id` UUID PK
- `organization_id` UUID FK → organizations
- `email` (unique), `password_hash`
- `name`, `role` ENUM (owner, admin, member)
- `created_at`, `updated_at`

**RLS**:
- Policy em ambas as tabelas: `WHERE organization_id = current_setting('app.current_org')::uuid`
- Middleware `Tenant` executa `SET LOCAL app.current_org = '{org_id}'` a cada request
- Verificacao: tenant A nao consegue ler/escrever dados do tenant B

### Auth — Endpoints

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/api/v1/auth/register` | POST | Cria organization + user (owner). Hash bcrypt cost 12. |
| `/api/v1/auth/login` | POST | Valida credenciais, retorna JWT em httpOnly cookie. |
| `/api/v1/auth/refresh` | POST | Renova access token usando refresh token (httpOnly cookie separado). |
| `/api/v1/auth/logout` | POST | Invalida refresh token, limpa cookies. |
| `/api/v1/auth/me` | GET | Retorna user autenticado (id, name, email, role, organization). |

- **JWT**: access token (15min TTL), refresh token (7d TTL) — ver [[ADR-004-auth-jwt-httponly]]
- **Cookies**: `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/`
- **CSRF**: double-submit cookie — token no cookie + header `X-CSRF-Token`
- **Password**: bcrypt com cost 12, nunca logado, nunca retornado

### Frontend — React Scaffold

- **Build tool**: Vite (fast HMR, ESBuild)
- **UI**: shadcn/ui (Radix primitives + Tailwind CSS)
- **Routing**: React Router v7 com layout routes
- **State**: React Query (TanStack Query) para server state, Zustand para client state
- **Auth flow**:
  - Pagina de login com email + senha
  - Pagina de registro com nome + email + senha + nome da organizacao
  - Protected routes com redirect para login
  - Auto-refresh de token via interceptor
- **Layout**: shell basico com sidebar, topbar, area de conteudo
- **Dark mode**: default, toggle disponivel

### CI/CD — GitHub Actions

**`frontend-ci.yml`**:
- Trigger: push/PR em `apps/web/**`
- Steps: install → lint (ESLint) → type-check (tsc) → test (Vitest) → build
- Cache: node_modules via actions/cache

**`backend-ci.yml`**:
- Trigger: push/PR em `apps/api/**`
- Steps: lint (golangci-lint) → test (go test ./...) → build
- Services: Postgres + Redis containers para integration tests

### Docker — Dev Environment

**`docker-compose.dev.yml`**:
- `postgres`: PostgreSQL 16 com volume persistente, porta 5432
- `redis`: Redis 7 com porta 6379
- `api`: Go API com hot-reload (air), monta codigo fonte como volume
- Networks: todos no mesmo network para comunicacao por service name

## Criterios de Aceitacao

- [ ] `go test ./...` passa com 0 falhas
- [ ] Auth flow completo funciona (register → login → me → refresh → logout)
- [ ] RLS verificado: request autenticado como tenant A retorna 0 resultados de tenant B
- [ ] Frontend build sem erros (`npm run build`)
- [ ] CI green em ambos os pipelines
- [ ] Docker compose sobe ambiente completo com `docker compose up`
- [ ] Health endpoints respondem corretamente

## Decisoes Relevantes

- [[ADR-001-backend-go-nao-supabase]] — por que Go e nao Supabase
- [[ADR-004-auth-jwt-httponly]] — por que JWT em httpOnly cookies

## Dependencias

Nenhuma — esta e a fase zero. Todas as outras fases dependem desta.

## Proxima Fase

→ [[Fase 2 - Form Builder]]
