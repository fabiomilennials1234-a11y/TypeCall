---
title: "Integracao TypeCall <> Torque CRM"
tags: [referencias, integracoes, torque-crm]
created: 2026-05-05
status: active
priority: critical
---

# Integracao TypeCall ↔ Torque CRM

## Visao Geral

TypeCall e um produto standalone, mas desenhado desde o primeiro dia para ser **first-class citizen no ecossistema Torque CRM**. A integracao e bidirecional:

- **TypeCall → Torque**: dados de qualificacao e booking fluem via webhook para o CRM, criando leads e agendamentos automaticamente
- **Torque → TypeCall** (v2.0): dados do CRM pre-preenchem formularios, WhatsApp Copilot executa forms no chat, workflows disparam acoes baseadas em submissions

A integracao nao e um "conector terceiro" — e uma ponte nativa entre produtos do mesmo ecossistema, com formatos de dados compartilhados e patterns arquiteturais alinhados.

---

## Webhook Push (TypeCall → Torque)

### Trigger

Quando um formulario TypeCall e completado (ultimo step respondido) e, se houver step `schedule`, o booking esta confirmado, o TypeCall dispara um webhook para o endpoint configurado.

O endpoint padrao e o **lead-webhook do Torque CRM** — o mesmo endpoint que ja recebe leads de outras fontes (site, WhatsApp, campanhas).

### Payload Format

Payload completo compativel com o formato `lead-webhook` existente no Torque. O campo `source: "typecall"` identifica a origem.

```json
{
  "source": "typecall",
  "form_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "form_title": "Qualificacao Comercial",
  "response_id": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
  "respondent": {
    "name": "Maria Silva",
    "email": "maria@empresa.com.br",
    "phone": "+5511999887766"
  },
  "answers": [
    {
      "step_id": "11111111-aaaa-bbbb-cccc-dddddddddddd",
      "step_title": "Qual o tamanho da empresa?",
      "step_type": "multiple_choice",
      "value": "11-50 funcionarios",
      "score": 30
    },
    {
      "step_id": "22222222-aaaa-bbbb-cccc-dddddddddddd",
      "step_title": "Qual o budget mensal para a solucao?",
      "step_type": "multiple_choice",
      "value": "R$5.000 - R$20.000",
      "score": 40
    },
    {
      "step_id": "33333333-aaaa-bbbb-cccc-dddddddddddd",
      "step_title": "Descreva seu principal desafio",
      "step_type": "long_text",
      "value": "Precisamos automatizar o follow-up de leads que vem do site. Hoje perdemos muitos por demora no contato.",
      "score": null
    }
  ],
  "qualification_score": 85,
  "booking": {
    "id": "44444444-aaaa-bbbb-cccc-dddddddddddd",
    "event_type": "Discovery Call 30min",
    "event_type_id": "55555555-aaaa-bbbb-cccc-dddddddddddd",
    "start_time": "2026-05-10T14:00:00Z",
    "end_time": "2026-05-10T14:30:00Z",
    "timezone": "America/Sao_Paulo",
    "host_name": "Fabio",
    "host_email": "fabio@milennials.com",
    "meeting_url": "https://meet.google.com/abc-defg-hij",
    "status": "confirmed"
  },
  "metadata": {
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "leads-mai-2026",
    "utm_term": "crm para vendas",
    "utm_content": "variante-a",
    "referrer": "https://site.com/landing-page-crm",
    "device": "mobile",
    "browser": "Chrome 126",
    "ip": "189.40.xx.xx",
    "ip_geo": {
      "country": "BR",
      "state": "SP",
      "city": "Sao Paulo"
    },
    "completed_at": "2026-05-05T15:30:00Z",
    "completion_time_seconds": 240
  }
}
```

### Campos Condicionais

- `booking`: presente apenas se o formulario tem step `schedule` e o respondente agendou. Omitido se form sem agendamento.
- `qualification_score`: presente apenas se o form tem perguntas com score configurado. Omitido se sem scoring.
- `answers[].score`: presente apenas em steps com score configurado (multiple_choice, dropdown). `null` para tipos sem score.

### Mapeamento para Torque CRM

O lead-webhook do Torque processa o payload e cria/atualiza registros no CRM:

