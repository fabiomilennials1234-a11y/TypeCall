---
title: "ADR-005: Google OAuth + Google Calendar Sync"
tags: [adr, architecture, integration]
status: accepted
created: 2026-05-07
id: ADR-005
---

# ADR-005: Google OAuth + Google Calendar Sync

## Contexto

Sprint 6 (Fase 3) entregou scheduling com calculo de slots interno e bookings persistidos no DB. ADR pendente: integracao com Google Calendar pra (1) considerar agenda externa do host no calculo de disponibilidade, (2) materializar booking no GCal do host com Google Meet anexado, (3) login com Google.

[[Google Calendar]] no vault tem brief de implementacao detalhado. Esta ADR formaliza decisoes adicionais.

## Decisao

### OAuth flow

**Dois callbacks separados**:
- `/api/v1/integrations/google/callback` — link de conta Google a usuario ja autenticado.
- `/api/v1/auth/google/callback` — Sign in with Google (auto-cria User+Org se email novo).

Justificativa: separacao deixa as tres regras de negocio explicitas (autorizacao do user logado vs sign-in do anonimo) e permite registrar 2 redirect URIs no Google Console com escopo diferente sem reusar contexto entre fluxos.

**State CSRF stateless**: JWT HS256 assinado com `CSRFSecret`. Claims do link flow: `uid`, `oid`, `nonce`. Claims do signin flow: `purpose=signin`, `nonce`. TTL 10min. Sem dependencia de Redis.

**Sign-in auto-cria conta**: se email do Google nao tem User existente, cria nova Organization (slug = parte antes do `.` do dominio do email; em colisao, sufixo uuid de 6 chars) + User com `password_hash=""` (conta Google-only ate setar senha) + role admin. Tokens GCal salvos imediatamente (auto-vincula integration).

### Token storage

Tokens encriptados em repouso via AES-256-GCM (internal/crypto). Cada token tem nonce 96-bit proprio (BYTEA na tabela). `ENCRYPTION_KEY` via env var (32 bytes hex). Tokens jamais persistidos em texto plano.

Tabela `integration_credentials` com UNIQUE(user_id, provider) e RLS por organization_id.

### GCal client (internal/integration/gcal)

Wrapper sobre `google.golang.org/api/calendar/v3` com:

- **Refresh transparente**: `persistingTokenSource` decora o `oauth2.TokenSource`. Quando access token rotaciona, re-encripta e persiste via `repo.UpdateAccessToken` antes de retornar. Nao re-faz round trip se refresh ja aconteceu nesta call.
- **Circuit breaker per-user**: estado em memoria (mu+map). 3 falhas consecutivas em 60s abrem o circuit; metodos retornam `ErrCircuitOpen`. Apos cooldown half-open libera 1 tentativa.
- **Soft-fail em availability**: se `gcal.GetBusy` falha, log warn e procede com bookings internos. GCal outage nao bloqueia respondentes de agendar.

### Booking sync

`bookingService.Create` dispara `gcal.CreateEvent` apos persist. Evento inclui:
- Summary `{event_type.title} - {attendee_name}`
- Description com nome/email/telefone/notes
- attendees `[host (accepted), attendee (pending)]` — Google envia invite por email
- `conferenceData.createRequest.conferenceSolutionKey.type=hangoutsMeet` + `conferenceDataVersion=1` no request → Meet auto-criado
- Reminder popup 10min

Sucesso → `bookingRepo.SetGoogleEvent(google_event_id, meeting_url)`. Falha → log warn, booking persiste sem meeting_url. Frontend oculta "Acessar" automaticamente.

`bookingService.Cancel` dispara `gcal.DeleteEvent` se `google_event_id` presente. Falha de delete e log warn (host tem que limpar manual).

### Watch channels

Stub `/webhooks/gcal` recebe push notifications. Setup completo (registro + cron de renovacao 24h antes dos 7 dias + cache invalidation) deferido pra sprint futura quando Redis cache de slots existir. Sem cache, watch nao tem o que invalidar.

Schema da tabela ja tem `watch_channel_id`, `watch_resource_id`, `watch_expiry` desde Sprint A.

### Botao Acessar

Lista e modal so renderizam botao se booking tem `meeting_url`. Booking sem meet (sync GCal falhou ou host nao conectou) simplesmente oculta o CTA — sinaliza visualmente o estado degradado.

## Consequencias

**Positivas**:
- Disponibilidade reflete realidade: eventos externos no GCal do host bloqueiam slots.
- Booking criado pelo respondente aparece na agenda do host com Meet pronto, sem trabalho manual.
- Sign in with Google reduz friction de cadastro pra novos usuarios.
- Tokens encriptados em repouso atendem requisitos de compliance.

**Negativas**:
- 2 redirect URIs no Google Console obriga setup mais cuidadoso.
- Tokens encriptados nao podem ser inspecionados via `psql` direto pra debug — exige helper de decrypt.
- Soft-fail em GCal outage pode causar double-booking se busy slot do GCal nao for considerado. Mitigacao: log warn esta visivel; alertas em monitoria detectariam (~minutos).

**Pendente** (sprint futura):
- Redis cache de slots com invalidacao via watch channel.
- Cron de renovacao de watch channels.
- Setup automatico de watch apos OAuth callback.

## Referencias

- [[Google Calendar]] — brief de implementacao
- [[Scheduling Engine]] — slot calculation
- [[Fase 3 - Scheduling]]
- ADR-001 — backend Go
- ADR-004 — auth JWT
