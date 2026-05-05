---
title: Roadmap
tags: [backlog, roadmap]
created: 2026-05-05
status: active
---

# Roadmap

Visao por versao do TypeCall. Cada versao representa um marco de produto com proposta de valor clara.

## v1.0 — MVP: Qualify + Book in One Flow

**Proposta**: formularios conversacionais lineares + agendamento de reuniao + fusion em um unico fluxo. O diferencial do produto.

**Funcionalidades**:
- Form builder visual com drag-and-drop
- Question types: short_text, long_text, email, phone, number, url, multiple_choice, checkboxes, dropdown, rating, nps, opinion_scale, date, statement, welcome, ending, schedule
- Flow linear (sem branching)
- Draft / publish com versionamento imutavel
- Conversational runner (uma pergunta por vez, animacoes, mobile-first)
- Link compartilhavel (`typecall.com.br/f/{slug}`)
- Event types configuraveis (duracao, buffer, min notice, max advance, max per day)
- Availability rules semanais + overrides por data
- Google Calendar OAuth + sync (freeBusy, event creation, Google Meet)
- Slot calculation (algoritmo 7 etapas)
- Booking atomico (FOR UPDATE lock)
- Schedule step inline no fluxo (THE FUSION)
- Email de confirmacao PT-BR
- Response storage + listagem no admin
- Auth JWT httpOnly + multi-tenancy RLS

**Fases**: [[Fase 1 - Foundation]], [[Fase 2 - Form Builder]], [[Fase 3 - Scheduling]]

**Marco**: "Um formulario que qualifica e agenda em um unico fluxo, integrado com Google Calendar."

---

## v1.1 — Polish + Convert

**Proposta**: refinar a experiencia, adicionar branching e ferramentas de conversao. Transformar o MVP em produto polido.

**Funcionalidades**:
- Logic branching visual (condicoes em edges, UI de regras no builder)
- File upload (S3 presigned URL, virus scan)
- Hidden fields (via query string)
- Welcome screen customizado (imagem/video, CTA)
- Email reminders (24h + 1h antes da reuniao)
- WhatsApp reminders (confirmacao + reminder via [[WhatsApp]])
- Reschedule / cancel via links unicos com tokens
- Booking limits (max per day, max per week)
- Qualification score (score por opcao, calculo automatico)
- Conditional routing (enterprise → senior rep, SMB → SDR)
- Picture choice question type
- Embed completo: 4 modos (inline, popup, slider, full page)
- Theme customization (cores, fonte, logo, border radius, dark/light)
- Embed code generator no dashboard
- Analytics dashboard (completion rate, drop-off, source breakdown, avg time)
- Materialized views para performance
- Webhook system com retry exponential backoff
- Torque CRM integration (lead-webhook com source: "typecall")
- CSV export de respostas
- Mobile optimization completa

**Fases**: [[Fase 4 - Embed]], [[Fase 5 - Analytics e Webhooks]], [[Fase 6 - Advanced]] (parcial)

**Marco**: "Produto polido com branching, embed em qualquer site, analytics acionavel e dados fluindo pro CRM."

---

## v2.0 — Full Platform

**Proposta**: expandir para plataforma completa de conversao B2B com pagamentos, team scheduling, WhatsApp nativo e integracao profunda com ecossistema.

**Funcionalidades**:
- PIX payment step inline (via [[Asaas Payments]])
- Cartao de credito e boleto (Asaas hosted fields)
- Round-robin scheduling (weighted, equalizacao)
- Collective scheduling (intersecao de disponibilidade)
- Outlook / Microsoft 365 calendar sync
- WhatsApp-native forms (Copilot agent faz perguntas no chat)
- Form-triggered workflows (evento → acoes no Torque)
- Pre-fill from CRM (skip perguntas, personalizacao)
- Public API (REST, API key, OpenAPI 3.0)
- Zapier / Make integrations
- Billing / subscription (Free, Pro R$97/mes, Enterprise)
- White-label (remover branding, logo customizado)
- SSO com Torque CRM (shared JWT ou OAuth2)
- Custom domains (CNAME + SSL automatico)
- A/B testing (variantes, traffic splitting, statistical significance)
- Real-time dashboard (WebSocket live feed)
- Conversion attribution (form → deal → revenue)

**Fase**: [[Fase 6 - Advanced]] (completa)

**Marco**: "Plataforma completa de conversao B2B com pagamentos, scheduling avancado, WhatsApp nativo e billing."

---

## v3.0 — Vision

**Proposta**: inteligencia artificial e escala. Visao de longo prazo.

**Funcionalidades exploradas**:
- **AI-generated forms**: descrever o objetivo em linguagem natural, AI gera o formulario completo (perguntas, logica, scoring)
- **A/B testing com AI**: AI sugere variantes e otimiza automaticamente
- **White-label completo**: TypeCall como infra invisivel, parceiros revendem
- **Marketplace de templates**: comunidade de templates por industria/caso de uso (SaaS Demo, Consultoria, Eventos, Imobiliario)
- **AI qualification**: scoring inteligente baseado em historico de conversoes (nao apenas rules-based)
- **Multi-language**: forms em multiplos idiomas com deteccao automatica
- **Voice forms**: respondente fala, AI transcreve e navega o formulario
- **Advanced analytics**: cohort analysis, retention, predictive scoring

**Status**: exploratoria. Nenhuma decisao tecnica tomada.

---

## Relacionamentos

- [[Master Plan]] — timeline por fase (implementacao)
- [[Fase 1 - Foundation]] a [[Fase 6 - Advanced]] — detalhes de cada fase
- [[Torque CRM Integration]] — integracao com ecossistema
- [[Fusion Layer]] — inovacao central do produto
