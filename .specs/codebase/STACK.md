# TypeCall — Stack Completa

**Ultima atualizacao:** 2026-05-05

---

## Backend

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Linguagem        | Go                    | 1.25+      | Performance, concorrencia nativa (goroutines), binario unico, identico Torque |
| Router           | chi                   | v5         | Leve, idiomatico, middleware chain composable, net/http compativel             |
| DB Driver        | pgx                   | v5         | Driver PostgreSQL puro Go, prepared statements, pool nativo, sem ORM          |
| Migrations       | golang-migrate        | v4         | SQL puro UP/DOWN, sem DSL proprietario, versionamento numerico                |

## Database

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Banco principal  | PostgreSQL            | 15+        | RLS nativo, JSONB, TIMESTAMPTZ, gen_random_uuid(), maduro e auditavel         |
| Cache            | Redis                 | 7+         | Availability slots (15min TTL), rate limiting, sessoes, pub/sub lightweight    |

## Auth

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Token            | JWT (jose-go)         | -          | Stateless access token, claims com org + role, 15min TTL                      |
| Cookie           | httpOnly + Secure     | -          | Previne XSS token theft, SameSite=Lax                                        |
| CSRF             | Double-submit pattern | -          | Header X-CSRF-Token validado contra cookie, previne CSRF                     |
| Password         | bcrypt                | -          | Hashing resistente a brute force, cost factor configuravel                    |

## Real-time

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| WebSocket        | nhooyr.io/websocket   | v1         | WebSocket puro Go, sem gorilla (deprecated), context-aware, low memory        |
| SSE              | stdlib net/http       | -          | Server-Sent Events pra respondents publicos, sem auth necessaria              |

## Event Bus & Workers

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Event bus        | Go channels           | -          | In-process, fan-out por tenant, zero infra adicional, swap futuro pra NATS    |
| Worker pool      | Go goroutines         | -          | Semaphore-controlled, graceful shutdown, sem dependency de job queue externo   |

## Observability

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Logging          | zerolog               | v1         | Structured JSON logging, zero allocation, level-based filtering               |
| Error tracking   | Sentry                | Go SDK v0  | Captura de panics, breadcrumbs, release tracking, alertas                     |
| Tracing          | OpenTelemetry         | v1         | Distributed tracing padrao da industria, vendor-neutral, spans por request    |

## Frontend

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Framework        | React                 | 18         | Ecossistema maduro, server components nao necessarios (SPA puro)              |
| Linguagem        | TypeScript            | 5.x strict | Type safety total, strict mode obrigatorio, zero any                         |
| Bundler          | Vite                  | 6          | HMR instantaneo, build otimizado, ESM nativo, suporte Tailwind 4             |

## UI Components

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Component system | shadcn/ui             | latest     | Copy-paste components, customizaveis, Radix primitives, zero lock-in          |
| Icons            | Lucide React          | latest     | Tree-shakeable, consistentes, leves, complementa shadcn                      |

## Styling

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| CSS framework    | Tailwind CSS          | 4          | Utility-first, design tokens via HSL vars, purge automatico, JIT             |
| Design tokens    | CSS custom props (HSL)| -          | Temas dark/light via variacao de HSL, sem runtime JS                         |

## Server State & Forms

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Server state     | TanStack Query        | v5         | Cache, refetch, optimistic updates, stale-while-revalidate, devtools         |
| Form management  | React Hook Form       | v7         | Performant (uncontrolled), integracao nativa com Zod                         |
| Validation       | Zod                   | v3         | Schema-first, inference de tipos TS, composable, runtime validation           |

## Interacao

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Drag and drop    | @dnd-kit              | v6         | Acessivel, modular, tree-shakeable, suporte touch, form builder DnD           |
| Animacoes        | Framer Motion         | v11        | Layout animations, exit animations, spring physics, experiencia conversacional|

## API Contract

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Spec             | OpenAPI               | 3.1        | Padrao industria, geracao de tipos, documentacao automatica                   |
| Tipo generation  | openapi-typescript    | latest     | Gera tipos TS do spec OpenAPI, zero runtime, type-safe API calls             |

## Integracao Externa

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Email            | Resend                | API v1     | Developer-first, React email templates, alta deliverability, pricing justo    |
| Pagamentos       | Asaas                 | API v3     | Gateway brasileiro, boleto + PIX + cartao, subscription management nativo     |
| Calendar         | Google Calendar API   | v3         | Maior base de usuarios BR, OAuth2 flow maduro, webhook notifications          |
| Calendar (futuro)| Microsoft Graph       | v1         | Outlook/Office 365, complementa Google pra enterprise                        |
| File storage     | S3-compatible         | -          | Presigned URLs, upload direto do client, compatible com MinIO/Backblaze       |

## Testes

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Go unit          | testing (stdlib)      | -          | Table-driven tests, sem framework externo, idiomatico Go                     |
| Go integration   | testcontainers-go     | latest     | Postgres + Redis reais em Docker, testes de integracao fidedignos             |
| Frontend unit    | Vitest                | latest     | Compativel Vite, rapido, ESM nativo, API compativel Jest                     |
| E2E              | Playwright            | latest     | Cross-browser, auto-wait, trace viewer, CI-friendly                          |

## Deploy & Infra

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Container        | Docker (distroless)   | -          | Imagem minima (~5MB Go binary), sem shell, superficie de ataque reduzida      |
| Hosting          | Hostinger VPS         | -          | Custo-beneficio, controle total, sem vendor lock-in PaaS                     |
| Orchestration    | EasyPanel             | latest     | UI simples pra gerenciar containers, Let's Encrypt automatico, deploy facil   |
| CI/CD            | GitHub Actions        | -          | Integrado com repo, matrix builds, cache de dependencias, free tier generoso  |

## Monorepo

| Camada           | Tech                  | Versao     | Justificativa                                                                 |
|------------------|-----------------------|------------|-------------------------------------------------------------------------------|
| Package manager  | pnpm                  | 9+         | Workspace nativo, node_modules eficiente (symlinks), lockfile deterministico  |
| Build orchestration | Turborepo          | latest     | Build cache, task graph, parallelismo, incremental builds                    |
