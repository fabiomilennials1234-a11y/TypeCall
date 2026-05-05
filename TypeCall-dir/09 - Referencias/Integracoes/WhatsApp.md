---
title: WhatsApp Integration
tags: [referencias, integracoes, whatsapp]
created: 2026-05-05
status: active
---

# WhatsApp Integration

Integracao com WhatsApp via Evolution API / Uazapi para reminders, formularios nativos e distribuicao de links. Mesmo provider do ecossistema milennials.

## Provider

- **Evolution API** e **Uazapi**: APIs de WhatsApp nao-oficiais utilizadas no ecossistema Torque CRM
- Self-hosted, sem dependencia de BSP (Business Service Provider)
- Suporte a envio de mensagens, templates, midia, botoes interativos
- Instancias gerenciadas pelo time de infra

## Uso 1: Reminders de Booking

Notificacoes automaticas via WhatsApp para reduzir no-show em reunioes agendadas.

### Confirmacao Imediata

Apos booking confirmado, enviar mensagem WhatsApp para o respondente:

```
Ola, {respondent_name}! Sua reuniao foi confirmada.

📅 {event_type_title}
🕐 {start_time} ({timezone})
👤 Com: {host_name}
🔗 Link: {meeting_url}

Para reagendar ou cancelar:
{reschedule_url}
```

- Trigger: imediato apos `booking.created`
- Destinatario: `respondent_phone`
- Fallback: se WhatsApp nao disponivel, apenas email

### Reminder 24h

Lembrete enviado 24 horas antes da reuniao:

```
Lembrete: voce tem uma reuniao amanha!

📅 {event_type_title}
🕐 {start_time} ({timezone})
🔗 Link: {meeting_url}

Precisa reagendar? {reschedule_url}
```

- Trigger: cron job verifica bookings com `start_time` entre 23h e 25h no futuro
- Nao enviar se booking ja cancelado ou reagendado

### Reminder 1h

Lembrete final 1 hora antes:

```
Sua reuniao comeca em 1 hora!

🔗 {meeting_url}
```

- Trigger: cron job verifica bookings com `start_time` entre 50min e 70min no futuro
- Mensagem curta e direta com link

### Template Messages

- Mensagens proativas (iniciadas pelo TypeCall, nao pelo respondente) requerem **aprovacao da Meta** como template messages
- Submeter templates com antecedencia (aprovacao pode levar dias)
- Templates aprovados ficam disponiveis para envio via Evolution API / Uazapi
- Se templates nao aprovados: fallback para email ou aguardar aprovacao
- Templates devem ser em PT-BR com variaveis `{{1}}`, `{{2}}`, etc.

### Configuracao

- Ativar/desativar WhatsApp reminders por organizacao
- Ativar/desativar por canal: confirmacao, reminder 24h, reminder 1h (independentes)
- Texto customizavel (dentro dos limites do template aprovado)
- Phone number validation: apenas enviar para numeros BR validos (+55)

## Uso 2: WhatsApp-native Forms (v2.0)

Formularios TypeCall executados nativamente dentro de conversas WhatsApp via Copilot agent do Torque CRM.

Ver [[Torque CRM Integration]] secao "WhatsApp-native Forms" para detalhes completos.

### Resumo

- Copilot agent do Torque consome API TypeCall para conduzir fluxo de qualificacao
- Perguntas enviadas 1 por vez no chat WhatsApp
- Respostas de multiple_choice apresentadas como lista numerada
- Step `schedule`: envia link de agendamento no chat
- Respondente qualifica e agenda sem sair do WhatsApp
- Dados fluem para o CRM como se fosse um form normal

### Adaptacoes para WhatsApp

- Texto: mensagens curtas, sem Markdown avancado (WhatsApp suporta bold, italic, strikethrough)
- Multiple choice: opcoes numeradas (respondente digita o numero)
- File upload: respondente envia midia no chat, Copilot captura
- Rating/NPS: escala numerica como texto (respondente digita numero)
- Date: respondente digita data em formato livre, Copilot parseia
- Schedule: link clicavel para o calendario

## Uso 3: Distribuicao de Links

SDRs e closers enviam links de formularios TypeCall via WhatsApp para leads.

- Link: `typecall.com.br/f/{slug}` ou `typecall.com.br/f/{slug}?lead_id={uuid}` (com pre-fill)
- Preview: link gera preview com titulo e descricao do form (OG meta tags)
- Tracking: `utm_source=whatsapp` adicionado automaticamente quando link enviado via integracao
- Uso: apos conversa inicial, SDR envia link para lead preencher formulario e agendar

## Pattern Reference

- **Torque-v2**: `MessagingProvider` interface — abstrai envio de mensagens independente do provider (Evolution, Uazapi, futuro oficial)
- **v8**: integracao WhatsApp existente no Copilot e automacoes
- **Mesma instancia**: TypeCall pode reutilizar a mesma instancia WhatsApp do Torque (se organizacao for a mesma) ou ter instancia propria

## Relacionamentos

- [[Scheduling Engine]] — reminders de booking
- [[Fusion Layer]] — WhatsApp-native forms
- [[Torque CRM Integration]] — Copilot agent, distribuicao
- [[Fase 6 - Advanced]] — implementacao v1.1 (reminders) e v2.0 (native forms)
