---
title: Google Calendar Integration
tags: [referencias, integracoes, google-calendar]
created: 2026-05-05
status: active
---

# Google Calendar Integration

Integracao com Google Calendar para sincronizacao de disponibilidade, criacao de eventos e Google Meet. Componente critico do [[Scheduling Engine]].

## OAuth 2.0 Flow

### Authorization

1. Usuario clica "Conectar Google Calendar" no dashboard
2. TypeCall redireciona para Google OAuth consent screen
3. URL de autorizacao:
   ```
   https://accounts.google.com/o/oauth2/v2/auth
     ?client_id={GOOGLE_CLIENT_ID}
     &redirect_uri={CALLBACK_URL}
     &response_type=code
     &scope=https://www.googleapis.com/auth/calendar.readonly
            https://www.googleapis.com/auth/calendar.events
     &access_type=offline
     &prompt=consent
     &state={csrf_token}
   ```
4. `access_type=offline` garante refresh token na primeira autorizacao
5. `prompt=consent` forca tela de consentimento (garante refresh token mesmo em re-autorizacao)

### Code Exchange

1. Google redireciona para callback: `GET /api/v1/integrations/gcal/callback?code={code}&state={state}`
2. Backend valida `state` (CSRF protection)
3. Exchange code por tokens:
   ```
   POST https://oauth2.googleapis.com/token
   {
     "code": "{code}",
     "client_id": "{GOOGLE_CLIENT_ID}",
     "client_secret": "{GOOGLE_CLIENT_SECRET}",
     "redirect_uri": "{CALLBACK_URL}",
     "grant_type": "authorization_code"
   }
   ```
4. Resposta inclui `access_token`, `refresh_token`, `expires_in`

### Token Storage

Tokens armazenados criptografados no banco de dados (tabela `integration_credentials`).

- **Algoritmo**: AES-256-GCM (Galois/Counter Mode)
- **Chave**: derivada de environment variable `ENCRYPTION_KEY` (32 bytes)
- **IV (nonce)**: unico por operacao de criptografia (12 bytes), armazenado junto com o ciphertext
- **Authentication tag**: GCM fornece autenticacao integrada (previne tampering)
- **Campos criptografados**: `access_token_encrypted`, `refresh_token_encrypted`

Nunca armazenar tokens em texto plano. Nunca logar tokens.

## Scopes

| Scope | Uso | Necessidade |
|-------|-----|-------------|
| `calendar.readonly` | freeBusy API — verificar horarios ocupados | Obrigatorio. Sem isso, nao ha como calcular disponibilidade. |
| `calendar.events` | Criar eventos (booking) com Google Meet | Obrigatorio. Sem isso, nao ha como criar eventos no calendario do host. |

- Scopes solicitados no minimo necessario (principio do menor privilegio)
- Nao solicitar `calendar` (full access) — excessivo para o caso de uso

## Token Refresh

Access tokens do Google expiram em 1 hora. Refresh automatico e transparente.

- **Trigger**: antes de qualquer chamada a Google API, verificar `token_expiry`
- **Threshold**: renovar se `token_expiry - now < 2 minutos`
- **Endpoint**: `POST https://oauth2.googleapis.com/token` com `grant_type=refresh_token`
- **Atualizacao**: novo `access_token` e `expires_in` armazenados (criptografados)
- **Refresh token**: permanece o mesmo (Google nao rotaciona refresh tokens na maioria dos casos)

### Circuit Breaker

Protege contra falhas cascata no refresh de token.

- **Closed** (normal): tentativas de refresh procedem normalmente
- **Open** (apos 3 falhas consecutivas): todas as tentativas falham imediatamente por 60 segundos
- **Half-open** (apos cooldown): permite 1 tentativa. Se sucesso → closed. Se falha → open novamente.
- **Acao em open**: retornar erro `integration_auth_required` ao usuario, solicitando re-autorizacao

## freeBusy API

Consulta de horarios ocupados no calendario do usuario.

```
POST https://www.googleapis.com/calendar/v3/freeBusy
{
  "timeMin": "2026-05-05T00:00:00Z",
  "timeMax": "2026-06-04T23:59:59Z",
  "items": [
    { "id": "primary" }
  ]
}
```

Resposta:
```json
{
  "calendars": {
    "primary": {
      "busy": [
        { "start": "2026-05-06T10:00:00Z", "end": "2026-05-06T11:00:00Z" },
        { "start": "2026-05-06T14:00:00Z", "end": "2026-05-06T15:30:00Z" }
      ]
    }
  }
}
```

