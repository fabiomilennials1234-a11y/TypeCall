---
tags:
  - produto
  - visao
status: vivo
created: 2026-05-05
---

# Visao do Produto

> TypeCall = Typeform + Calendly fundidos, com DNA milennials.

---

## Problema

Times de vendas B2B no Brasil operam com uma stack fragmentada:

1. **Typeform** (ou similar) pra qualificacao de leads — formularios conversacionais bonitos, mas sem agendamento.
2. **Calendly** (ou similar) pra scheduling — links de agenda, mas sem contexto de qualificacao.
3. **CRM** separado — dados duplicados, integracao manual, perda de contexto.

O resultado:

- Lead responde formulario → e redirecionado pra outra ferramenta → abandona.
- SDR recebe lead qualificado mas precisa mandar outro link pra agendar → lead esfria.
- Dados de qualificacao e dados de agendamento vivem em sistemas diferentes → analytics fragmentado.
- Ferramentas internacionais sem suporte nativo a CNPJ, CPF, CEP, feriados nacionais, WhatsApp.

**A friccao entre qualificar e agendar mata conversao.**

---

## Solucao

Um unico fluxo conversacional onde o lead:

1. Responde perguntas de qualificacao
2. Recebe um score automatico
3. Agenda a reuniao com o vendedor certo
4. Tudo sem sair da experiencia

O vendedor recebe a reuniao no calendario ja com todo o contexto de qualificacao anexado. O gestor ve analytics fim-a-fim: da primeira resposta ate a reuniao realizada.

---

## 5 Diferenciais

### 1. WhatsApp-native forms
Links que abrem direto no WhatsApp com preview rico. Experiencia otimizada pra mobile-first. Compartilhamento nativo via WhatsApp — o canal #1 de vendas B2B no Brasil.

### 2. PIX-first
Step de pagamento nativo com PIX QR code inline no fluxo. Sem redirect pra gateway externo. Confirmacao em tempo real via webhook.

### 3. CRM-aware
Integracao nativa com [[00 - Indice|Torque CRM]]. Lead criado ou atualizado automaticamente. Pipeline movido. Atividade registrada. Zero trabalho manual.

### 4. Qualify + Book + Score em 1 fluxo
O step `schedule` vive dentro do flow como qualquer outro step. Condicional: so mostra agenda se o lead atingir score minimo. O booking ja carrega todas as respostas de qualificacao.

### 5. PT-BR nativo
Validacao de CNPJ, CPF, CEP com busca automatica de endereco. Feriados nacionais e estaduais integrados na availability. Idioma, moeda, fuso horario brasileiros como default — nao como traducao.

---

## Modelo de Negocio

SaaS com 3 tiers:

| | Free | Pro | Enterprise |
|---|---|---|---|
| **Forms** | 3 | Ilimitados | Ilimitados |
| **Respostas/mes** | 100 | Ilimitadas | Ilimitadas |
| **Calendarios** | 1 | Ilimitados | Ilimitados |
| **Custom domain** | — | Sim | Sim |
| **Analytics avancado** | — | Sim | Sim |
| **Remocao de branding** | — | Sim | Sim |
| **Team scheduling** | — | — | Sim |
| **Round-robin** | — | — | Sim |
| **API access** | — | — | Sim |
| **SSO (SAML)** | — | — | Sim |
| **SLA dedicado** | — | — | Sim |

---

## Metricas Norte

| Metrica | Definicao | Meta v1 |
|---|---|---|
| **Completion Rate** | % de respondentes que completam o form inteiro | > 65% |
| **Booking Conversion Rate** | % de forms completos que resultam em reuniao agendada | > 40% |
| **Time-to-Meeting** | Tempo medio entre primeiro contato e reuniao confirmada | < 24h |
| **NPS do Respondente** | Satisfacao do lead com a experiencia | > 50 |
| **Revenue per Form** | Receita media gerada por form ativo (tier Pro+) | Tracking |

---

## Links

- [[01 - Produto/Personas e ICP|Personas e ICP]]
- [[01 - Produto/Glossario|Glossario]]
- [[02 - Arquitetura/Visao Geral|Arquitetura]]
- [[00 - Indice|Voltar ao Indice]]
