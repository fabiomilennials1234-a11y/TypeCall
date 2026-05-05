---
title: "ADR-002: Flow Definition em JSONB, nao modelo relacional"
tags: [adr, architecture]
status: accepted
created: 2026-05-05
id: ADR-002
---

# ADR-002: Flow Definition em JSONB, nao Modelo Relacional

## Contexto

Formularios TypeCall sao compostos por steps (nodes) conectados por edges com logica condicional. A estrutura e um grafo direcionado:

```
[Welcome] → [Nome] → [Email] → [Empresa] → [Tamanho] →
  if score >= 70 → [Schedule] → [Ending A]
  if score < 70  → [Ending B]
```

Esta estrutura precisa ser:
1. **Carregada inteira** para renderizacao no builder e runner
2. **Salva inteira** a cada auto-save no builder
3. **Versionada** em cada publish (snapshot imutavel)

O builder usa conceitos de graph editor (similar ao xyflow/React Flow), operando nativamente em `{ nodes: [], edges: [] }`.

## Decisao

Armazenar o `FlowDefinition` como **coluna JSONB** na tabela `form_versions`.

```sql
CREATE TABLE form_versions (
  id UUID PRIMARY KEY,
  form_id UUID REFERENCES forms(id),
  version_number INTEGER,
  flow_definition JSONB NOT NULL,  -- { nodes: [...], edges: [...] }
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES users(id)
);
```

Estrutura do JSONB:

```json
{
  "nodes": [
    {
      "id": "uuid",
      "type": "short_text",
      "position": { "x": 0, "y": 0 },
      "data": {
        "title": "Qual seu nome?",
        "description": "",
        "properties": { "placeholder": "Digite seu nome" },
        "validations": { "required": true, "maxLength": 100 },
        "slug": "nome"
      }
    }
  ],
  "edges": [
    {
      "id": "uuid",
      "source": "node-1",
      "target": "node-2",
      "condition": null
    },
    {
      "id": "uuid",
      "source": "node-5",
      "target": "node-6",
      "condition": {
        "field": "tamanho",
        "operator": "greater_than",
        "value": 50
      }
    }
  ]
}
```

## Alternativas Consideradas

### Modelo Relacional (rejeitado)

Tabelas separadas para nodes e edges:

```sql
-- Abordagem rejeitada
CREATE TABLE flow_nodes (
  id UUID, form_version_id UUID, type TEXT, position JSONB, data JSONB
);
CREATE TABLE flow_edges (
  id UUID, form_version_id UUID, source UUID, target UUID, condition JSONB
);
```

Problemas:
- **N+1 queries**: carregar um form requer JOIN de form_version + flow_nodes + flow_edges. Com JSONB, e uma unica query.
- **Mapeamento ORM complexo**: reconstruir a estrutura `{ nodes, edges }` a partir de rows relacionais exige logica de montagem. Com JSONB, e deserializacao direta.
- **Versionamento requer copia de todas as rows**: cada publish precisaria copiar todas as rows de nodes e edges para a nova versao. Com JSONB, versionamento e trivial — 1 row = 1 snapshot completo.
- **Auto-save mais complexo**: PATCH de draft precisaria fazer diff de nodes/edges para determinar INSERT/UPDATE/DELETE. Com JSONB, e um unico UPDATE da coluna.

## Razoes da Decisao

1. **Flow carregado/salvo como unidade**: o builder e o runner sempre operam no flow completo. Nunca se carrega um unico node isoladamente. O access pattern natural e "load all, save all".

2. **xyflow opera nativamente em `{nodes, edges}`**: o formato JSONB mapeia diretamente para a estrutura que o graph editor espera. Zero transformacao entre backend e frontend.

3. **Versionamento trivial**: cada publish cria uma nova row em `form_versions` com o JSONB completo. A versao anterior e imutavel. Rollback e reativar uma versao existente. Comparacao entre versoes e diff de JSON.

4. **Auto-save eficiente**: `PATCH /api/v1/forms/{id}/draft` envia o JSONB atualizado, backend faz `UPDATE forms SET draft_flow = $1`. Uma operacao.

5. **Queries agregadas desnecessarias**: nao ha caso de uso para "buscar todos os forms que tem um node do tipo X" ou "contar edges condicionais". Os dados do flow sao sempre consumidos como unidade.

## Consequencias

### Positivas

- Simplicidade drastica no CRUD de forms
- Performance superior (1 query vs JOINs)
- Versionamento nativo e barato
- Frontend/backend com mesma estrutura de dados
- Auto-save trivial

### Negativas

- **Sem foreign keys dentro do JSONB**: integridade referencial entre nodes e edges e responsabilidade da aplicacao (flow-engine validator)
- **Queries dentro do JSONB sao possiveis mas lentas**: `flow_definition->'nodes' @> '[{"type": "schedule"}]'` funciona mas nao e performatico em escala. Se necessario, extrair campos para colunas computadas.
- **Tamanho do JSONB**: forms muito grandes (500+ steps) podem gerar JSONB de varios MB. Mitigacao: limit de steps por form (100 no Free, 500 no Enterprise).

## Validacao

O `packages/flow-engine/validator.ts` valida a integridade do FlowDefinition antes de persistir:

- Todos os edges referenciam nodes existentes
- Nao ha nodes orfaos (sem edge de entrada, exceto welcome)
- Nao ha ciclos no grafo
- Todos os nodes tem campos obrigatorios preenchidos
- Condicoes referenciam slugs validos

## Relacionamentos

- [[Form Engine]] — consumer do FlowDefinition
- [[Fase 2 - Form Builder]] — implementacao do builder e flow-engine
- [[Fusion Layer]] — step schedule como node no FlowDefinition
