---
tags:
  - moc
  - indice
  - raiz
status: vivo
created: 2026-05-05
---

# TypeCall — Indice Central

> **Qualificacao + agendamento em um fluxo conversacional. Zero friccao.**

## Missao

Substituir o combo Typeform+Calendly com experiencia nativa brasileira, integrada ao ecossistema Torque CRM.

---

## Navegacao

| Secao | Descricao |
|---|---|
| [[01 - Produto/Visao do Produto\|Visao do Produto]] | Problema, solucao, diferenciais, modelo de negocio |
| [[01 - Produto/Personas e ICP\|Personas e ICP]] | Perfil de cliente ideal e personas-chave |
| [[01 - Produto/Glossario\|Glossario]] | Vocabulario padrao do dominio TypeCall |
| [[02 - Arquitetura/Visao Geral\|Arquitetura — Visao Geral]] | Stack, monorepo, decisoes de alto nivel |
| [[02 - Arquitetura/Autenticacao e Seguranca\|Autenticacao e Seguranca]] | JWT, CSRF, LGPD, rate limiting |
| [[02 - Arquitetura/Multi-tenancy\|Multi-tenancy]] | RLS, org isolation, session vars |
| [[02 - Arquitetura/Embed Architecture\|Embed Architecture]] | iframe SDK, postMessage, performance budget |
| [[03 - Modelo de Dominio/Form\|Form]] | Entidade Form, versionamento, schema SQL |
| [[03 - Modelo de Dominio/Flow\|Flow]] | FlowDefinition, steps, edges, condicoes |
| [[03 - Modelo de Dominio/Schedule\|Schedule]] | EventType, availability, calendar sync |
| [[03 - Modelo de Dominio/Booking\|Booking]] | Reunioes confirmadas, lifecycle, conflict resolution |
| [[03 - Modelo de Dominio/Response\|Response]] | Submissions, answers, analytics events |
| [[04 - Design/Design System\|Design System]] | Tokens, tipografia, motion, componentes |
| [[05 - Funcionalidades]] | Features detalhadas e specs |
| [[06 - Features]] | Feature flags e rollout |
| [[07 - Decisoes]] | ADRs — Architecture Decision Records |
| [[08 - Backlog]] | Priorizacao e roadmap |
| [[08 - Backlog/MVP Completion Checklist\|MVP Completion Checklist]] | Passo a passo definitivo pra finalizar MVP |
| [[09 - Referencias]] | Benchmarks, inspiracoes, links externos |
| [[10 - Operacional]] | Deploy, CI/CD, runbooks |

---

## Status Atual

**Fase:** Analytics + Webhooks (Fase 5) — Completa.
**MVP:** 8 sprints → [[08 - Backlog/MVP Roadmap|MVP Roadmap]]
**Stack:** Definida (Go + React + PostgreSQL + Redis).
**Sprint 1 (Alicerce):** Entregue — Docker, migrations, auth backend completo.
**Sprint 2 (Frontend Shell):** Entregue — Vite scaffold, auth pages, app shell, protected routes, CI.
**Sprint 3 (Form CRUD):** Entregue — migration 0002, API CRUD completo, frontend pages, tenant fix.
**Sprint 4 (Visual Builder):** Entregue — flow-engine package, @dnd-kit builder, block palette, property panel, preview, auto-save.
**Sprint 5 (Runner + Responses):** Entregue — migration 0003, public endpoints, form runner, response admin, link compartilhavel.
**Sprint 6 (Scheduling + Fusion):** Entregue — migration 0004 (5 tabelas scheduling), event types CRUD, availability rules/overrides, slot calculation engine, booking com conflict prevention, schedule step no builder+runner (THE FUSION), pages admin (agendamentos, reunioes).
**Sprint 6b (Webhook Torque CRM):** Entregue — migration 0005 (webhook_configs, webhook_deliveries), dispatch HMAC-SHA256, retry exponencial (5 tentativas), dead letter queue, admin UI webhook config + delivery history.
**Sprint 7 (Embed):** Entregue — apps/embed responder (React, 66KB gz), loader.js IIFE (1.26KB gz), postMessage bridge com origin validation, 4 modos (inline/popup/slider/fullpage), auto-init via data attributes, embed code generator no dashboard.
**Sprint 8 (Analytics):** Entregue — migration 0006 (response_events + materialized view), event ingestion publico, summary/daily/dropoff/export endpoints, dashboard analitico (metric cards, bar chart, drop-off funnel, CSV export), event tracking fire-and-forget no runner + embed.
**Sprint 11 (Onboarding):** Entregue — migration 0015 (organizations.onboarded_at + template_form_id), template quiz-default em packages/shared, seller baseline no register, API onboarding (state/skip/complete TX unica), wizard frontend 5 telas com localStorage backup, gate em AppLayout, pixel public endpoint via form slug.
**ADRs:** 4 registradas + 33 decisoes em STATE.md (D001-D036).
**Agentes:** 3 configurados (Engenheiro, Dev Senior, Dev Pleno).
**Proximo passo:** Sprint 9 — Hardening (testes, validacao, seguranca, infra producao). Ver [[MVP Completion Checklist]].

---

## Estrutura do Vault

```
TypeCall-dir/
├── 00 - Indice.md              ← voce esta aqui
├── 01 - Produto/
│   ├── Visao do Produto.md
│   ├── Personas e ICP.md
│   └── Glossario.md
├── 02 - Arquitetura/
│   ├── Visao Geral.md
│   ├── Autenticacao e Seguranca.md
│   ├── Multi-tenancy.md
│   └── Embed Architecture.md
├── 03 - Modelo de Dominio/
│   ├── Form.md
│   ├── Flow.md
│   ├── Schedule.md
│   ├── Booking.md
│   └── Response.md
├── 04 - Design/
│   └── Design System.md
├── 05 - Funcionalidades/
├── 06 - Features/
├── 07 - Decisoes/
├── 08 - Backlog/
├── 09 - Referencias/
└── 10 - Operacional/
```

---

## Time de Agentes

| Agente | Skill | Funcao |
|--------|-------|--------|
| [[Agentes/Engenheiro\|Engenheiro-Chefe]] | `tc-engenheiro` | Orquestra construcao, decompoe tarefas, valida arquitetura |
| [[Agentes/Dev Senior\|Dev Senior]] | `tc-dev-senior` | Decisoes tecnicas, code review, seguranca, poder de veto |
| [[Agentes/Dev Pleno\|Dev Pleno]] | `tc-dev-pleno` | Executa codigo: Go, React, SQL, testes, migrations |

**Fluxo:** Tarefa → Engenheiro (triage) → Dev Pleno (execucao) → Dev Senior (review) → Documentacao

---

## Regra de Ouro

> Nenhum formulario sem possibilidade de agendamento. Nenhum agendamento sem contexto de qualificacao.

Esse e o principio fundador do TypeCall. Qualificacao e scheduling sao inseparaveis. Qualquer feature, fluxo ou integracao que trate os dois como coisas distintas viola a premissa central do produto.
