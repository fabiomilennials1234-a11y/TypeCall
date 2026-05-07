---
title: "Fase 2 - Form Builder"
tags: [features, fase-2, form-builder]
created: 2026-05-05
status: delivered
timeline: Semanas 4-7
---

# Fase 2 — Form Builder

Primeira funcionalidade de produto visivel: criar formularios conversacionais, publica-los e coletar respostas. Entrega o builder visual, os 5 tipos core de pergunta, o flow engine, o sistema de draft/publish e o runner basico.

## Escopo

- CRUD completo de formularios e perguntas
- Builder visual drag-and-drop
- 5 tipos core: short_text, multiple_choice, email, statement, ending
- Flow engine (packages/flow-engine)
- Sistema de draft e publish (form_versions)
- Runner conversacional basico
- Link compartilhavel
- Armazenamento de respostas

## Timeline

| Semana | Foco |
|--------|------|
| 4 | API CRUD (forms, questions), migrations, draft auto-save |
| 5 | Flow engine (types, traverser, evaluator, validator), publish endpoint |
| 6 | Builder UI (@dnd-kit canvas, block palette, property panel, live preview) |
| 7 | Form runner conversacional, shareable link, response storage, integracao |

## Deliverables

### API

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/api/v1/forms` | POST | Criar formulario (cria draft inicial) |
| `/api/v1/forms` | GET | Listar formularios da organizacao |
| `/api/v1/forms/{id}` | GET | Detalhe do formulario (com draft atual) |
| `/api/v1/forms/{id}` | PATCH | Atualizar metadados do formulario |
| `/api/v1/forms/{id}` | DELETE | Soft-delete do formulario |
| `/api/v1/forms/{id}/draft` | PATCH | Auto-save do draft (FlowDefinition parcial) |
| `/api/v1/forms/{id}/publish` | POST | Publicar draft como nova form_version |
| `/api/v1/forms/{id}/questions` | POST | Adicionar pergunta ao draft |
| `/api/v1/forms/{id}/questions/{qid}` | PATCH | Atualizar pergunta |
| `/api/v1/forms/{id}/questions/{qid}` | DELETE | Remover pergunta do draft |
| `/api/v1/forms/{id}/questions/reorder` | PUT | Reordenar perguntas |
| `/api/v1/public/forms/{slug}` | GET | Form publico (runner) — retorna form_version ativa |
| `/api/v1/public/forms/{slug}/responses` | POST | Submeter resposta completa |
| `/api/v1/forms/{id}/responses` | GET | Listar respostas (admin, paginado) |

### Migrations

**`forms`**:
- `id` UUID PK
- `organization_id` UUID FK
- `title`, `slug` (unique per org)
- `status` ENUM (draft, published, archived)
- `settings` JSONB (theme, language, close_date)
- `active_version_id` UUID FK → form_versions (nullable)
- `created_at`, `updated_at`, `deleted_at`

**`form_versions`**:
- `id` UUID PK
- `form_id` UUID FK → forms
- `version_number` INTEGER (auto-increment per form)
- `flow_definition` JSONB — snapshot completo do FlowDefinition (ver [[ADR-002-flow-definition-jsonb]])
- `published_at` TIMESTAMP
- `published_by` UUID FK → users

**`questions`**:
- `id` UUID PK
- `form_id` UUID FK
- `type` ENUM (short_text, long_text, email, phone, number, url, multiple_choice, checkboxes, dropdown, picture_choice, rating, nps, opinion_scale, date, file_upload, statement, welcome, ending, schedule, payment)
- `title`, `description`
- `properties` JSONB (opcoes, placeholder, score_map, etc.)
- `validations` JSONB (required, minLength, maxLength, pattern)
- `position` INTEGER
- `created_at`, `updated_at`

**`responses`**:
- `id` UUID PK
- `form_id` UUID FK
- `form_version_id` UUID FK → form_versions
- `respondent_email`, `respondent_name`, `respondent_phone`
- `status` ENUM (in_progress, completed, abandoned)
- `started_at`, `completed_at`
- `metadata` JSONB (utm_params, referrer, device, ip_geo)
- `created_at`

**`response_answers`**:
- `id` UUID PK
- `response_id` UUID FK → responses
- `question_id` UUID FK → questions
- `value` JSONB (suporta qualquer tipo de resposta)
- `answered_at` TIMESTAMP

### packages/flow-engine

Modulo TypeScript compartilhado entre builder e runner. Define a estrutura e logica de navegacao do formulario.

**`types.ts`**:
- `FlowDefinition`: `{ nodes: FlowNode[], edges: FlowEdge[] }`
- `FlowNode`: `{ id, type, data: QuestionData, position }`
- `FlowEdge`: `{ id, source, target, condition?: Condition }`
- `Condition`: `{ field, operator, value }` — para branching condicional
- `QuestionData`: union type de todos os question types com suas propriedades

**`traverser.ts`**:
- `getNextNode(currentId, answers)` → resolve proximo node baseado em edges e condicoes
- `getPreviousNode(currentId)` → navegacao reversa
- `getProgress(currentId, answers)` → percentual de progresso estimado
- Suporta fluxo linear (v1.0) e branching condicional (v1.1)

**`evaluator.ts`**:
- `evaluateCondition(condition, answers)` → boolean
- Operadores: `equals`, `not_equals`, `contains`, `greater_than`, `less_than`, `is_empty`, `is_not_empty`
- `calculateScore(answers, scoreMap)` → numero (qualification score)

**`validator.ts`**:
- `validateAnswer(question, value)` → `{ valid: boolean, errors: string[] }`
- Validacoes por tipo: required, minLength, maxLength, pattern, custom_regex, min, max, min_selections, max_selections
- Mensagens de erro em PT-BR

### Builder UI

Interface visual para construcao de formularios.

- **Canvas central**: area principal com lista ordenada de steps, @dnd-kit para reordenacao por drag-and-drop
- **Block palette** (sidebar esquerda): blocos agrupados por categoria
  - Texto: short_text, long_text
  - Escolha: multiple_choice, dropdown
  - Contato: email
  - Estrutura: statement, ending
  - (tipos adicionais adicionados nas fases seguintes)
- **Property panel** (sidebar direita): configuracoes do step selecionado
  - Label, descricao, placeholder
  - Opcoes (para multiple_choice)
  - Validacoes (required, min/max length)
  - Response variable slug
- **Live preview**: painel lateral com preview do form no modo conversacional, atualiza em tempo real
- **Header**: titulo do form (editavel inline), status (draft/published), botao "Publicar", indicador de auto-save

### Form Runner

Renderer conversacional para respondentes.

- **Uma pergunta por vez**: exibe step atual com animacao de entrada
- **Transicoes**: slide-up com fade para proximo step, slide-down para voltar
- **Progress indicator**: barra horizontal no topo mostrando progresso
- **Validacao inline**: feedback imediato com mensagem de erro abaixo do campo
- **Navigation**: botao "Continuar" + Enter, botao "Voltar" para step anterior
- **Mobile-first**: layout full-width, teclado virtual otimizado por tipo de input
- **Submission**: ao completar ultimo step, `POST /api/v1/public/forms/{slug}/responses`

### Shareable Link

- **URL**: `typecall.com.br/f/{slug}`
- **slug**: auto-gerado a partir do titulo (slugify), editavel pelo usuario
- **Metadados OG**: titulo + descricao do form para preview em redes sociais
- **Responsivo**: mesma URL funciona em desktop e mobile

### Response Storage

- **Ingestion**: `POST /api/v1/public/forms/{slug}/responses` recebe resposta completa
- **Validacao server-side**: re-valida todas as respostas antes de persistir
- **Armazenamento**: `responses` + `response_answers` com referencia a `form_version_id`
- **Admin view**: listagem de respostas com filtros (status, data, search)

## Criterios de Aceitacao

- [ ] Criar formulario no builder com drag-and-drop
- [ ] Adicionar perguntas dos 5 tipos core (short_text, multiple_choice, email, statement, ending)
- [ ] Auto-save funciona (indicador visual confirma)
- [ ] Publicar formulario gera form_version imutavel
- [ ] Acessar `typecall.com.br/f/{slug}` renderiza o form conversacional
- [ ] Responder todas as perguntas e submeter com sucesso
- [ ] Resposta aparece na listagem do admin
- [ ] Editar draft e re-publicar cria nova versao (versao anterior intacta)
- [ ] Respostas em andamento na versao N nao sao afetadas por publish da versao N+1

## Dependencias

- [[Fase 1 - Foundation]] — API skeleton, auth, multi-tenancy

## Proxima Fase

→ [[Fase 3 - Scheduling]]