| Campo TypeCall | Campo Torque CRM | Comportamento |
|----------------|-----------------|---------------|
| `respondent.name` | `lead.name` | Cria ou atualiza nome do lead |
| `respondent.email` | `lead.email` | Usado para deduplicacao (match primary key) |
| `respondent.phone` | `lead.phones[0]` | Adiciona telefone ao lead |
| `qualification_score` | `lead.qualification_score` | Score numerico para priorizacao |
| `answers[]` | `lead.custom_fields` ou `lead.notes` | Respostas armazenadas como campos customizados ou nota concatenada |
| `booking` | Cria entrada em `pipe_confirmacao` | Stage: `reuniao_marcada` |
| `booking.start_time` | `pipe_confirmacao.scheduled_at` | Data/hora da reuniao |
| `booking.host_email` | `pipe_confirmacao.assigned_to` | Responsavel pela reuniao |
| `booking.meeting_url` | `pipe_confirmacao.meeting_url` | Link da reuniao |
| `metadata.utm_source` | `lead.tags[]` | Tag com source (ex: `utm:google`) |
| `metadata.utm_campaign` | `lead.tags[]` | Tag com campanha |
| `metadata.utm_medium` | `lead.custom_fields.utm_medium` | Campo customizado |
| `metadata.device` | `lead.custom_fields.device` | Dispositivo de origem |
| `metadata.ip_geo.city` | `lead.custom_fields.city` | Cidade detectada |
| `source` | `lead.source` | Valor fixo: `"typecall"` |

### Pipeline Placement

Quando o payload inclui `booking`:
1. Lead e criado/atualizado no pipeline principal
2. Card e criado no `pipe_confirmacao` no stage `reuniao_marcada`
3. Card e atribuido ao host do booking (`booking.host_email` → user match no Torque)
4. Se o Torque tem automacao de confirmacao (WhatsApp), e disparada automaticamente

Quando o payload **nao** inclui `booking` (form sem schedule step):
1. Lead e criado/atualizado no pipeline principal
2. Nenhum card em `pipe_confirmacao`
3. Lead entra no pipeline no stage configurado (default: primeiro stage)

### Retry Policy

- **Exponential backoff**: 1s → 2s → 4s → 8s → 16s
- **Max retries**: 5 tentativas
- **Timeout**: 10 segundos por tentativa
- **Dead letter queue**: apos 5 falhas, webhook_delivery entra em status `dead_letter`
- **Re-envio manual**: disponivel no dashboard do TypeCall (botao "Reenviar" na delivery)
- **Assinatura**: header `X-TypeCall-Signature` (HMAC-SHA256) para o Torque validar autenticidade

---

## Webhook Config (Torque-side)

### Endpoint Existente

O Torque ja possui um endpoint lead-webhook que aceita leads de multiplas fontes. O TypeCall usa o mesmo endpoint com `source: "typecall"`.

**Pattern existente**: `v8milennialsb2bv2/supabase/functions/lead-webhook/index.ts`

Este endpoint ja implementa:
- Recepcao de leads de multiplas fontes (site forms, WhatsApp, campanhas)
- Deduplicacao por email ou phone
- Criacao de lead com campos customizados
- Pipeline placement configuravel

### Adaptacoes Necessarias

O lead-webhook precisa de ajustes para processar payloads TypeCall:

1. **Reconhecer `source: "typecall"`**: adicionar handler especifico para payloads TypeCall
2. **Processar `booking`**: quando presente, criar card em `pipe_confirmacao` com stage `reuniao_marcada`
3. **Processar `qualification_score`**: armazenar como campo do lead para priorizacao
4. **Processar `answers[]`**: converter array de respostas em campos customizados ou nota

### Deduplicacao

Se o lead ja existe no Torque (match por email ou phone):
- **Atualizar** dados do lead ao inves de criar duplicata
- **Enriquecer**: adicionar informacoes novas sem sobrescrever existentes
- **Novo booking**: criar novo card em `pipe_confirmacao` (mesmo que lead ja tenha bookings anteriores)
- **Score**: atualizar score se novo e mais recente

### Pipeline Placement — Configuracao

Configuravel no TypeCall (webhook settings):
- **Pipeline padrao**: `pipe_confirmacao`
- **Stage padrao**: `reuniao_marcada`
- **Override por form**: cada formulario pode ter pipeline/stage diferente
- **Sem booking**: configurar stage alternativo (ex: `novo_lead`)

---

## CRM-aware Forms (Torque → TypeCall) — v2.0

Fluxo inverso: o Torque enriquece a experiencia do TypeCall com dados do CRM.

### Autenticacao

- **API key**: chave de API compartilhada entre produtos
- TypeCall armazena API key do Torque na configuracao da organizacao
- Requests autenticados via header `Authorization: Bearer {api_key}`

### Fluxo de Pre-fill

1. Lead no Torque recebe link TypeCall via email ou WhatsApp
2. Link inclui `lead_id` na query string: `typecall.com.br/f/qualificacao?lead_id=uuid`
3. Runner TypeCall detecta `lead_id` e chama Torque API server-side:
   ```
   GET https://api.torque.milennials.com/api/v1/leads/{lead_id}
   Authorization: Bearer {api_key}
   ```
