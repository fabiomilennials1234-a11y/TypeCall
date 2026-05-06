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
| [[09 - Referencias]] | Benchmarks, inspiracoes, links externos |
| [[10 - Operacional]] | Deploy, CI/CD, runbooks |

---

## Status Atual

**Fase:** Form Builder (Fase 2) — Sprint 4 completa.
**MVP:** 7 sprints, 11 semanas → [[08 - Backlog/MVP Roadmap|MVP Roadmap]]
**Stack:** Definida (Go + React + PostgreSQL + Redis).
**Sprint 1 (Alicerce):** Entregue — Docker, migrations, auth backend completo.
**Sprint 2 (Frontend Shell):** Entregue — Vite scaffold, auth pages, app shell, protected routes, CI.
**Sprint 3 (Form CRUD):** Entregue — migration 0002, API CRUD completo, frontend pages, tenant fix.
**Sprint 4 (Visual Builder):** Entregue — flow-engine package, @dnd-kit builder, block palette, property panel, preview, auto-save.
**ADRs:** 4 registradas + 19 decisoes em STATE.md (D001-D019).
**Agentes:** 3 configurados (Engenheiro, Dev Senior, Dev Pleno).
**Proximo passo:** Sprint 5 — Form Runner + Response Storage.

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
