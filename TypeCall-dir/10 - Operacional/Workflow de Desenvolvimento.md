---
tags:
  - operacional
  - workflow
created: 2026-05-05
updated: 2026-05-05
---

# Workflow de Desenvolvimento

Workflow herdado do Torque-v2 com adaptacoes para o contexto do TypeCall.

---

## Principio Central: Spec Before Code

Nenhuma linha de codigo e escrita sem documentacao previa. O fluxo e:

```
1. Spec (Obsidian + .specs/)
2. Review da spec
3. Implementacao
4. Testes
5. Code review
6. Merge
7. Atualizacao da documentacao
```

A documentacao vive em dois lugares:
- **Obsidian vault** (`TypeCall-dir/`) — Documentacao de produto, ADRs, specs de features, changelog
- **.specs/** — Specs operacionais consumidas por agentes AI e desenvolvedores

---

## Feature Branch Workflow

### Fluxo de Branches

```
main (sempre deployavel)
  │
  └── develop (branch de integracao)
        │
        ├── feature/form-builder
        ├── feature/scheduling-engine
        ├── fix/slot-timezone-calc
        └── chore/update-deps
```

### Regras

1. **Branches saem de `develop`**, nunca de `main` diretamente
2. **Nomenclatura**: `feature/`, `fix/`, `chore/` + descricao-kebab-case
3. **Pull Request** para `develop` quando a feature esta pronta
4. **Release**: `develop` → `main` via PR quando batch de features esta estavel
5. **Hotfix**: branch de `main`, merge em `main` E `develop`

### Ciclo de Vida de uma Feature

```
1. Criar branch: git checkout -b feature/form-builder develop
2. Implementar com commits frequentes (conventional commits PT-BR)
3. Abrir PR para develop (max 400 linhas)
4. CI roda automaticamente (lint + test + build)
5. Code review (humano ou agente)
6. Squash merge
7. Branch deletada automaticamente
```

---

## Pull Requests

### Regras

- **Max 400 linhas** por PR (exceto generated files como OpenAPI types)
- **Squash merge** sempre — historico limpo no develop/main
- **CI verde** obrigatorio antes do merge
- **Pelo menos 1 review** (humano ou agente)

### Template de PR

```markdown
## O que mudou
[Descricao clara do que foi implementado/corrigido]

## Por que
[Contexto e motivacao]

## Como testar
1. [Passo 1]
2. [Passo 2]
3. [Resultado esperado]

## Checklist
- [ ] Testes adicionados/atualizados
- [ ] RLS verificado (se nova tabela)
- [ ] OpenAPI spec atualizado (se nova rota)
- [ ] Documentacao atualizada
```

---

## CI/CD — GitHub Actions

### Pipeline de CI (em todo PR)

```yaml
# .github/workflows/ci.yml
jobs:
  lint-go:        # golangci-lint
  test-go:        # go test ./... (unit)
  test-go-int:    # go test -tags=integration (testcontainers)
  lint-ts:        # eslint + tsc --noEmit
  test-ts:        # vitest run
  test-e2e:       # playwright (somente em PRs para main)
  build:          # docker build (verifica que compila)
```

### Pipeline de Deploy (merge em main)

```yaml
# .github/workflows/deploy.yml
jobs:
  build-push:     # Docker build + push to registry
  deploy:         # Trigger EasyPanel redeploy via webhook
  smoke-test:     # Health check pos-deploy
```

### Regras de CI

- **Todos os jobs devem passar** antes do merge
- **Cache** de dependencias Go e pnpm entre runs
- **Matrix**: Go tests rodam em Postgres 15 + Redis 7 via services
- **Timeouts**: 10min pra unit tests, 15min pra integration, 20min pra E2E

---

## Test Coverage Thresholds

| Camada           | Minimo | Alvo  | Tipo                  |
|-----------------|--------|-------|-----------------------|
| Go unit          | 80%    | 90%+  | Table-driven tests    |
| Go integration   | 60%    | 75%+  | testcontainers        |
| TS unit          | 80%    | 90%+  | Vitest                |
| E2E              | -      | Happy paths | Playwright       |

**Enforcement**: CI falha se coverage cair abaixo do minimo.

---

## Delivery Baseada em Agentes (Futuro)

Quando o time escalar, o modelo de delivery sera baseado em agentes especializados orquestrados por um Conductor:

```
Conductor (orquestrador)
     │
     ├── Agent Backend     — Go API, services, repositories
     ├── Agent Frontend    — React, UI, components
     ├── Agent DBA         — Migrations, queries, RLS
     ├── Agent Security    — Threat model, RLS review, auth
     ├── Agent QA          — Testes, coverage, acessibilidade
     ├── Agent Infra       — Docker, CI/CD, deploy
     └── Agent Documenter  — Obsidian vault, OpenAPI, ADRs
```

Cada agente tem seu escopo, suas convencoes, e seu Definition of Done. O Conductor distribui tarefas e consolida resultados.

---

## Definition of Done

Uma feature so e considerada "done" quando TODOS os criterios abaixo sao atendidos:

### Codigo

- [ ] Testes unitarios passam (Go + TS)
- [ ] Testes de integracao passam (se aplicavel)
- [ ] Coverage acima do threshold minimo
- [ ] Nenhum `any` no TypeScript
- [ ] Nenhum erro engolido silenciosamente no Go
- [ ] Lint sem warnings

### Seguranca

- [ ] RLS policy criada e testada (se nova tabela)
- [ ] Auth middleware aplicado em toda rota protegida
- [ ] CSRF validado em toda mutacao
- [ ] Input validado (Zod no frontend, validation no handler Go)
- [ ] Nenhum dado sensivel logado

### API

- [ ] OpenAPI spec atualizado com novos endpoints
- [ ] Tipos TypeScript regenerados do spec
- [ ] Error responses documentados
- [ ] Paginacao cursor-based implementada (se listagem)

### Documentacao

- [ ] Obsidian vault atualizado (feature doc, changelog)
- [ ] ADR criado (se decisao arquitetural nova)
- [ ] Code comments em funcoes nao-obvias (English, minimalista)

### Review

- [ ] PR com max 400 linhas
- [ ] Pelo menos 1 review aprovado
- [ ] CI verde
- [ ] Squash merge

---

## Ambientes

| Ambiente    | Branch    | Acesso          | Uso                          |
|------------|-----------|-----------------|------------------------------|
| Local       | qualquer  | localhost       | Desenvolvimento (Docker Compose) |
| Staging     | develop   | staging URL     | Validacao pre-release         |
| Production  | main      | app URL         | Usuarios reais               |

### Docker Compose (Local)

```yaml
services:
  postgres:    # PostgreSQL 15 com RLS habilitado
  redis:       # Redis 7
  api:         # Go com hot-reload (air)
  web:         # Vite dev server
  mailpit:     # SMTP catch-all pra testes de email
```
