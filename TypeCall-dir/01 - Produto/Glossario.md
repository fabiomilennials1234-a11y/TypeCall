---
tags:
  - produto
  - glossario
status: vivo
created: 2026-05-05
---

# Glossario

Vocabulario padrao do dominio TypeCall. Toda documentacao, codigo e comunicacao devem usar esses termos de forma consistente.

---

## Formularios e Fluxos

| Termo | Definicao |
|---|---|
| **Form** | Container top-level. Pertence a uma organizacao. Tem slug unico, status (draft/published/archived), tema e configuracoes. |
| **Step** | Unidade atomica de interacao dentro de um flow. Cada step tem um `StepType`, propriedades especificas e validacoes. |
| **Flow** | Grafo dirigido de steps conectados por edges. Define a experiencia conversacional do respondente. |
| **FlowDefinition** | Representacao JSON do flow inteiro: `{ steps: Step[], edges: Edge[] }`. Armazenado como JSONB na `form_versions`. |
| **Edge** | Conexao entre dois steps. Pode ter uma `Condition` opcional que determina se a transicao acontece. |
| **Condition** | Regra logica avaliada contra respostas do respondente. Formato: `field + operator + value`. |
| **StepType** | Enum que define o tipo de interacao: `welcome`, `short_text`, `long_text`, `email`, `phone`, `number`, `multiple_choice`, `checkboxes`, `dropdown`, `rating`, `nps`, `date`, `file_upload`, `schedule`, `payment`, `statement`, `ending`, `logic_branch`. |

## Respostas

| Termo | Definicao |
|---|---|
| **Response** | Submission completa de um form por um respondente. Vinculada a uma `form_version` especifica. |
| **Answer** | Resposta individual a um step. Valor polimorfico em JSONB (texto, escolhas, numero, URL de arquivo, booking_id). |
| **Respondent** | Pessoa que preenche o form. Pode ser anonima ou identificada (via email/phone coletado no flow). |

## Agendamento

| Termo | Definicao |
|---|---|
| **Event Type** | Template de agendamento. Define duracao, buffer, min_notice, max_advance, max_per_day. Pertence a um usuario ou time. |
| **Availability Rule** | Regra de disponibilidade semanal. Define dia da semana, horario de inicio/fim e timezone. |
| **Booking** | Reuniao confirmada. Vincula event_type, host(s), respondente, horario e opcionalmente uma response (form). |
| **Schedule Step** | O step fusao — momento no flow conversacional onde o respondente ve a disponibilidade e agenda a reuniao. O diferencial central do TypeCall. |
| **Slot** | Horario disponivel calculado a partir das availability rules menos conflitos de calendario. |
| **Buffer** | Tempo minimo entre reunioes consecutivas (antes e/ou depois). |
| **Min Notice** | Antecedencia minima pra agendamento. Ex: "nao aceitar bookings com menos de 2h de antecedencia". |
| **Max Advance** | Horizonte maximo de agendamento. Ex: "permitir agendamento ate 30 dias no futuro". |
| **Host** | Usuario que recebe a reuniao. Dono do calendario e da availability. |

## Infraestrutura e Integracao

| Termo | Definicao |
|---|---|
| **Embed** | Incorporacao do form em site externo via iframe + JS SDK. |
| **Runner** | Aplicacao lightweight que renderiza o form pro respondente. Roda dentro do iframe no embed ou como pagina standalone. |
| **Builder** | Interface drag-and-drop no dashboard onde o usuario cria e edita forms/flows. |
| **Webhook** | Callback HTTP disparado em eventos (response_completed, booking_created, booking_cancelled). |
| **CRM Bridge** | Modulo de integracao nativa com Torque CRM. Sincroniza leads, deals e atividades bidirecionalmente. |

---

## Convencoes

- Termos em **ingles** no codigo, **portugues** na UI.
- Nomes de entidades no singular: `Form`, nao `Forms`.
- IDs sempre UUID v7 (ordenavel por tempo).
- Timestamps sempre UTC no banco, timezone do usuario na UI.

---

## Links

- [[01 - Produto/Visao do Produto|Visao do Produto]]
- [[01 - Produto/Personas e ICP|Personas e ICP]]
- [[00 - Indice|Voltar ao Indice]]
