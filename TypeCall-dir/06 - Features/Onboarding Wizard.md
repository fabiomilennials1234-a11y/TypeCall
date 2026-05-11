---
title: Onboarding Wizard
status: entregue
sprint: 11
created: 2026-05-08
---

# Onboarding Wizard

Setup inicial obrigatorio (gate) pra admin/master pos-register ou primeiro login. 5 telas, transacao unica.

## Gate

- `organization.onboarded_at == null` AND `user.role IN (admin, master)` → redirect `/onboarding`
- Implementado em `apps/web/src/components/layout/AppLayout.tsx`
- Sellers convidados nao veem
- Skip permitido (marca onboarded_at sem entidades)

## Telas

1. **Welcome** — copy editorial + 3 feature cards (Agenda, Pixel, Funil)
2. **Agenda** — tipo de reuniao (online/whatsapp/presencial), duracao (15/30/45/60min), buffer (0/15/30min), horarios da semana (toggle por dia + start/end)
3. **Pixel** — Meta Pixel ID (validacao 15-16 digitos), fire_on_start, fire_on_booking
4. **Funil** — titulo do funil + toggles dos 5 contact fields (Nome, Email, WhatsApp, Empresa, Instagram) + preview da estrutura
5. **Resumo** — review de tudo + botao "Finalizar setup"

State persistido em `localStorage` (`tc:onboarding:draft`). Refresh nao perde progresso. Removido apos POST 200.

## Backend

### Endpoints

- `GET /api/v1/onboarding/state` — `{onboardedAt, templateFormId, hasSeller, hasPixel, hasTemplateForm}`
- `POST /api/v1/onboarding/skip` — marca onboarded_at apenas
- `POST /api/v1/onboarding/complete` — TX unica via tenant middleware:
  1. Upsert seller (idempotent) — `sellers.Service.CreateDefaultForOwner`
  2. Update preferences (duration/buffer/location)
  3. Replace seller_availability
  4. Upsert pixel_config
  5. Create form (status=draft) + save flow_definition
  6. Update org: onboarded_at = now(), template_form_id = form.id

Idempotencia: re-chamar complete em org ja onboardada retorna 200 com `{already_onboarded: true}`.

### Role check

Handler rejeita 403 se role != admin/master (defense in depth alem do gate frontend).

### Pixel validation

Regex `^\d{15,16}$` no service. Bloqueia injection arbitraria em `fbq('init', pixelId)`.

## Template

`packages/shared/src/templates/quiz-default.ts` — `buildQuizDefaultFlow(opts)` retorna FlowDefinition com 7 etapas:

| Etapa | Tipo(s) | Descricao |
|-------|---------|-----------|
| 0 Contato | short_text/email/phone | Toggleavel por contact_fields |
| 1 Dor | long_text | Pergunta aberta |
| 2 Produto | checkboxes | Multi-select |
| 3 Qualificacao | qualification | 3 perguntas com tags |
| 4 Consciencia | social_proof x2 + statement | Provas + diferenciais |
| 5 Agendamento | schedule | Lead escolhe horario |
| 6 Alinhamento | alignment_video | Video pos-agendamento |

Edges lineares. Form criado como draft — admin edita no builder pos-onboarding e publica.

## Seller baseline

Register cria automaticamente seller default ligado ao admin (Seg-Sex 09-18, 30min, 15buffer, online). Garante que schedule step nunca quebra por "nenhum seller na org". Soft-fail no register se falhar (apenas log warn).

## Pixel runtime

Form runner injeta `fbevents.js` se `pixel_config.meta_pixel_id` existir. Dispara:
- `Lead` na primeira resposta (se fire_on_start)
- `Schedule` quando schedule node ganha resposta (se fire_on_booking)

Endpoint publico `/api/v1/public/settings/pixel?slug=<form_slug>` resolve org via slug do form (sem RLS, JOIN forms+pixel_config).

## Migration

```sql
ALTER TABLE organizations
  ADD COLUMN onboarded_at     TIMESTAMPTZ,
  ADD COLUMN template_form_id UUID REFERENCES forms(id) ON DELETE SET NULL;
```

## Decisoes relacionadas

- D033: Onboarding org-level com flush-on-complete
- D034: Templates de form como codigo (JSON estatico)
- D035: Seller baseline no register
- D036: Pixel public endpoint via form slug
