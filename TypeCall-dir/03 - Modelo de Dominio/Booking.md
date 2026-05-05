---
tags:
  - dominio
  - booking
status: vivo
created: 2026-05-05
---

# Booking

Reuniao confirmada. O output principal do TypeCall — o momento em que qualificacao vira reuniao.

---

## Entidade: Booking

| Campo | Tipo | Descricao |
|---|---|---|
| `id` | UUID v7 | PK. |
| `organization_id` | UUID | FK → organizations. |
| `event_type_id` | UUID | FK → event_types. |
| `host_id` | UUID | FK → users. Vendedor que recebe a reuniao. |
| `response_id` | UUID | FK → responses. NULL se booking standalone (sem form). |
| `status` | ENUM | Ver lifecycle abaixo. |
| `start_time` | TIMESTAMPTZ | Inicio da reuniao (UTC). |
| `end_time` | TIMESTAMPTZ | Fim da reuniao (UTC). |
| `timezone` | TEXT | Timezone do respondente no momento do agendamento. |
| `attendee_name` | TEXT | Nome do respondente. |
| `attendee_email` | TEXT | Email do respondente. |
| `attendee_phone` | TEXT | Telefone (opcional). |
| `location_type` | TEXT | Tipo de local (copiado do event_type no momento da criacao). |
| `location_value` | TEXT | URL do Google Meet, Zoom, etc. |
| `google_event_id` | TEXT | ID do evento no Google Calendar (pra sync). |
| `reschedule_token` | TEXT | Token opaco pra link de reagendamento. |
| `cancel_token` | TEXT | Token opaco pra link de cancelamento. |
| `notes` | TEXT | Notas adicionais do respondente. |
| `metadata` | JSONB | UTM, referrer, device, custom fields. |
| `cancelled_at` | TIMESTAMPTZ | Quando foi cancelado (se aplicavel). |
| `cancel_reason` | TEXT | Motivo do cancelamento. |
| `rescheduled_from_id` | UUID | FK → bookings. Booking original (se reagendado). |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## Status Lifecycle

```
                    ┌──────────┐
                    │ pending  │ ← criado, aguardando confirmacao do calendario
                    └────┬─────┘
                         │ (calendario confirmado)
                         ▼
                    ┌──────────┐
              ┌─────│confirmed │─────┐
              │     └────┬─────┘     │
              │          │           │
              ▼          ▼           ▼
        ┌───────────┐ ┌─────────┐ ┌──────────┐
        │ cancelled │ │completed│ │rescheduled│
        └───────────┘ └─────────┘ └─────┬─────┘
                                        │ (cria novo booking)
                                        ▼
                                   ┌──────────┐
                                   │ pending  │ (novo booking)
                                   └──────────┘
```

| Status | Descricao |
|---|---|
| `pending` | Booking criado, evento sendo inserido no Google Calendar. Transicao automatica pra `confirmed` (< 3s). |
| `confirmed` | Evento no calendario, emails enviados. Estado normal. |
| `completed` | Reuniao aconteceu. Marcado automaticamente (job apos end_time + 15min) ou manualmente. |
| `cancelled` | Cancelado pelo respondente (via token) ou pelo host (via dashboard). |
| `rescheduled` | Substituido por novo booking. `rescheduled_from_id` no novo booking aponta pra este. |
| `no_show` | Marcado manualmente pelo host quando o respondente nao comparece. |

---

## Conflict Resolution

Agendamento concorrente e o principal risco de integridade. Dois respondentes podem tentar agendar o mesmo slot simultaneamente.

### Estrategia: SELECT ... FOR UPDATE

```sql
BEGIN;

-- Lock no slot: verifica se ja existe booking conflitante
SELECT id FROM bookings
WHERE host_id = $1
  AND status IN ('pending', 'confirmed')
  AND start_time < $3  -- end_time proposto
  AND end_time > $2    -- start_time proposto
FOR UPDATE;

-- Se retornou rows → slot indisponivel, retorna 409 Conflict
-- Se vazio → criar booking

INSERT INTO bookings (...) VALUES (...);

COMMIT;
```

**Por que nao SERIALIZABLE?** SERIALIZABLE tem overhead alto e retry logic complexa. `FOR UPDATE` resolve o caso especifico (double-booking) com lock granular e sem retry.

**Fallback adicional:** UNIQUE constraint parcial como safety net:

```sql
CREATE UNIQUE INDEX idx_no_double_booking
ON bookings (host_id, start_time)
WHERE status IN ('pending', 'confirmed');
```

---

## Calendar Sync

Ao criar booking confirmado:

1. **Criar evento no Google Calendar** do host:
   - Summary: nome do respondente + nome do event_type.
   - Descricao: respostas do form (se vinculado a response).
   - Attendees: email do respondente + email do host.
   - Conference: Google Meet auto-criado (`conferenceDataVersion: 1`).
   - Reminders: usar defaults do calendario do host.

2. **Armazenar `google_event_id`** no booking pra sync bidirecional.

3. **Ao cancelar:** deletar ou marcar como cancelled no Google Calendar.

4. **Ao reagendar:** atualizar horario no evento existente (ou deletar + criar novo).

---

## Tokens de Acao

Cada booking gera dois tokens opacos (crypto/rand, 32 bytes, base64url):

| Token | Uso | Validade |
|---|---|---|
| `reschedule_token` | Link enviado por email: `typecall.com.br/reschedule/:token` | Ate 1h antes da reuniao. |
| `cancel_token` | Link enviado por email: `typecall.com.br/cancel/:token` | Ate 1h antes da reuniao. |

Os links permitem que o respondente reagende ou cancele sem precisar de conta ou login. O token e a unica forma de autenticacao pra essas acoes.

---

## Reminders

Lembretes automaticos pra reduzir no-show:

| Quando | Canal | Destinatario | Conteudo |
|---|---|---|---|
| **24h antes** | Email | Respondente + Host | Data, horario, link da reuniao, link de cancelamento/reagendamento. |
| **1h antes** | Email | Respondente + Host | Lembrete curto com link da reuniao. |
| **24h antes** | WhatsApp | Respondente (se telefone coletado) | Template message com data e link. |
| **1h antes** | WhatsApp | Respondente (se telefone coletado) | Lembrete curto. |

**Implementacao:** job scheduler (cron-like) que roda a cada 5 minutos, busca bookings com reminder pendente, enfileira envios.

---

## Vinculo com Response

Quando o booking e criado a partir de um schedule step dentro de um form:

```
Response (form submission)
  └── Answer (step_type = schedule)
        └── value: { "booking_id": "bkng_01J..." }

Booking
  └── response_id → Response
```

Isso permite:
- O host ver todas as respostas de qualificacao junto com o booking.
- Analytics fim-a-fim: form completion → booking → meeting → outcome.
- CRM Bridge enviar o contexto completo pro Torque CRM.

---

## Links

- [[03 - Modelo de Dominio/Schedule|Schedule]]
- [[03 - Modelo de Dominio/Response|Response]]
- [[03 - Modelo de Dominio/Form|Form]]
- [[01 - Produto/Glossario|Glossario]]
- [[00 - Indice|Voltar ao Indice]]
