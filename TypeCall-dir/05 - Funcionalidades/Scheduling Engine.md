---
title: Scheduling Engine
tags: [funcionalidades, scheduling]
created: 2026-05-05
status: active
---

# Scheduling Engine

O Scheduling Engine permite que respondentes agendem reunioes diretamente dentro do fluxo conversacional do TypeCall. Inspirado no Calendly, mas construido para funcionar como step nativo de um formulario — a inovacao central do produto (ver [[Fusion Layer]]).

## Event Types

Tipos de evento configuraveis pelo usuario. Cada event type define as regras de uma reuniao.

| Propriedade | Descricao |
|-------------|-----------|
| `duration` | Duracao da reuniao em minutos (15, 30, 45, 60, custom) |
| `buffer_before` | Tempo minimo livre antes da reuniao (ex: 10min para preparacao) |
| `buffer_after` | Tempo minimo livre apos a reuniao (ex: 15min para anotacoes) |
| `min_notice` | Antecedencia minima para agendamento (ex: 2h — nao permite agendar com menos de 2h de antecedencia) |
| `max_advance` | Horizonte maximo de agendamento (ex: 30 dias — nao mostra slots alem de 30 dias) |
| `max_per_day` | Limite maximo de reunioes por dia para o host (ex: 5 — protege contra sobrecarga) |

- Cada event type pertence a uma `organization` e pode ser atribuido a um ou mais membros
- Campos customizaveis: titulo, descricao, localizacao (Google Meet auto, link customizado, presencial)
- Slug unico para link direto: `typecall.com.br/s/{slug}`

## Availability Rules

Regras de disponibilidade semanal por membro da equipe.

- **Horario semanal**: configuracao por dia da semana (ex: Seg-Sex 09:00-12:00, 14:00-18:00)
- **Multiplos intervalos por dia**: permite configurar manha e tarde separadamente, ou horarios fragmentados
- **Por membro**: cada membro tem suas proprias regras de disponibilidade
- **Override por data**: sobrescreve regras semanais para datas especificas (ferias, compromissos pessoais)
- **Feriados BR pre-carregados**: feriados nacionais brasileiros ja vem configurados como indisponiveis. Usuario pode reativar se necessario.
- **Feriados estaduais**: configuraveis por organizacao com base no estado (UF)

## Calendar Sync

Integracao bidirecional com calendarios externos para evitar conflitos.

### Google Calendar (v1.0)

- **OAuth 2.0**: fluxo de autorizacao com consentimento granular
- **Token storage**: tokens criptografados com AES-256-GCM no banco de dados — ver [[Google Calendar]]
- **Scopes**: `calendar.readonly` (leitura de busy/free), `calendar.events` (criacao de eventos)
- **Token refresh**: renovacao automatica dentro de 2min antes do vencimento, com circuit breaker para falhas consecutivas

### Outlook / Microsoft 365 (v1.1)

- **MS Graph API**: autorizacao via Azure AD OAuth 2.0
- **Scopes**: `Calendars.ReadWrite`
- **Paridade funcional**: mesmas capacidades do Google Calendar (busy check, event creation)

## Availability Calculation

Algoritmo de 7 etapas para calcular slots disponiveis. Executado on-demand quando respondente acessa o calendario.

```
1. Generate Candidates
   → Gerar todos os slots possiveis com base nas availability_rules do host
   → Intervalo: duration do event_type, stepping: 15min
   → Horizonte: hoje + min_notice ate hoje + max_advance

2. Subtract Busy
   → Consultar Google Calendar freeBusy API (ou cache Redis)
   → Remover slots que conflitam com eventos existentes

3. Apply Buffers
   → Subtrair buffer_before e buffer_after de cada slot
   → Slot que colide com buffer de outro evento e removido

4. Apply Min Notice
   → Remover slots com inicio < agora + min_notice

5. Apply Max Per Day
   → Contar bookings existentes por dia
   → Remover todos os slots de dias que ja atingiram max_per_day

6. Apply Overrides
   → Aplicar availability_overrides (feriados, bloqueios manuais)
   → Slots em datas com override "unavailable" sao removidos
   → Overrides com horarios customizados substituem regras semanais

7. Return Available Slots
   → Agrupar por dia, ordenar cronologicamente
   → Retornar com timezone do respondente (convertido de UTC)
```

