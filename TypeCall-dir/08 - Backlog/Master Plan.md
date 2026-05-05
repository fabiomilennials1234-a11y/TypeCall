---
title: Master Plan
tags: [backlog, master-plan]
created: 2026-05-05
status: active
---

# Master Plan

Timeline completo de desenvolvimento do TypeCall. 6 fases, 18+ semanas, do scaffolding ao produto completo.

> **MVP funcional:** Fases 1-3 (11 semanas, 7 sprints). Detalhes em [[MVP Roadmap]].

## Timeline

```
Semana  1 ─── 3    Fase 1: Foundation
Semana  4 ─── 7    Fase 2: Form Builder
Semana  8 ── 11    Fase 3: Scheduling + Fusion (MVP)
Semana 12 ── 14    Fase 4: Embed
Semana 15 ── 17    Fase 5: Analytics + Webhooks
Semana 18+         Fase 6: Advanced (v1.1 + v2.0)
```

## Fases

### Fase 1 — Foundation (Semanas 1-3)

Go API skeleton, autenticacao JWT httpOnly, multi-tenancy com RLS, migrations iniciais, React scaffold com Vite + shadcn/ui, CI/CD via GitHub Actions, Docker compose para dev.

**Entrega**: infraestrutura completa, auth funcional, tenant isolation verificado.

→ [[Fase 1 - Foundation]]

### Fase 2 — Form Builder (Semanas 4-7)

Form CRUD, builder visual drag-and-drop (@dnd-kit), 5 tipos core (short_text, multiple_choice, email, statement, ending), flow-engine (types/traverser/evaluator/validator), draft/publish com form_versions imutaveis, runner conversacional basico, link compartilhavel, response storage.

**Entrega**: criar form → publicar → responder via link → ver resposta no admin.

→ [[Fase 2 - Form Builder]]

### Fase 3 — Scheduling + Fusion / MVP (Semanas 8-11)

Event types configuraveis, availability rules semanais + overrides, Google Calendar OAuth + freeBusy + event creation, algoritmo de 7 etapas para calculo de slots, booking atomico com FOR UPDATE, step `schedule` no builder e runner (THE FUSION), email de confirmacao PT-BR, cache Redis.

**Entrega**: criar form com perguntas + schedule step → publicar → qualificar + agendar em um fluxo → booking no Google Calendar. **Este e o MVP.**

→ [[Fase 3 - Scheduling]]

### Fase 4 — Embed (Semanas 12-14)

loader.js SDK (< 3KB gz), responder otimizado para iframe (< 50KB gz), protocolo postMessage bidirecional, 4 modos de embed (inline, popup, slider, full page), theme customization, embed code generator no dashboard.

**Entrega**: formulario TypeCall embedavel em qualquer site externo.

→ [[Fase 4 - Embed]]

### Fase 5 — Analytics + Webhooks (Semanas 15-17)

Response events (view, start, question_seen, question_answered, submit, abandon), dashboard analitico (completion rate, drop-off, source breakdown, avg time), materialized views (form_daily_metrics), webhook system com retry exponential backoff, integracao Torque CRM via lead-webhook, CSV export.

**Entrega**: visibilidade completa do funil + dados fluindo para o Torque CRM.

→ [[Fase 5 - Analytics e Webhooks]]

### Fase 6 — Advanced (Semanas 18+)

v1.1: branching visual, file upload, hidden fields, welcome screen, reminders (email + WhatsApp), reschedule/cancel, booking limits, qualification score, conditional routing, theme, embed polido, mobile. v2.0: PIX payment (Asaas), round-robin, collective scheduling, Outlook, WhatsApp-native forms, workflows, pre-fill CRM, public API, Zapier/Make, billing, white-label, SSO, custom domains, A/B testing, real-time dashboard, conversion attribution.

**Entrega**: plataforma completa de conversao.

→ [[Fase 6 - Advanced]]

## Dependencies Between Phases

```
Fase 1 (Foundation)
  ↓
Fase 2 (Form Builder)     ← depende de API, auth, multi-tenancy
  ↓
Fase 3 (Scheduling)       ← depende de forms, runner, response storage
  ↓
Fase 4 (Embed)            ← depende de runner completo (forms + scheduling)
  ↓
Fase 5 (Analytics)        ← depende de response events (runner + embed)
  ↓
Fase 6 (Advanced)         ← depende de tudo acima
```

- **Fase 1 → 2**: obrigatorio. Sem API e auth, nao ha forms.
- **Fase 2 → 3**: obrigatorio. Schedule step depende do form runner existir.
- **Fase 3 → 4**: obrigatorio. Embed precisa do runner completo (forms + scheduling).
- **Fase 4 → 5**: parcial. Analytics pode comecar sem embed, mas event tracking no embed requer embed pronto.
- **Fase 5 → 6**: parcial. Muitas features da Fase 6 sao independentes entre si e podem ser paralelizadas.

## Risk Register

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|:------------:|:-------:|-----------|
| **Embed bundle size excede budget** | Media | Alto | Monitorar bundle a cada commit. Se React + runner > 50KB gz, avaliar Preact como fallback (API-compatible, 3KB). Tree-shaking agressivo, code-splitting por question type. |
| **Google Calendar rate limits** | Media | Medio | Cache Redis com TTL 15min para freeBusy. Batch requests onde possivel. Watch channels para invalidacao proativa em vez de polling. Monitor de quota com alertas. |
| **Timezone DST edge cases** | Baixa | Medio | Usar IANA timezone database (via `time` package do Go). Testes unitarios com datas de transicao DST especificas do Brasil. Armazenar tudo em UTC, converter apenas na exibicao. |
| **Double-booking (race condition)** | Media | Critico | `SELECT ... FOR UPDATE` no slot antes de criar booking. Re-validacao de disponibilidade apos adquirir lock. Transacao atomica com rollback em caso de conflito. Testes de concorrencia no CI. |
| **Form version drift mid-session** | Baixa | Medio | Respondente que iniciou na versao N continua na versao N mesmo apos publish da versao N+1. `form_version_id` fixado no inicio da response session. Runner carrega versao especifica, nao "latest". |
| **Supabase → Go migration friction** | Baixa | Baixo | Decisao ja tomada ([[ADR-001-backend-go-nao-supabase]]). Sem Supabase no TypeCall. Risco residual: devs acostumados com Supabase precisam de ramp-up em Go. |
| **WhatsApp template approval delays** | Media | Baixo | Submeter templates para aprovacao Meta com antecedencia. Fallback para email se WhatsApp nao aprovado. Nao bloqueia MVP (WhatsApp e v1.1). |
| **Google OAuth verification** | Media | Medio | Iniciar processo de verificacao Google cedo (pode levar semanas). Usar modo "testing" com ate 100 usuarios durante dev. |

## Metricas de Sucesso

| Marco | Metrica | Target |
|-------|---------|--------|
| MVP (Fase 3) | Form completion rate | > 60% |
| MVP (Fase 3) | Booking conversion rate | > 40% dos que completam |
| Embed (Fase 4) | loader.js bundle | < 3KB gz |
| Embed (Fase 4) | responder FCP | < 1.5s |
| Analytics (Fase 5) | Dashboard query time | < 200ms p95 |
| v1.0 completo | Uptime | > 99.5% |

## Relacionamentos

- [[Roadmap]] — visao por versao (v1.0, v1.1, v2.0)
- [[Fase 1 - Foundation]] a [[Fase 6 - Advanced]] — detalhes de cada fase
