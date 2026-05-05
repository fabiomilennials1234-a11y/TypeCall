---
tags:
  - dominio
  - flow
status: vivo
created: 2026-05-05
---

# Flow

O flow e o coracao do TypeCall. Define a experiencia conversacional que o respondente percorre.

---

## FlowDefinition

Armazenado como JSONB na coluna `flow_definition` de [[03 - Modelo de Dominio/Form|form_versions]].

```json
{
  "steps": [
    {
      "id": "step_01",
      "type": "welcome",
      "properties": {
        "title": "Bem-vindo!",
        "description": "Responda algumas perguntas para agendarmos uma reuniao.",
        "button_text": "Comecar"
      }
    },
    {
      "id": "step_02",
      "type": "short_text",
      "properties": {
        "label": "Qual o seu nome?",
        "placeholder": "Digite seu nome",
        "required": true,
        "max_length": 100
      }
    },
    {
      "id": "step_03",
      "type": "email",
      "properties": {
        "label": "Seu melhor email",
        "required": true
      }
    },
    {
      "id": "step_04",
      "type": "multiple_choice",
      "properties": {
        "label": "Quantos vendedores tem no seu time?",
        "choices": ["1-3", "4-10", "11-50", "50+"],
        "allow_other": false
      }
    },
    {
      "id": "step_05",
      "type": "schedule",
      "properties": {
        "event_type_id": "evt_01J...",
        "label": "Escolha o melhor horario pra conversar"
      }
    },
    {
      "id": "step_06",
      "type": "ending",
      "properties": {
        "title": "Reuniao agendada!",
        "description": "Voce recebera um email de confirmacao.",
        "show_social_share": false
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "step_01", "target": "step_02" },
    { "id": "e2", "source": "step_02", "target": "step_03" },
    { "id": "e3", "source": "step_03", "target": "step_04" },
    {
      "id": "e4",
      "source": "step_04",
      "target": "step_05",
      "condition": {
        "field": "step_04",
        "operator": "not_equals",
        "value": "1-3"
      }
    },
    {
      "id": "e5",
      "source": "step_04",
      "target": "step_06"
    },
    { "id": "e6", "source": "step_05", "target": "step_06" }
  ]
}
```

---

## StepType Enum

| Type | Descricao | Value type |
|---|---|---|
| `welcome` | Tela de boas-vindas com CTA | — |
| `short_text` | Input de texto curto | `string` |
| `long_text` | Textarea | `string` |
| `email` | Input com validacao de email | `string` |
| `phone` | Input com mascara e validacao (BR default) | `string` |
| `number` | Input numerico | `number` |
| `multiple_choice` | Selecao unica entre opcoes | `string` |
| `checkboxes` | Selecao multipla | `string[]` |
| `dropdown` | Select com busca | `string` |
| `rating` | Estrelas ou emojis (1-5, 1-10) | `number` |
| `nps` | Net Promoter Score (0-10) | `number` |
| `date` | Date picker | `string` (ISO date) |
| `file_upload` | Upload de arquivo | `string` (URL) |
| `schedule` | **O step fusao** — exibe availability e cria booking | `string` (booking_id) |
| `payment` | Pagamento inline (PIX) | `object` (transaction) |
| `statement` | Texto informativo, sem input | — |
| `ending` | Tela final | — |
| `logic_branch` | No invisivel pra branching complexo | — |

---

## Edge

Conexao direcional entre dois steps.

```typescript
interface Edge {
  id: string;
  source: string;       // step ID de origem
  target: string;       // step ID de destino
  condition?: Condition; // se ausente, e a edge default
}
```

Um step pode ter multiplas outgoing edges. A ordem de avaliacao importa:
1. Edges com `condition` sao avaliadas primeiro.
2. A primeira condition que avalia `true` vence.
3. Se nenhuma condition for `true`, a edge sem condition (default) e seguida.
4. Se nao ha edge sem condition e nenhuma condition for `true`, o flow encerra.

---

## Condition

```typescript
interface Condition {
  field: string;          // step ID cuja resposta sera avaliada
  operator: ConditionOperator;
  value: string | number | boolean | string[];
}

type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equals'
  | 'less_than_or_equals'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'            // value e array, answer esta nele
  | 'not_in';       // value e array, answer NAO esta nele
```

---

## Decisao: JSONB vs Relacional

**Escolha:** JSONB.

**Alternativa considerada:** tabelas `steps`, `edges`, `conditions` com FKs.

**Razoes pra JSONB:**
- Flow e carregado e salvo como unidade atomica — nao ha queries por step individual em runtime.
- Versionamento trivial: cada `form_version` tem o snapshot completo do flow.
- Sem joins complexos no hot path (runner carrega 1 row, 1 query).
- Schema do flow evolui com frequencia na fase de produto — JSONB e flexivel.
- Validacao do schema feita em application layer (TypeScript `flow-engine` package).

**Trade-offs aceitos:**
- Nao da pra fazer query SQL por "todos os forms que tem step do tipo schedule" de forma eficiente. Solucao: coluna materializada `has_schedule_step BOOLEAN` na tabela `forms`, atualizada no publish.
- Validacao de integridade referencial (step IDs nas edges) e responsabilidade do `flow-engine`, nao do banco.

---

## Algoritmo de Traversal

Implementado no package `flow-engine` (shared entre dashboard preview e runner).

```
function getNextStep(currentStepId, answers, flowDefinition):
  1. Pegar todas outgoing edges do currentStepId
  2. Separar: conditional edges vs default edge
  3. Para cada conditional edge (na ordem):
     a. Avaliar condition contra answers
     b. Se true → retornar edge.target
  4. Se nenhuma condition true e existe default edge:
     → retornar default edge.target
  5. Se nenhuma edge aplicavel:
     → retornar null (flow encerrado)
```

```
function getPreviousStep(currentStepId, history):
  1. history e um array de step IDs visitados
  2. Retornar history[history.length - 2]
  3. Se history.length < 2 → retornar null (esta no primeiro step)
```

**Nota:** "voltar" sempre segue o historico real, nao re-avalia condicoes. O respondente volta pelo caminho que percorreu.

---

## Validacao do Flow

Executada no publish (impede publicar flow invalido):

1. **Pelo menos 1 step** alem de welcome/ending.
2. **Todos steps alcancaveis** a partir do primeiro step (grafo conexo).
3. **Pelo menos 1 ending step** alcancavel.
4. **Sem ciclos infinitos** (deteccao de ciclos com DFS).
5. **Edges referenciam steps existentes** (source e target validos).
6. **Conditions referenciam steps anteriores** (nao pode condicionar no futuro).
7. **Schedule step referencia event_type valido** (se presente).

---

## Links

- [[03 - Modelo de Dominio/Form|Form]]
- [[03 - Modelo de Dominio/Schedule|Schedule]]
- [[03 - Modelo de Dominio/Response|Response]]
- [[01 - Produto/Glossario|Glossario]]
- [[00 - Indice|Voltar ao Indice]]
