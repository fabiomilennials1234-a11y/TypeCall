---
title: Asaas Payments Integration
tags: [referencias, integracoes, asaas, pix]
created: 2026-05-05
status: active
---

# Asaas Payments Integration

Integracao com Asaas para pagamentos inline em formularios (PIX, cartao de credito, boleto) e para billing/subscription do proprio TypeCall.

## Uso 1: Payment Step Inline no Form (v2.0)

Step `payment` dentro do fluxo conversacional do [[Form Engine]]. Permite cobrar antes ou apos o agendamento.

### PIX

1. Respondente chega no step `payment`
2. TypeCall chama Asaas API para criar cobranca:
   ```
   POST https://api.asaas.com/v3/payments
   {
     "customer": "{asaas_customer_id}",
     "billingType": "PIX",
     "value": 150.00,
     "description": "Consultoria Inicial - 30min",
     "externalReference": "typecall:{response_id}"
   }
   ```
3. Asaas retorna `pixQrCodeUrl` e `pixCopiaECola`
4. Runner exibe QR code e codigo copia-e-cola para o respondente
5. Respondente escaneia o QR code no app do banco
6. Asaas envia webhook `payment.confirmed` para TypeCall
7. TypeCall libera proximo step do formulario

### Cartao de Credito

- **Asaas hosted fields**: campos de cartao renderizados pelo Asaas dentro do iframe do TypeCall (PCI compliance — dados do cartao nunca tocam servidores TypeCall)
- **Tokenizacao**: Asaas tokeniza o cartao e processa o pagamento
- **3D Secure**: suportado quando exigido pelo emissor
- **Parcelamento**: configuravel (2x a 12x)

### Boleto

- Asaas gera boleto com codigo de barras
- Respondente pode pagar via app do banco ou agencia
- Prazo configuravel (default: 3 dias uteis)
- Webhook `payment.confirmed` libera proximo step
- Alternativa para respondentes sem PIX ou cartao

### Webhook de Confirmacao

```
POST https://api.typecall.com.br/api/v1/webhooks/asaas
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_xxxx",
    "externalReference": "typecall:{response_id}",
    "value": 150.00,
    "billingType": "PIX",
    "status": "CONFIRMED",
    "confirmedDate": "2026-05-05"
  }
}
```

**Processamento**:
1. Validar assinatura do webhook (Asaas access token)
2. Extrair `response_id` do `externalReference`
3. Atualizar step `payment` da response como `paid`
4. Se respondente ainda esta no form (WebSocket ativo), notificar runner para avancar
5. Se respondente ja saiu, pagamento registrado mas fluxo nao avanca (respondente pode retomar)

### Timeout de Pagamento

- PIX: 30 minutos para pagamento (configuravel)
- Boleto: 3 dias uteis
- Se expirar: cobranca cancelada, respondente pode reiniciar
- Countdown visual no runner para PIX

## Uso 2: Billing / Subscription do TypeCall (v2.0)

Cobranca recorrente dos clientes do TypeCall.

### Planos

| Plano | Preco | Limites |
|-------|-------|---------|
| **Free** | R$0 | 100 respostas/mes, 1 form, 1 event type, sem embed, branding TypeCall |
| **Pro** | R$97/mes | Ilimitado respostas e forms, embed, theme, analytics, webhooks, remover branding |
| **Enterprise** | Custom | Tudo do Pro + SSO, custom domain, white-label, SLA, suporte dedicado |

### Asaas Subscription

- Asaas gerencia subscriptions recorrentes
- Criacao: `POST /v3/subscriptions` com `cycle: "MONTHLY"`
- Cobranca automatica no dia do vencimento
- Webhook `PAYMENT_CONFIRMED` ou `PAYMENT_OVERDUE` para controle de acesso

### Trial

- 14 dias de Pro gratis para novas organizacoes
- Sem cartao de credito no trial
- Ao expirar: downgrade automatico para Free
- Notificacoes: email 7 dias antes, 3 dias antes, 1 dia antes, dia do vencimento

### Upgrade / Downgrade

- **Upgrade**: acesso imediato, cobranca proporcional ao periodo restante
- **Downgrade**: acesso Pro ate fim do periodo pago, depois limites Free aplicados
- **Cancelamento**: mantém acesso até fim do período, depois Free

### Enforcement de Limites

- Middleware verifica plano da organizacao em cada request
- Free: bloqueia criacao de form se limite atingido
- Free: bloqueia embed e webhooks
- Respostas: contador mensal, reset no primeiro dia do mes

## Pattern Reference

**Arquivo existente**: `v8milennialsb2bv2/supabase/functions/_shared/asaas.ts`

Este arquivo contem:
- Funcoes helper para chamadas a Asaas API
- Criacao de customer, cobranca PIX, boleto
- Processamento de webhooks
- Referencia direta para a implementacao no TypeCall

## Relacionamentos

- [[Form Engine]] — step `payment` como question type
- [[Fusion Layer]] — payment condicional dentro do fluxo
- [[Fase 6 - Advanced]] — implementacao v2.0
- [[Torque CRM Integration]] — billing compartilhado no ecossistema
- [[Roadmap]] — PIX payment e billing no v2.0
