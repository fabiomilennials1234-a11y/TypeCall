# TypeCall — CLAUDE.md

## Produto

TypeCall = Typeform + Calendly fundidos, DNA milennials. Qualificacao + agendamento em um fluxo conversacional.

## Stack

Go 1.25+ / chi / pgx / PostgreSQL 15+ / Redis | React 18 / TypeScript strict / Vite 6 / Tailwind 4 / shadcn/ui | Docker distroless / Hostinger VPS / EasyPanel / GitHub Actions

## Monorepo

```
apps/api/      → Go backend
apps/web/      → React dashboard SPA
apps/embed/    → Lightweight embed runtime
packages/flow-engine/ → Shared flow logic (TS)
packages/shared/      → Shared types
```

## Protocolo de agentes

### Time

| Agente | Skill | Funcao |
|--------|-------|--------|
| **Engenheiro** | `tc-engenheiro` | Orquestra construcao, decompos tarefas, valida arquitetura, mantem roadmap |
| **Dev Senior** | `tc-dev-senior` | Decisoes tecnicas, code review, seguranca, performance, poder de veto |
| **Dev Pleno** | `tc-dev-pleno` | Executa codigo: Go, React, SQL, testes, migrations, embed |

### Fluxo obrigatorio

```
Tarefa do usuario
    |
    v
tc-engenheiro (SEMPRE primeiro)
    |
    +--> Analisa impacto, le contexto, decompoe
    |
    +--> Decisao complexa? --> tc-dev-senior (parecer)
    |
    +--> Execucao de codigo --> tc-dev-pleno (com brief denso)
    |
    +--> Review pos-execucao --> tc-dev-senior (se toca auth/security/DB)
    |
    v
Documentacao atualizada (STATE.md, vault)
```

**REGRA:** Toda tarefa passa pelo Engenheiro primeiro. Dev Pleno so executa com brief. Dev Senior so e invocado pra decisoes e reviews.

### Invocacao

```
# Engenheiro orquestra
Skill tool → tc-engenheiro

# Engenheiro invoca Dev Pleno com brief
Skill tool → tc-dev-pleno

# Engenheiro invoca Dev Senior pra decisao/review
Skill tool → tc-dev-senior
```

### Quando invocar Dev Senior

- Nova tabela no banco (review de schema + RLS)
- Feature que toca auth ou permissoes
- Integracao com servico externo (GCal, Asaas, WhatsApp)
- Decisao entre duas abordagens tecnicas
- Code review antes de "shipar" feature completa
- Qualquer coisa que afete seguranca ou multi-tenancy

## Protocolo de git

### Topologia

Linear cumulativa (identico Torque-v2). Sem fan-out.

```
main (protegida)
  ^
develop (trunk)
  ^
fase/F0X (born from develop)
```

### Ordem de commits por fase

1. `feat(db):` — migrations, schema, RLS
2. `feat(api):` — handlers, services, repositories
3. `test(api):` — unit + integration tests
4. `feat(web):` — components, hooks, pages
5. `test(web):` — vitest + playwright
6. `docs(vault):` — STATE.md, vault, backlog

### Convencoes de commit

Conventional commits em PT-BR:
- `feat(db): cria tabela forms com RLS`
- `feat(api): adiciona handler de criacao de form`
- `fix(api): corrige calculo de availability com DST`
- `test(api): testes de integracao pra booking service`
- `feat(web): implementa form builder com drag-and-drop`
- `docs(vault): atualiza STATE.md com D005`

## Documentacao

### Vault Obsidian

`TypeCall-dir/` — fonte de verdade do produto. Qualquer feature entregue deve ter doc atualizada.

### .specs/

`.specs/` — specs operacionais. STATE.md rastreia decisoes. CONVENTIONS.md define como escrever codigo.

### Apos cada fase entregue

- [ ] `TypeCall-dir/00 - Indice.md` atualizado com status
- [ ] `.specs/project/STATE.md` atualizado com decisoes (D00X)
- [ ] `TypeCall-dir/08 - Backlog/Master Plan.md` marca fase como entregue
- [ ] `TypeCall-dir/06 - Features/Fase [N].md` criterios de aceitacao verificados

## Convencoes

Ver `.specs/codebase/CONVENTIONS.md` pra regras completas.

Resumo critico:
- Go: handler → service → repository. Sem logica no handler.
- SQL: pgx parametrizado. NUNCA string concat.
- org_id: do JWT via middleware. NUNCA do request body.
- RLS: OBRIGATORIO em toda tabela de dominio. ENABLE + FORCE + policy.
- Frontend: TanStack Query pra server state. React Hook Form + Zod pra forms.
- API: OpenAPI 3.1 como fonte de verdade. Snake case wire, camelCase TS.
- Testes: obrigatorios. Go table-driven + testcontainers. Vitest + Playwright.

## Fases

| Fase | Semanas | Status |
|------|---------|--------|
| 1: Foundation | 1-3 | Entregue |
| 2: Form Builder | 4-7 | Entregue |
| 3: Scheduling + Fusion | 8-11 | Entregue |
| 4: Embed | 12-14 | Entregue |
| 5: Analytics + Webhooks | 15-17 | Entregue |
| 6: Advanced | 18+ | Nao iniciada |

## Arquivos criticos

| Arquivo | Proposito |
|---------|-----------|
| `.specs/project/STATE.md` | Decisoes e blockers |
| `.specs/codebase/CONVENTIONS.md` | Como escrever codigo |
| `.specs/codebase/ARCHITECTURE.md` | Arquitetura do sistema |
| `.specs/codebase/STRUCTURE.md` | Onde cada arquivo vive |
| `TypeCall-dir/10 - Operacional/Database Schema.md` | Schema SQL completo |
| `TypeCall-dir/09 - Referencias/Integracoes/Torque CRM Integration.md` | Integracao com CRM |
| `TypeCall-dir/07 - Decisoes/` | ADRs |