4. Torque retorna dados do lead:
   ```json
   {
     "id": "uuid",
     "name": "Maria Silva",
     "email": "maria@empresa.com.br",
     "phone": "+5511999887766",
     "company": "Empresa XYZ",
     "custom_fields": {
       "tamanho_empresa": "11-50",
       "segmento": "SaaS"
     }
   }
   ```
5. TypeCall mapeia campos do lead para perguntas do formulario
6. Perguntas ja respondidas sao **automaticamente puladas**
7. Tela de boas-vindas personalizada: "Bem-vindo de volta, **Maria**! Temos algumas perguntas rapidas antes de agendar sua reuniao."

### Mapeamento de Campos

Configuravel no builder do TypeCall:
- Cada pergunta pode ser vinculada a um campo do lead no Torque
- Ex: pergunta "Qual seu email?" → campo `lead.email`
- Se o campo tem valor no CRM, pergunta e pulada

### Fallback

- Se `lead_id` nao fornecido: form normal, sem pre-fill
- Se Torque API indisponivel (timeout, erro): form normal, sem pre-fill
- Se lead nao encontrado: form normal, sem pre-fill
- **Nunca bloquear**: indisponibilidade do CRM nao impede o respondente de preencher o form

### Seguranca

- `lead_id` na query string nao expoe dados senssiveis (UUID opaco)
- Dados do lead consultados server-side (nunca expostos no client/browser)
- API key nunca enviada ao client
- Rate limiting no endpoint de consulta

---

## SSO / Auth Unificada — v2.0

Permitir que usuarios do Torque acessem o TypeCall sem login separado.

### Opcao 1: Shared JWT Validation

- Ambos os produtos validam JWTs com o mesmo secret/public key
- Torque gera JWT que TypeCall aceita (e vice-versa)
- **Pros**: simples, sem redirect, latencia zero
- **Contras**: acoplamento forte no JWT secret, claims precisam ser compativeis

### Opcao 2: OAuth2 Authorization Code Flow

- Torque como Identity Provider (IdP)
- TypeCall redireciona para Torque login → autoriza → callback com code → exchange por token
- **Pros**: padrao OAuth2, desacoplado, audit trail
- **Contras**: redirect adicional, complexidade maior

### Requisitos

- Usuario Torque acessa TypeCall sem criar conta separada
- Permissoes no TypeCall baseadas no role do Torque (admin → admin, member → member)
- `organization_id` consistente entre produtos (mesmo UUID) ou mapeamento 1:1
- Logout em um produto invalida sessao no outro (single logout)

---

## WhatsApp-native Forms — v2.0

Formularios TypeCall executados nativamente dentro de conversas WhatsApp via Copilot agent do Torque.

### Contexto

O Copilot agent do Torque CRM ja possui uma state machine para atendimento automatizado:

```
NEW_LEAD → QUALIFYING → SCHEDULING → SCHEDULED → FOLLOW_UP
```

**Pattern existente**: `v8milennialsb2bv2/supabase/functions/_shared/copilot/state-machine.ts`

### Integracao

TypeCall fornece uma API REST que o Copilot consome para conduzir o fluxo de qualificacao via WhatsApp:

**Iniciar sessao**:
```
POST /api/v1/public/whatsapp/sessions
{
  "form_id": "uuid",
  "respondent_phone": "+5511999887766",
  "respondent_name": "Maria"
}
→ { "session_id": "uuid", "first_question": { "type": "short_text", "title": "Qual o nome da sua empresa?" } }
```

**Enviar resposta e obter proxima pergunta**:
```
POST /api/v1/public/whatsapp/sessions/{session_id}/answer
{
  "value": "Empresa XYZ"
}
→ { "next_question": { "type": "multiple_choice", "title": "Quantos funcionarios?", "options": [...] } }
```

**Quando chega no step schedule**:
```
→ { "next_question": { "type": "schedule", "event_type_id": "uuid", "booking_url": "typecall.com.br/s/discovery?session=uuid" } }
```

O Copilot pode:
- Enviar o `booking_url` como link no WhatsApp (respondente abre no browser)
- Ou, se tem integracao avancada, mostrar horarios disponiveis no chat e agendar via API

**Completar sessao**:
```
POST /api/v1/public/whatsapp/sessions/{session_id}/complete
→ { "response_id": "uuid", "booking_id": "uuid", "qualification_score": 85 }
```

### Fluxo no WhatsApp

