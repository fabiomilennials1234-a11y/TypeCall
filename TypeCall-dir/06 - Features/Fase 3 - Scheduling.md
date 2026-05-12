---
title: "Fase 3 - Scheduling"
tags: [features, fase-3, scheduling]
created: 2026-05-05
status: delivered
timeline: Semanas 8-11
---

# Fase 3 — Scheduling + Fusion (MVP)

A fase mais critica do produto. Entrega o [[Scheduling Engine]], a integracao com [[Google Calendar]] e — o diferencial do TypeCall — o step `schedule` dentro do fluxo conversacional ([[Fusion Layer]]). Ao final desta fase, o MVP esta funcional: um formulario que qualifica e agenda em um unico fluxo.

## Escopo

- CRUD de event types
- Availability rules e overrides
- Google Calendar OAuth + sync
- Algoritmo de calculo de slots (7 etapas)
- Criacao atomica de bookings
- Step `schedule` no builder e no runner (THE FUSION)
- Email de confirmacao PT-BR
- Cache Redis para disponibilidade

## Timeline

| Semana | Foco |
|--------|------|
| 8 | Migrations (event_types, availability_rules, overrides, bookings, credentials). CRUD API event types + availability. |
| 9 | Google Calendar OAuth flow, token encryption (AES-256-GCM), freeBusy API, event creation. |
| 10 | Slot calculation engine (7 etapas), Redis cache, booking creation atomica com FOR UPDATE. |
| 11 | Schedule step no builder e runner, email confirmacao, integracao end-to-end. |

## Deliverables

