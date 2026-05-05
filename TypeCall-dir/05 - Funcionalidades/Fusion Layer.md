---
title: Fusion Layer
tags: [funcionalidades, fusion]
created: 2026-05-05
status: active
---

# Fusion Layer

A Fusion Layer e a **inovacao central do TypeCall** — a capacidade de combinar qualificacao por formulario e agendamento de reuniao em um unico fluxo conversacional. Nenhum concorrente no mercado BR oferece essa experiencia nativa.

## Core Innovation

O TypeCall introduz o step type `schedule` dentro do fluxo conversacional. Em vez de formulario separado + link de calendario separado, o respondente qualifica-se e agenda no mesmo fluxo, sem atrito.

Fluxo tipico:

```
Welcome → Nome → Email → Empresa → Tamanho → Budget → [schedule] → Ending
```

O respondente responde perguntas de qualificacao e, ao chegar no step de agendamento, ve o calendario inline sem sair do formulario.

## Como Funciona

O step `schedule` e implementado como um question type `calendar_booking` no [[Form Engine]].

- **Configuracao no builder**: ao adicionar um bloco `schedule`, o criador seleciona um `event_type_id` existente (ver [[Scheduling Engine]])
- **Renderizacao no runner**: quando o respondente chega nesse step, o runner renderiza o componente de calendario inline — selecao de data, selecao de horario, confirmacao
- **Dados coletados**: o booking criado e armazenado como `response_answer` do step, contendo `booking_id`, `start_time`, `end_time`, `host`
- **Continuidade**: apos confirmar agendamento, o fluxo continua para os steps seguintes (ending, payment, etc.)

### Sequencia tecnica

1. Runner chega no step `calendar_booking`
2. Carrega `event_type_id` referenciado
3. Chama `GET /api/v1/public/event-types/{id}/slots?timezone={tz}&range=30d`
4. Renderiza calendario com slots disponiveis
5. Respondente seleciona data e horario
6. `POST /api/v1/public/bookings` com dados do respondente + slot selecionado
7. Booking criado atomicamente (ver [[Scheduling Engine]] — Booking Creation)
8. Resposta do step armazenada com `booking_id`
9. Runner avanca para proximo step

## Booking Condicional

O agendamento pode ser condicionado a respostas anteriores via logic branching.

- **Caso de uso**: mostrar step de agendamento **apenas** se o respondente atende criterios minimos de qualificacao
- **Implementacao**: edge condicional no FlowDefinition — se `qualification_score >= 70`, redireciona para step `schedule`; caso contrario, pula para `ending` com mensagem generica
- **Exemplo**:
  - Empresa com < 10 funcionarios → ending "Obrigado! Entraremos em contato por email."
  - Empresa com 10+ funcionarios → step `schedule` → ending "Reuniao confirmada!"
- **Configuracao**: via painel de logica condicional no builder (v1.1 — branching visual)

## Qualification Score

Pontuacao automatica baseada nas respostas do formulario. Permite priorizar leads antes mesmo do agendamento.

- **Score por opcao**: cada opcao de `multiple_choice` ou `dropdown` pode ter um `score` numerico atribuido no builder
- **Calculo**: soma dos scores de todas as respostas com score definido
- **Normalizacao**: score final como percentual (0-100) baseado no score maximo possivel
- **Uso**: condicionar exibicao do step `schedule`, rotear para calendarios diferentes, enviar para o CRM com prioridade
- **Exemplo de scoring**:

| Pergunta | Opcao | Score |
|----------|-------|-------|
| Tamanho da empresa | 1-10 | 10 |
| Tamanho da empresa | 11-50 | 30 |
| Tamanho da empresa | 51-200 | 50 |
| Tamanho da empresa | 200+ | 70 |
| Budget mensal | < R$1k | 5 |
| Budget mensal | R$1k-5k | 20 |
| Budget mensal | R$5k-20k | 40 |
| Budget mensal | > R$20k | 60 |

Score maximo possivel: 130. Respondente que escolhe "51-200" (50) + "R$5k-20k" (40) = 90/130 = **69%**.

## Roteamento Condicional

Baseado no score ou em respostas especificas, o fluxo pode direcionar para calendarios diferentes.

- **Enterprise → Senior Rep**: se score >= 80 ou "200+ funcionarios", roteia para event_type do senior sales rep
- **SMB → SDR**: se score < 80, roteia para event_type do SDR
- **Sem agendamento**: se score < 30, pula o step de schedule e encerra com mensagem padrao
- **Implementacao**: multiplos steps `schedule` no FlowDefinition, cada um referenciando um `event_type_id` diferente, conectados por edges condicionais
- **Regras**: configuradas no builder via interface visual de branching (v1.1)

## CRM Bridge

Na conclusao do formulario + booking, o TypeCall envia os dados para o [[Torque CRM Integration]].

- **Trigger**: on `form_completion` (ultimo step respondido + booking confirmado)
- **Metodo**: `POST` para endpoint configurado (padrao: Torque lead-webhook)
- **Payload**: formato compativel com lead-webhook existente do Torque
  - `source: "typecall"`
  - Campos do respondente mapeados para lead fields
  - `qualification_score` como campo dedicado
  - `booking` com detalhes da reuniao agendada
  - `metadata` com UTM params, referrer, device, geo
- **Mapeamento**: ver [[Torque CRM Integration]] para detalhes completos do payload e mapeamento
- **Retry**: exponential backoff com dead letter queue

## Pre-fill from CRM (v2.0)

Quando um lead ja existente no Torque CRM clica em um link TypeCall, o formulario pode ser pre-preenchido.

- **Reconhecimento**: query string inclui `lead_id` ou `email` do CRM
- **API call**: TypeCall chama `GET /api/v1/leads/{id}` no Torque com API key
- **Skip logic**: perguntas cujas respostas ja existem no lead record sao automaticamente puladas
- **Personalizacao**: "Bem-vindo de volta, **{{lead.name}}**! Temos algumas perguntas rapidas antes de agendar."
- **Fallback**: se lead nao encontrado ou API indisponivel, formulario funciona normalmente sem pre-fill
- **Seguranca**: API key autenticacao entre produtos, dados do lead nunca expostos no client-side

## WhatsApp-native Forms (v2.0)

Formularios TypeCall executados nativamente dentro de conversas WhatsApp via Copilot.

- **Copilot agent**: o agent do Torque CRM ja possui state machine (`NEW_LEAD → QUALIFYING → SCHEDULING → SCHEDULED`)
- **API de perguntas**: TypeCall fornece API que retorna a proxima pergunta do fluxo dado o estado atual da resposta
- **Fluxo no chat**: Copilot consome a API e apresenta perguntas uma por vez na conversa WhatsApp
- **Step schedule**: quando o fluxo chega no step `schedule`, Copilot envia link de agendamento ou agenda diretamente via API
- **Pattern**: referencia `v8milennialsb2bv2/supabase/functions/_shared/copilot/state-machine.ts`
- **Beneficio**: lead qualifica e agenda sem sair do WhatsApp — canal preferido do mercado BR

## Relacionamentos

- [[Form Engine]] — step `schedule` e um question type nativo do form engine
- [[Scheduling Engine]] — responsavel pelo calculo de disponibilidade e criacao de bookings
- [[Analytics]] — metricas de conversao do fluxo fusionado
- [[Torque CRM Integration]] — destino dos dados de qualificacao e booking
- [[WhatsApp]] — canal alternativo para execucao de forms
- [[Fase 3 - Scheduling]] — implementacao do fusion step