```
Copilot: Oi Maria! Antes de agendar, preciso de algumas informacoes rapidas.
Copilot: Qual o nome da sua empresa?
Maria: Empresa XYZ
Copilot: Quantos funcionarios a Empresa XYZ tem?
  1) 1-10
  2) 11-50
  3) 51-200
  4) 200+
Maria: 3
Copilot: Qual o budget mensal para a solucao?
  1) Ate R$1.000
  2) R$1.000 - R$5.000
  3) R$5.000 - R$20.000
  4) Mais de R$20.000
Maria: 3
Copilot: Perfeito! Voce pode agendar sua reuniao com nosso time neste link:
         typecall.com.br/s/discovery?session=uuid
```

### Beneficio

Lead qualifica e agenda sem sair do WhatsApp — o canal preferido do mercado brasileiro. A experiencia e natural: parece uma conversa, nao um formulario.

---

## Form-triggered Workflows — v2.0

Quando um formulario TypeCall e completado, alem do webhook de lead, o TypeCall pode disparar eventos que o workflow engine do Torque consome para executar automacoes.

### Trigger Type

`typecall_submission` — evento disponivel no workflow builder do Torque.

### Acoes Possiveis

| Acao | Descricao |
|------|-----------|
| `add_tag` | Adicionar tag ao lead (ex: `qualified`, `enterprise`, `form:qualificacao`) |
| `move_stage` | Mover lead para stage especifico no pipeline |
| `assign_sdr` | Atribuir SDR ao lead (round-robin ou por regra) |
| `send_whatsapp` | Enviar mensagem WhatsApp automatica (confirmacao, boas-vindas) |
| `create_task` | Criar tarefa para o SDR (ex: "Preparar-se para reuniao com Maria") |
| `send_email` | Enviar email de follow-up automatico |
| `update_field` | Atualizar campo customizado do lead |
| `notify_team` | Notificar canal Slack/Teams/WhatsApp da equipe |

### Configuracao

No workflow builder do Torque:
1. Trigger: `typecall_submission`
2. Condicoes: filtrar por `form_id`, `qualification_score`, respostas especificas
3. Acoes: encadear acoes em sequencia

### Pattern

Referencia: `v8milennialsb2bv2/supabase/functions/_shared/copilot/` — logica de workflow actions ja implementada no Copilot.

---

## Arquivos de Referencia no Ecossistema

Arquivos existentes em outros projetos do ecossistema que servem como referencia para a integracao:

| Arquivo | Projeto | Relevancia |
|---------|---------|------------|
| `supabase/functions/lead-webhook/index.ts` | v8milennialsb2bv2 | Webhook handler com deduplicacao de leads. Base para o handler que recebera payloads TypeCall. |
| `supabase/functions/webhook-calcom/index.ts` | v8milennialsb2bv2 | Webhook do Cal.com com closer matching e criacao de card em `pipe_confirmacao`. Pattern para o booking → pipeline flow do TypeCall. |
| `supabase/functions/_shared/copilot/state-machine.ts` | v8milennialsb2bv2 | State machine do Copilot WhatsApp. Blueprint para a integracao WhatsApp-native forms. |
| `supabase/functions/_shared/asaas.ts` | v8milennialsb2bv2 | Integracao Asaas para pagamentos. Referencia para o payment step do TypeCall e billing. |
| `torque-api/internal/service/integration/integration.go` | Torque-v2 | Interface `CalendarProvider` com metodos `GetFreeBusy`, `CreateEvent`, `DeleteEvent`. TypeCall implementa a mesma interface no pacote `integration/gcal`. |
| `torque-api/internal/handler/meetings/meetings.go` | Torque-v2 | Meeting handler com criacao async de Google Calendar events. Pattern para o booking handler do TypeCall. |

### Notas de Convergencia

- O TypeCall reutiliza patterns do Torque-v2 (Go, middleware, auth) — nao e uma copia, mas segue as mesmas decisoes arquiteturais
- O formato do webhook e compativel com o lead-webhook existente por design — nao requer mudancas breaking no Torque
- A API WhatsApp sessions e nova no TypeCall, mas consome o flow-engine existente internamente
- A longo prazo, pacotes compartilhados (auth, gcal, whatsapp) podem ser extraidos para um modulo Go reutilizavel entre Torque-v2 e TypeCall

---

## Relacionamentos

- [[Fusion Layer]] — CRM bridge, pre-fill, WhatsApp-native forms
- [[Scheduling Engine]] — booking data no payload
- [[Analytics]] — conversion attribution via CRM
- [[Asaas Payments]] — payment step e billing
- [[WhatsApp]] — canal de comunicacao
- [[Google Calendar]] — eventos criados no booking
- [[Fase 5 - Analytics e Webhooks]] — implementacao do webhook system
- [[Fase 6 - Advanced]] — features v2.0 (pre-fill, SSO, workflows, WhatsApp forms)
- [[ADR-001-backend-go-nao-supabase]] — convergencia de stack com Torque-v2
- [[ADR-004-auth-jwt-httponly]] — base para SSO futuro