### API

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/api/v1/event-types` | POST | Criar event type |
| `/api/v1/event-types` | GET | Listar event types da org |
| `/api/v1/event-types/{id}` | GET | Detalhe do event type |
| `/api/v1/event-types/{id}` | PATCH | Atualizar event type |
| `/api/v1/event-types/{id}` | DELETE | Remover event type |
| `/api/v1/event-types/{id}/availability` | PUT | Definir availability rules |
| `/api/v1/event-types/{id}/availability/overrides` | POST | Adicionar override de data |
| `/api/v1/event-types/{id}/availability/overrides/{oid}` | DELETE | Remover override |
| `/api/v1/public/event-types/{id}/slots` | GET | Slots disponiveis (publico). Query: `timezone`, `from`, `to`. |
| `/api/v1/public/bookings` | POST | Criar booking (publico, chamado pelo runner) |
| `/api/v1/bookings` | GET | Listar bookings da org (admin) |
| `/api/v1/bookings/{id}` | GET | Detalhe do booking |
| `/api/v1/bookings/{id}/cancel` | POST | Cancelar booking |
| `/api/v1/bookings/{id}/reschedule` | POST | Reagendar booking |
| `/api/v1/integrations/gcal/connect` | GET | Inicia OAuth flow Google Calendar |
| `/api/v1/integrations/gcal/callback` | GET | OAuth callback, armazena tokens |
| `/api/v1/integrations/gcal/disconnect` | POST | Desconecta Google Calendar |

### Migrations

**`event_types`**:
- `id` UUID PK
- `organization_id` UUID FK
- `user_id` UUID FK → users (host)
- `title`, `slug`, `description`
- `duration_minutes` INTEGER
- `buffer_before_minutes`, `buffer_after_minutes` INTEGER DEFAULT 0
- `min_notice_hours` INTEGER DEFAULT 2
- `max_advance_days` INTEGER DEFAULT 30
- `max_per_day` INTEGER (nullable = sem limite)
- `location_type` ENUM (google_meet, custom_url, in_person)
- `location_value` TEXT (nullable)
- `is_active` BOOLEAN DEFAULT true
- `created_at`, `updated_at`

**`availability_rules`**:
- `id` UUID PK
- `event_type_id` UUID FK
- `user_id` UUID FK
- `day_of_week` INTEGER (0=domingo, 6=sabado)
- `start_time` TIME
- `end_time` TIME
- `created_at`

**`availability_overrides`**:
- `id` UUID PK
- `event_type_id` UUID FK
- `user_id` UUID FK
- `date` DATE
- `is_available` BOOLEAN (false = dia bloqueado)
- `start_time` TIME (nullable — se is_available=true, horario customizado)
- `end_time` TIME (nullable)
- `reason` TEXT (nullable — ex: "Feriado", "Ferias")
- `created_at`

**`bookings`**:
- `id` UUID PK
- `organization_id` UUID FK
- `event_type_id` UUID FK
- `host_user_id` UUID FK → users
- `response_id` UUID FK → responses (nullable — booking pode existir fora de form)
- `respondent_name`, `respondent_email`, `respondent_phone`
- `start_time` TIMESTAMPTZ
- `end_time` TIMESTAMPTZ
- `timezone` TEXT (IANA)
- `status` ENUM (confirmed, cancelled, rescheduled, completed, no_show)
- `google_event_id` TEXT (nullable)
- `meeting_url` TEXT (nullable)
- `cancel_token` UUID
- `reschedule_token` UUID
- `cancelled_at` TIMESTAMPTZ (nullable)
- `cancel_reason` TEXT (nullable)
- `created_at`, `updated_at`

**`integration_credentials`**:
- `id` UUID PK
- `organization_id` UUID FK
- `user_id` UUID FK
- `provider` ENUM (google_calendar, outlook)
- `access_token_encrypted` BYTEA (AES-256-GCM)
- `refresh_token_encrypted` BYTEA
- `token_expiry` TIMESTAMPTZ
- `scopes` TEXT[]
- `calendar_id` TEXT (nullable)
- `watch_channel_id` TEXT (nullable)
- `watch_expiry` TIMESTAMPTZ (nullable)
- `created_at`, `updated_at`

### service/availability — Slot Calculation Engine

Implementacao do algoritmo de 7 etapas descrito no [[Scheduling Engine]].

```
func (s *AvailabilityService) GetAvailableSlots(ctx context.Context, params SlotParams) ([]TimeSlot, error)
```

**Etapas**:

1. **Generate Candidates**: gera slots de `duration_minutes` com stepping de 15min, de `now + min_notice` ate `now + max_advance`
2. **Subtract Busy**: consulta Google Calendar freeBusy (ou cache Redis) e remove slots conflitantes
3. **Apply Buffers**: remove slots que violam `buffer_before` ou `buffer_after`
4. **Apply Min Notice**: remove slots com `start_time < now + min_notice_hours`
5. **Apply Max Per Day**: conta bookings existentes por dia, remove slots de dias lotados
6. **Apply Overrides**: aplica `availability_overrides` (bloqueia dias, substitui horarios)
7. **Return Slots**: agrupa por dia, converte para timezone do respondente

- **Performance target**: < 50ms para horizonte de 30 dias
- **Testes**: unit tests para cada etapa isoladamente + integration test do pipeline completo

### integration/gcal — Google Calendar

Pacote de integracao com Google Calendar API.

- **OAuth flow**: authorization URL → callback → code exchange → token storage
- **Token encryption**: AES-256-GCM com chave derivada de env var, IV unico por token
- **Token refresh**: automatico quando `token_expiry - now < 2min`, circuit breaker para falhas (3 falhas → open → 60s → half-open)
- **freeBusy**: `POST /freeBusy` com timeMin/timeMax, retorna intervals de busy. Resultado cacheado no Redis (TTL 15min).
- **Event creation**: `POST /events` com attendees (host + respondente), `conferenceData` para Google Meet auto-create
- **Watch channels**: `POST /events/watch` para receber push notifications quando calendario muda → invalida cache Redis
- **Error handling**: retry com backoff para erros transientes (429, 500, 503), fail-fast para erros de auth (401 → re-auth required)

Ver [[Google Calendar]] para detalhes completos.

### Schedule Step — THE FUSION

O step type `calendar_booking` integra o [[Scheduling Engine]] diretamente no [[Form Engine]].

**No builder**:
- Bloco `schedule` disponivel na paleta (categoria "Especial")
- Property panel: selecionar `event_type_id` existente
- Preview: mostra placeholder de calendario no live preview

**No runner**:
- Ao chegar no step, renderiza componente de calendario inline
- Selecao de data (calendario mensal) → selecao de horario (lista de slots disponiveis)
- Formulario de confirmacao inline (nome, email, phone — pre-preenchidos se ja respondidos)
- Confirmacao de booking → resposta do step armazenada com `booking_id`
- Apos confirmacao, runner avanca para proximo step

### Booking Confirmation Email

- **Provider**: Resend (transactional email)
- **Idioma**: PT-BR
- **Template**: confirmacao com detalhes da reuniao, link Google Meet, links de reschedule/cancel
- **Destinatarios**: respondente + host
- **Conteudo**:
  - Titulo do evento
  - Data e horario (no timezone do respondente)
  - Duracao
  - Link da reuniao (Google Meet)
  - Nome e email do host
  - Botoes: "Reagendar" / "Cancelar" (com tokens unicos)

### Redis Cache

- **Key pattern**: `avail:{event_type_id}:{user_id}:{date_range}` 
- **TTL**: 15 minutos
- **Invalidacao**: watch channel do Google Calendar dispara delete da key
- **Fallback**: se Redis indisponivel, consulta Google Calendar diretamente (degradacao graceful)

## Criterios de Aceitacao

- [ ] Criar event type com duracao, buffer, min notice, max advance
- [ ] Configurar availability rules (horario semanal)
- [ ] Conectar Google Calendar via OAuth
- [ ] Acessar endpoint de slots e ver horarios disponiveis (excluindo busy do GCal)
- [ ] Criar booking → evento aparece no Google Calendar com Google Meet
- [ ] Email de confirmacao chega em PT-BR para respondente e host
- [ ] Schedule step funciona dentro do form runner (selecao de data → horario → confirmacao)
- [ ] Fluxo end-to-end: criar form com perguntas + schedule step → publicar → responder → agendar → ver booking no admin + GCal
- [ ] Double-booking impossivel (teste de concorrencia)
- [ ] Cache Redis funciona (segunda consulta de slots mais rapida)

## Dependencias

- [[Fase 1 - Foundation]] — API, auth, multi-tenancy
- [[Fase 2 - Form Builder]] — form CRUD, builder, runner, response storage

## Proxima Fase

→ [[Fase 4 - Embed]]

---

## Iteracoes Pos-Entrega

### 2026-05-07 — Toggle Lista / Agenda em /bookings

A tela `/bookings` ganhou duas visoes alternaveis:

- **Lista**: cards ordenados por proximidade. Proxima reuniao futura sempre no topo (asc), passadas no fim (desc). Botao "Acessar" decorativo por reuniao (placeholder para feature futura).
- **Agenda**: grid mensal Dom-Sab com chips de reuniao por dia (cor do status), navegacao prev/next mes, chip clicavel abre modal de detalhes.

Modal `BookingDetailDialog` mostra attendee, status, data/hora, duracao, timezone, email/phone clicaveis, location/link, notes. Botao Cancelar reusa `cancelMutation` quando status `pending|confirmed`.

Arquivos:

- `apps/web/src/features/scheduling/lib/bookings.ts` — helpers puros (sortBookings, groupBookingsByDay, getMonthGrid, statusConfig)
- `apps/web/src/features/scheduling/lib/bookings.test.ts` — 22 testes vitest
- `apps/web/src/features/scheduling/components/BookingsListView.tsx`
- `apps/web/src/features/scheduling/components/BookingsCalendarView.tsx`
- `apps/web/src/features/scheduling/components/BookingDetailDialog.tsx`
- `apps/web/src/features/scheduling/BookingsPage.tsx` — refatorado em shell com toggle

Decisao: [[../../.specs/project/STATE|D030]].