- **Uso**: etapa 2 do algoritmo de calculo de slots (Subtract Busy) — ver [[Scheduling Engine]]
- **Calendario**: `primary` por default, configuravel para outros calendarios do usuario
- **Range**: horizonte de `max_advance_days` do event type
- **Cache**: resultado cacheado no Redis com TTL de 15 minutos (key: `avail:{event_type_id}:{user_id}:{date_range}`)

## Event Creation

Criacao de evento no Google Calendar quando booking e confirmado.

```
POST https://www.googleapis.com/calendar/v3/calendars/primary/events
{
  "summary": "Discovery Call 30min - Maria Silva",
  "description": "Reuniao agendada via TypeCall.\n\nRespostas do formulario:\n- Empresa: XYZ\n- Tamanho: 11-50\n- Budget: R$5k-20k\n\nScore: 85/100",
  "start": {
    "dateTime": "2026-05-10T14:00:00-03:00",
    "timeZone": "America/Sao_Paulo"
  },
  "end": {
    "dateTime": "2026-05-10T14:30:00-03:00",
    "timeZone": "America/Sao_Paulo"
  },
  "attendees": [
    { "email": "fabio@milennials.com", "responseStatus": "accepted" },
    { "email": "maria@empresa.com.br" }
  ],
  "conferenceData": {
    "createRequest": {
      "requestId": "typecall-booking-uuid",
      "conferenceSolutionKey": { "type": "hangoutsMeet" }
    }
  },
  "reminders": {
    "useDefault": false,
    "overrides": [
      { "method": "popup", "minutes": 10 }
    ]
  }
}
```

- **Google Meet**: auto-criado via `conferenceData.createRequest`. Requer `conferenceDataVersion: 1` no request.
- **Attendees**: host (accepted) + respondente (pending — recebe invite por email do Google)
- **Description**: inclui resumo das respostas do formulario e score de qualificacao
- **google_event_id**: retornado na resposta, armazenado no booking para updates futuros

## Watch Channels

Push notifications do Google Calendar para invalidacao de cache em tempo real.

### Setup

```
POST https://www.googleapis.com/calendar/v3/calendars/primary/events/watch
{
  "id": "typecall-watch-{user_id}",
  "type": "web_hook",
  "address": "https://api.typecall.com.br/api/v1/webhooks/gcal",
  "expiration": 604800000  // 7 dias em ms (maximo)
}
```

### Notificacao

Quando calendario muda (evento criado, editado, deletado), Google envia:
```
POST https://api.typecall.com.br/api/v1/webhooks/gcal
X-Goog-Channel-ID: typecall-watch-{user_id}
X-Goog-Resource-State: exists
```

### Acao

1. Receber notificacao
2. Extrair `user_id` do channel ID
3. Invalidar cache Redis: `DEL avail:{event_type_id}:{user_id}:*`
4. Proxima consulta de slots buscara dados frescos da Google API

### Renovacao

- Watch channels expiram em 7 dias (maximo do Google)
- Cron job renova channels 24h antes do vencimento
- `watch_expiry` armazenado em `integration_credentials`

## Rate Limits

Google Calendar API tem quotas por projeto e por usuario.

| Quota | Limite | Mitigacao |
|-------|--------|-----------|
| Queries per day | 1.000.000 | Monitorar. Longe do limite em v1.0. |
| Queries per user per 100s | 500 | Cache Redis (15min TTL) reduz drasticamente chamadas. |
| freeBusy per user | Incluso no limite acima | Cache e a principal mitigacao. |
| Events insert per user | Incluso no limite acima | 1 insert por booking — volume baixo. |

- **Cache Redis**: principal mitigacao. freeBusy cacheado por 15min, watch channels invalidam quando necessario.
- **Retry com backoff**: em caso de 429 (Too Many Requests), retry com backoff exponencial respeitando `Retry-After` header.
- **Monitoring**: alertas se uso de quota ultrapassa 80%.

## Pattern Reference

Arquivos existentes no ecossistema que servem como referencia:

- **v8**: `v8milennialsb2bv2/supabase/functions/_shared/google-calendar-utils.ts` — funcoes utilitarias para Google Calendar no Supabase
- **Torque-v2**: `Torque-v2/torque-api/internal/service/integration/` — pacote `gcal` com interface `CalendarProvider` e implementacao Google Calendar

O TypeCall implementa um pacote `integration/gcal` em Go seguindo a mesma interface do Torque-v2, com adicao de watch channels e cache Redis.

## Relacionamentos

- [[Scheduling Engine]] — consumer principal (slot calculation, booking creation)
- [[Torque CRM Integration]] — booking data inclui google_event_id e meeting_url
- [[Fase 3 - Scheduling]] — implementacao
- [[ADR-001-backend-go-nao-supabase]] — escolha de Go para performance de integracao
