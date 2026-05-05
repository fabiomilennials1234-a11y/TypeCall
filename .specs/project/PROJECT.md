# TypeCall — Project Overview

**Produto:** TypeCall — Typeform + Calendly fundidos numa experiencia unica  
**Team:** milennials (CTO: Fabio)  
**Status:** Documentacao e planejamento  
**Repositorio:** <https://github.com/fabiomilennials1234-a11y/TypeCall.git>

---

## Visao do Produto

TypeCall e um SaaS B2B que combina formularios conversacionais (estilo Typeform) com agendamento inteligente (estilo Calendly) numa unica experiencia fluida. Projetado para times de vendas brasileiros que precisam qualificar leads e agendar reunioes no mesmo fluxo, sem friccao.

O respondente preenche um formulario conversacional e, ao final, agenda diretamente na agenda do vendedor — tudo dentro da mesma interface embedavel.

---

## Ecossistema

TypeCall e um produto standalone dentro do ecossistema milennials. Integra com o **Torque CRM** via webhook + API publica, permitindo que leads qualificados fluam automaticamente para o pipeline de vendas.

```
TypeCall (qualificacao + agendamento)
    │
    ├── Webhook → Torque CRM (lead criado/atualizado)
    ├── API REST → Torque CRM (consulta bidirecional)
    └── Standalone (funciona independente do Torque)
```

---

## Stack Summary

| Camada       | Tecnologia Principal                                      |
|-------------|----------------------------------------------------------|
| Backend      | Go 1.25+ / chi router / pgx driver                       |
| Database     | PostgreSQL 15+ (RLS, JSONB) / Redis (cache, rate limit)   |
| Frontend     | React 18 / TypeScript strict / Vite 6 / Tailwind 4       |
| Components   | shadcn/ui / Lucide Icons                                  |
| Deploy       | Docker distroless / Hostinger VPS / EasyPanel              |
| CI/CD        | GitHub Actions                                            |
| Monorepo     | pnpm workspaces + Turborepo                               |

---

## Monorepo Structure

```
TypeCall/
├── apps/
│   ├── api/              # Go backend (REST API + WebSocket + SSE)
│   ├── web/              # React SPA (dashboard admin)
│   └── embed/            # Widget embedavel (loader + iframe runner)
├── packages/
│   ├── flow-engine/      # Logica compartilhada de fluxo (TypeScript)
│   └── shared/           # Tipos e constantes compartilhadas
├── TypeCall-dir/         # Obsidian vault (documentacao)
└── .specs/               # Specs operacionais
```

---

## Timeline

O projeto esta dividido em **6 fases**, totalizando aproximadamente **18 semanas**:

| Fase | Nome                          | Duracao Estimada | Descricao                                          |
|------|-------------------------------|------------------|-----------------------------------------------------|
| 1    | Foundation                    | ~3 semanas       | Skeleton Go + React scaffold + auth + CI/CD         |
| 2    | Form Builder                  | ~3 semanas       | Editor visual de formularios + flow engine           |
| 3    | Scheduling Engine             | ~3 semanas       | Availability, booking, integracao Google Calendar    |
| 4    | Embed + Analytics             | ~3 semanas       | Widget embedavel + analytics + response events       |
| 5    | Integrations + Billing        | ~3 semanas       | Webhooks, API publica, Asaas billing, Torque CRM    |
| 6    | Polish + Launch               | ~3 semanas       | Performance, acessibilidade, testes E2E, deploy prod |

---

## Principios Tecnicas

1. **Spec before code** — Nenhuma linha de codigo sem documentacao previa
2. **Security by default** — RLS em toda tabela, auth em toda rota, CSRF em toda mutacao
3. **Performance as constraint** — Nao e otimizacao; e requisito de design
4. **Clean architecture** — Handler -> Service -> Repository, sem atalhos
5. **Observable from day one** — Structured logs, tracing, error tracking desde o primeiro commit
6. **Multi-tenancy first** — JWT -> Middleware -> RLS, tres camadas de isolamento

---

## Referencias de Design

Apple, Airbnb, Linear, Stripe, Vercel. Dark-first. Tipografia editorial. Sensibilidade cinematografica.

Se parece template, reprovado. Se poderia pertencer a qualquer produto, reprovado.