- **Cache**: resultado da freeBusy API cacheado no Redis com TTL de 15min
- **Invalidacao**: Watch channels do Google Calendar invalidam cache quando calendario muda
- **Performance**: algoritmo inteiro executa em < 50ms para horizonte de 30 dias

## Booking Creation

Processo atomico de criacao de agendamento. Projetado para prevenir double-booking.

1. **Lock**: `SELECT ... FOR UPDATE` no slot de tempo — impede que dois respondentes agendem o mesmo horario simultaneamente
2. **Re-validate**: re-executa availability check apos adquirir o lock (protege contra race condition)
3. **Create booking**: insere registro em `bookings` com status `confirmed`
4. **Google Calendar event**: cria evento no calendario do host com attendees (host + respondente)
5. **Google Meet**: auto-cria link Google Meet via `conferenceData` na criacao do evento
6. **Confirmation email**: envia email PT-BR para respondente e host via Resend — ver [[Fase 3 - Scheduling]]
7. **Release lock**: commit da transacao

- **Atomicidade**: todo o processo e uma unica transacao DB. Se qualquer step falha, rollback completo.
- **Idempotencia**: booking_id gerado antes da transacao, retry seguro

## Timezone

Tratamento rigoroso de timezones para evitar ambiguidades.

- **Banco de dados**: tudo armazenado em **UTC** (timestamp with time zone)
- **IANA timezone database**: referencia oficial para conversoes (ex: `America/Sao_Paulo`)
- **Auto-detect respondente**: detecta timezone do respondente via `Intl.DateTimeFormat().resolvedOptions().timeZone` no browser
- **Exibicao**: slots exibidos no timezone do respondente, com indicador visual do timezone
- **DST (horario de verao)**: tratado automaticamente pela IANA database. Slots que caem em transicao DST sao ajustados corretamente.
- **Host timezone**: configuravel por membro, usado nas availability_rules

## Reminders

Notificacoes automaticas para reduzir no-shows.

### Email

- **24h antes**: email de lembrete com detalhes da reuniao, link Meet, opcoes de reschedule/cancel
- **1h antes**: lembrete final com link direto para a reuniao
- Provider: Resend (transactional email)

### WhatsApp

- **Confirmacao**: mensagem imediata apos booking com resumo da reuniao — via [[WhatsApp]] (Evolution API / Uazapi)
- **Reminder 24h**: lembrete com detalhes e link
- **Template messages**: requerem aprovacao da Meta para envio proativo
- Fallback: se WhatsApp nao configurado ou indisponivel, apenas email

## Reschedule / Cancel

Links unicos para reagendamento e cancelamento sem necessidade de login.

- **Tokens**: cada booking gera tokens unicos (UUID v4) para reschedule e cancel
- **Links no email**: incluidos em todos os emails de confirmacao e reminder
- **Reschedule flow**: abre interface de selecao de novo horario, cancela slot antigo, cria novo booking
- **Cancel flow**: confirma cancelamento, libera slot, atualiza Google Calendar event (status: cancelled)
- **Politica de cancelamento**: configuravel — ex: nao permitir cancelamento com menos de 2h de antecedencia
- **Google Calendar sync**: reagendamento e cancelamento refletidos automaticamente no calendario do host

## Team Scheduling (v2.0)

Funcionalidades avancadas para equipes.

### Round-robin (weighted)

- Distribui agendamentos entre membros da equipe de forma rotativa
- **Peso configuravel**: membros podem ter pesos diferentes (ex: senior rep recebe 2x mais que junior)
- **Equalizacao**: algoritmo prioriza membros com menos reunioes no periodo
- **Fallback**: se membro preferido nao tem disponibilidade, redireciona para proximo

### Collective (find common free time)

- Para reunioes que exigem presenca de multiplos membros simultaneamente
- Calcula intersecao de disponibilidade de todos os participantes obrigatorios
- Participantes opcionais: marcados como "nice to have", nao bloqueiam slots

## Relacionamentos

- [[Form Engine]] — step `schedule` e um question type nativo
- [[Fusion Layer]] — orquestracao entre qualificacao e agendamento
- [[Google Calendar]] — integracao OAuth e sync bidirecional
- [[WhatsApp]] — canal de reminders
- [[Fase 3 - Scheduling]] — feature phase de implementacao
- [[Torque CRM Integration]] — booking data enviado pro CRM
