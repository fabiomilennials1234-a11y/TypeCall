---
tags:
  - arquitetura
  - visao-geral
status: vivo
created: 2026-05-05
---

# Arquitetura — Visao Geral

---

## Diagrama de Alto Nivel

```
                        ┌─────────────────────────────────┐
                        │        Sites Externos           │
                        │   (embed iframe + loader.js)    │
                        └──────────────┬──────────────────┘
                                       │
                                       ▼
                        ┌─────────────────────────────────┐
                        │     Cloudflare / Nginx          │
                        │   (CDN, WAF, TLS termination)   │
                        └──┬──────────┬───────────────┬───┘
                           │          │               │
                ┌──────────▼──┐  ┌────▼─────────┐  ┌──▼──────────┐
                │ typecall-web│  │ typecall-api │  │  embed CDN  │
                │ (React SPA) │  │  (Go / chi)  │  │ (loader.js) │
                │  Dashboard  │  │  REST + WS   │  │   + runner  │
                │  + Builder  │  │              │  │             │
                └──────┬──────┘  └──┬───────┬───┘  └─────────────┘
                       │            │       │
                       │     ┌──────▼──┐  ┌─▼──────────────┐
                       │     │PostgreSQL│  │     Redis      │
                       │     │ + JSONB  │  │ (cache, pubsub,│
                       │     │ + RLS    │  │  rate limit)   │
                       │     └─────────┘  └────────────────┘
                       │
                       │     ┌─────────────────────┐
                       └────►│ Google Calendar API  │
                             │ (OAuth2, freeBusy,   │
                             │  events, watch)      │
                             └─────────────────────┘
```

---

## Stack

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Backend** | Go 1.23+ / chi router | Performance, binario unico, tipagem forte, ecosystem maduro pra APIs. Pattern identico ao Torque-v2. |
| **Frontend (Dashboard)** | React 19 + TypeScript + Vite | SPA com builder drag-and-drop. TanStack Query, Zustand, shadcn/ui. |
| **Frontend (Embed/Runner)** | React 19 + TypeScript + Vite | Build separado, ultra-lightweight. Sem shadcn, sem TanStack Query. Budget < 70KB gz. |
| **Banco de Dados** | PostgreSQL 16+ | JSONB pra flow definitions, RLS pra multi-tenancy, LISTEN/NOTIFY pra real-time. |
| **Cache / PubSub** | Redis 7+ | Cache de availability/freeBusy, rate limiting, pub/sub pra WebSocket hub. |
| **Calendar** | Google Calendar API v3 | OAuth2 por usuario, freeBusy queries, event CRUD, push notifications via watch. |
| **CDN** | Cloudflare | Edge caching do loader.js e runner assets. WAF. TLS. |
| **Email** | Resend | Transactional emails (confirmacao, lembretes, cancelamento). |
| **Monitoramento** | Sentry + zerolog | Error tracking com PII scrubbing. Structured logging. |

---

## Estrutura do Monorepo

```
typecall/
├── apps/
│   ├── api/                    # Go backend
│   │   ├── cmd/server/         # Entrypoint
│   │   ├── internal/
│   │   │   ├── domain/         # Entidades, value objects
│   │   │   ├── service/        # Logica de negocio
│   │   │   ├── repository/     # Acesso a dados (sqlc)
│   │   │   ├── handler/        # HTTP handlers
│   │   │   ├── middleware/     # Auth, org, rate limit
│   │   │   └── calendar/      # Google Calendar integration
│   │   ├── migrations/         # SQL migrations
│   │   └── sqlc/               # Queries tipadas
│   ├── web/                    # React SPA (dashboard + builder)
│   │   ├── src/
│   │   │   ├── features/       # Feature modules
│   │   │   ├── components/     # Shared UI
│   │   │   ├── lib/            # Utilities
│   │   │   └── stores/         # Zustand stores
│   │   └── vite.config.ts
│   └── embed/                  # Lightweight runner
│       ├── src/
│       │   ├── runner/         # Form runner components
│       │   ├── loader/         # loader.js (entry point externo)
│       │   └── postMessage/    # Host <-> iframe protocol
│       └── vite.config.ts
├── packages/
│   ├── flow-engine/            # Shared TS — flow traversal, validation
│   │   ├── src/
│   │   │   ├── traverse.ts     # Flow navigation algorithm
│   │   │   ├── validate.ts     # FlowDefinition validation
│   │   │   └── types.ts        # Step, Edge, Condition types
│   │   └── tsconfig.json
│   └── shared/                 # Shared types, constants, utils
│       └── src/
├── turbo.json
├── package.json
└── go.work
```

---

## Decisoes Arquiteturais Chave

### Go no backend
Performance previsivel, deploy simples (binario unico), ecosystem forte pra APIs REST. Mesmo pattern do Torque-v2 — reutilizamos middleware de auth, multi-tenancy e logging. Ver [[ADR-001]].

### JSONB pra flow definitions
Flow e um grafo complexo com steps polimorficos. Modelar relacional seria over-engineering: dezenas de tabelas, joins caros, versionamento complexo. JSONB permite carregar/salvar o flow inteiro como unidade atomica, versionamento trivial via `form_versions`, e queries com operadores JSON quando necessario. Ver [[ADR-002]].

### iframe pra embeds
Web Components pareciam elegantes mas trazem problemas reais: style isolation incompleta, bundle pesado, compatibility issues. iframe garante isolamento total de CSS/JS, seguranca via sandbox, e simplifica drasticamente o runtime. O trade-off (comunicacao via postMessage) e aceitavel. Ver [[ADR-003]].

### WebSocket hub per-tenant
Real-time no builder (colaboracao) e no dashboard (notificacoes de booking). Hub gerenciado via Redis pub/sub — cada instancia da API subscreve nos canais das orgs conectadas. Ver [[ADR-004]].

---

## Links

- [[02 - Arquitetura/Autenticacao e Seguranca|Autenticacao e Seguranca]]
- [[02 - Arquitetura/Multi-tenancy|Multi-tenancy]]
- [[02 - Arquitetura/Embed Architecture|Embed Architecture]]
- [[03 - Modelo de Dominio/Form|Form]]
- [[03 - Modelo de Dominio/Flow|Flow]]
- [[00 - Indice|Voltar ao Indice]]
