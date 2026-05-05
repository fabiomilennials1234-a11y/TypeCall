---
title: "Fase 5 - Analytics e Webhooks"
tags: [features, fase-5, analytics, webhooks]
created: 2026-05-05
status: planned
timeline: Semanas 15-17
---

# Fase 5 — Analytics e Webhooks

Instrumentacao completa do funil de respostas, dashboard analitico, sistema de webhooks com retry e integracao nativa com [[Torque CRM Integration]]. Esta fase transforma dados brutos em inteligencia acionavel.

## Escopo

- Tabela e ingestion de response_events
- Dashboard analitico (completion rate, drop-off, source breakdown, tempo medio)
- Materialized views para performance
- Sistema de webhooks com retry exponential backoff
- Integracao Torque CRM (lead-webhook)
- Export CSV de respostas

## Timeline

| Semana | Foco |
|--------|------|
| 15 | response_events table, ingestion API, event tracking no runner e embed. Materialized views. |
| 16 | Dashboard analitico: completion rate, drop-off por question, source breakdown, avg time. |
| 17 | Webhook system (CRUD, delivery, retry). Torque CRM integration. CSV export. |

## Deliverables

### response_events Table + Ingestion

**Migration `response_events`**:
- `id` UUID PK
- `event_id` UUID UNIQUE (gerado client-side para deduplicacao)
- `form_id` UUID FK
- `response_id` UUID FK (nullable — `view` nao tem response ainda)
- `step_id` UUID (nullable — eventos globais como `view`, `start`)
- `event_type` ENUM (view, start, question_seen, question_answered, booking_slot_selected, submit, abandon, share)
- `metadata` JSONB (utm_params, referrer, device, user_agent, ip_geo)
- `created_at` TIMESTAMPTZ

**API de ingestion**:
- `POST /api/v1/events` — aceita batch de ate 10 eventos por request
- Rate limit: 100 req/min por IP (prevenir abuse)
- Validacao: event_type valido, form_id existente
- Deduplicacao: `ON CONFLICT (event_id) DO NOTHING`
- Async processing: eventos inseridos diretamente (sem fila) — volume esperado e baixo no v1.0

**Tracking no runner**:
- `view`: disparado quando iframe/pagina carrega
- `start`: disparado no click do welcome screen
- `question_seen`: disparado quando step renderiza
- `question_answered`: disparado quando resposta validada e aceita
- `booking_slot_selected`: disparado quando slot selecionado no schedule step
- `submit`: disparado apos submission bem-sucedida
- `abandon`: disparado via `beforeunload` se response em andamento e nao completada
- `share`: disparado no click do botao de share no ending screen

### Analytics Dashboard

Interface no admin para visualizacao de metricas.

**Metricas principais** (cards no topo):
- **Completion rate**: `submits / starts * 100` — KPI principal
- **Total views / starts / completions**: numeros absolutos com comparacao vs periodo anterior
- **Avg completion time**: tempo medio de preenchimento
- **Booking conversion**: `bookings / submits * 100` (se form tem schedule step)

**Drop-off por question**:
- Grafico de funil vertical mostrando cada step do form
- Percentual de respondentes que viram vs responderam cada step
- Destaque visual no step com maior drop-off
- Tooltip com numeros absolutos

**Source breakdown**:
- Tabela com metricas desagregadas por `utm_source` / `utm_medium` / `utm_campaign`
- Colunas: source, views, starts, completions, completion rate, bookings
- Filtro por combinacao de UTM params

**Tempo medio por question**:
- Tempo medio gasto em cada step (diferenca entre `question_seen` e `question_answered`)
- Identifica perguntas que tomam mais tempo (possivelmente confusas)

**Filtros globais**:
- Periodo (7d, 30d, 90d, custom range)
- Source (UTM params)
- Device (desktop / mobile / tablet)

### Materialized Views

**`form_daily_metrics`**:

```sql
CREATE MATERIALIZED VIEW form_daily_metrics AS
SELECT
  form_id,
  date_trunc('day', created_at)::date AS date,
  COUNT(*) FILTER (WHERE event_type = 'view') AS views,
  COUNT(*) FILTER (WHERE event_type = 'start') AS starts,
  COUNT(*) FILTER (WHERE event_type = 'submit') AS completions,
  COUNT(*) FILTER (WHERE event_type = 'abandon') AS abandons
FROM response_events
GROUP BY form_id, date_trunc('day', created_at)::date;
```

- **Indice**: `CREATE UNIQUE INDEX ON form_daily_metrics (form_id, date)`
- **Refresh**: via cron job Go a cada hora (`REFRESH MATERIALIZED VIEW CONCURRENTLY`)
- **Uso**: dashboard queries contra a materialized view em vez de scan na tabela de eventos
- **Performance**: queries retornam em < 50ms para qualquer range

### Webhook System

Sistema de webhooks para notificar sistemas externos sobre eventos do TypeCall.

**Migration `webhook_endpoints`**:
- `id` UUID PK
- `organization_id` UUID FK
- `url` TEXT (endpoint de destino)
- `secret` TEXT (HMAC secret para assinatura)
- `events` TEXT[] (lista de event types que disparam: `form.completed`, `booking.created`, `booking.cancelled`)
- `is_active` BOOLEAN DEFAULT true
- `created_at`, `updated_at`

**Migration `webhook_deliveries`**:
- `id` UUID PK
- `webhook_endpoint_id` UUID FK
- `event_type` TEXT
- `payload` JSONB
- `status` ENUM (pending, success, failed, dead_letter)
- `attempts` INTEGER DEFAULT 0
- `last_attempt_at` TIMESTAMPTZ
- `last_response_code` INTEGER
- `last_response_body` TEXT (truncated a 1KB)
- `next_retry_at` TIMESTAMPTZ (nullable)
- `created_at`

**CRUD API**:
- `POST /api/v1/webhooks` — criar endpoint
- `GET /api/v1/webhooks` — listar endpoints
- `PATCH /api/v1/webhooks/{id}` — atualizar
- `DELETE /api/v1/webhooks/{id}` — remover
- `POST /api/v1/webhooks/{id}/test` — enviar payload de teste

**Delivery engine**:
- Trigger: evento ocorre → enfileira delivery para todos os endpoints ativos que escutam esse event type
- HTTP: `POST` para URL do endpoint com payload JSON
- Headers: `X-TypeCall-Signature` (HMAC-SHA256 do body com secret), `X-TypeCall-Event`, `X-TypeCall-Delivery-Id`
- Timeout: 10 segundos por tentativa
- **Retry**: exponential backoff — 1s, 2s, 4s, 8s, 16s (5 tentativas)
- **Dead letter**: apos 5 falhas, move para `dead_letter` status. Visivel no dashboard para re-envio manual.

### Torque CRM Integration

Integracao nativa com o [[Torque CRM Integration]] via webhook padrao.

- **Default webhook**: ao criar organizacao, configura automaticamente endpoint Torque se configurado
- **Event**: `form.completed` (inclui booking se houver)
- **Payload**: formato compativel com `lead-webhook` do Torque — ver [[Torque CRM Integration]] para formato completo
- **Mapeamento**: `source: "typecall"`, respondent → lead fields, booking → pipe_confirmacao
- **Deduplicacao Torque-side**: match por email ou phone — atualiza lead existente ao inves de criar duplicata

### CSV Export

Export de respostas em formato CSV para analise externa.

- **Endpoint**: `GET /api/v1/forms/{id}/responses/export?format=csv`
- **Colunas**: response_id, respondent_name, respondent_email, respondent_phone, status, started_at, completed_at + uma coluna por question (titulo como header)
- **Filtros**: status, date range
- **Streaming**: resposta streamada para suportar exports grandes sem timeout
- **Encoding**: UTF-8 com BOM (compatibilidade Excel PT-BR)

## Criterios de Aceitacao

- [ ] Response events sao coletados automaticamente no runner e embed
- [ ] Dashboard exibe completion rate, drop-off por question, source breakdown, avg time
- [ ] Metricas consistentes com dados reais (validacao manual)
- [ ] Materialized view `form_daily_metrics` existe e e atualizada automaticamente
- [ ] Webhook CRUD funciona (criar, listar, atualizar, deletar, testar)
- [ ] Webhook dispara no form.completed com payload correto
- [ ] Retry funciona (simular endpoint falhando, verificar retries)
- [ ] Dead letter visivel no dashboard apos 5 falhas
- [ ] Dados chegam no Torque CRM como lead (testar com endpoint real ou mock)
- [ ] CSV export funcional com dados corretos

## Dependencias

- [[Fase 2 - Form Builder]] — forms, responses
- [[Fase 3 - Scheduling]] — bookings (para payload do webhook)
- [[Fase 4 - Embed]] — event tracking no embed

## Proxima Fase

→ [[Fase 6 - Advanced]]
