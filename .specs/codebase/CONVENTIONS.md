# TypeCall — Convencoes de Codigo

**Ultima atualizacao:** 2026-05-05

Convencoes herdadas do Torque-v2 com ajustes especificos do TypeCall. Todo membro do time (humano ou agente) deve seguir estas convencoes sem excecao.

---

## Go

### Packages

- Nomes em **lowercase singular**: `handler`, `service`, `repository`, `middleware`, `config`, `event`, `worker`
- Nunca plural: `handlers` esta errado, `handler` esta certo
- Nunca underscores no nome do package

### Arquivos

- **snake_case** sempre: `form_handler.go`, `booking_service.go`, `availability_repository.go`
- Sufixo indica a camada: `_handler.go`, `_service.go`, `_repository.go`, `_test.go`
- Um arquivo por dominio por camada: `form_handler.go` (nao `handler.go` com tudo dentro)

### Funcoes e Metodos

- **PascalCase** para exportados: `CreateForm()`, `GetAvailableSlots()`
- **camelCase** para privados: `validateSlotOverlap()`, `buildQuery()`
- Receivers: abreviacao de 1-2 letras do struct (`func (s *FormService)`, `func (r *BookingRepository)`)

### Errors

- Sempre wrap com contexto: `fmt.Errorf("FormService.Create: %w", err)`
- Nunca engolir erros silenciosamente
- Erros de dominio definidos como `var` no package correspondente:
  ```go
  var ErrFormNotFound = errors.New("form not found")
  var ErrSlotUnavailable = errors.New("slot unavailable")
  ```

### Logging

- **zerolog** structured JSON em toda aplicacao
- Levels: `Debug` (dev only), `Info` (operacional), `Warn` (recuperavel), `Error` (irrecuperavel)
- Sempre incluir contexto:
  ```go
  log.Info().
      Str("form_id", formID).
      Int("version", version).
      Msg("form published")
  ```

### Testes

- **Table-driven** obrigatorio para funcoes com multiplos cenarios
- Nomenclatura: `TestFormService_Create`, `TestFormService_Create_DuplicateSlug`
- Testes de integracao: `testcontainers-go` com Postgres + Redis reais
- Build tag: `//go:build integration` para separar unit de integration
- Coverage minimo: 80% unit, 60% integration

### Organizacao de Imports

Tres blocos separados por linha em branco:
1. Standard library
2. External packages
3. Internal packages

---

## TypeScript

### Componentes

- **PascalCase.tsx**: `FormBuilder.tsx`, `BookingCalendar.tsx`, `SlotPicker.tsx`
- Um componente por arquivo (exceto sub-componentes intimamente acoplados)
- Export nomeado, nunca default: `export function FormBuilder() {}`

### Hooks

- **camelCase** com prefixo `use`: `useForm()`, `useBookings()`, `useAvailableSlots()`
- Custom hooks de TanStack Query: `useFormQuery()`, `useCreateBookingMutation()`
- Um hook por arquivo: `useFormQuery.ts`

### Imports

- Alias `@/` para `src/`: `import { Button } from '@/components/ui/button'`
- Ordem:
  1. React/framework
  2. Libs externas
  3. Componentes internos (`@/components`)
  4. Hooks internos (`@/hooks`)
  5. Utils/lib (`@/lib`)
  6. Types (`@/types`)

### Constantes

- **SCREAMING_SNAKE_CASE**: `MAX_FORM_STEPS`, `DEFAULT_SLOT_DURATION`
- Env vars: prefixo `VITE_*` obrigatorio para variaveis expostas ao client
- Nunca hardcode valores: extrair para constantes ou env vars

### Types

- Sufixo `Type` **somente quando ambiguo**: se `Form` ja e claro, nao usar `FormType`
- Interfaces para contracts publicos, types para shapes internos
- Nunca `any` — usar `unknown` quando tipo real nao e conhecido
- Strict mode habilitado (`strict: true` no tsconfig)

### Estilizacao

- **Tailwind 4** utility classes, nunca CSS custom desnecessario
- Design tokens via variavel HSL no `globals.css`
- Funcao `cn()` (clsx + tailwind-merge) para composicao condicional de classes
- Dark mode como default, light mode como alternativa

---

## API

### Wire Format

- **snake_case** em todo JSON enviado/recebido pela API: `organization_id`, `created_at`, `event_type_id`
- Frontend converte bidirecionalmente na camada `api/`: snake_case (wire) <-> camelCase (TS)
- Datas em ISO 8601 com timezone: `2026-05-05T14:30:00-03:00`

### Paginacao

- **Cursor-based** obrigatoria (nunca offset-based):
  ```json
  {
    "data": [...],
    "pagination": {
      "next_cursor": "eyJpZCI6Ijk4N...",
      "has_more": true
    }
  }
  ```
- Default: 25 items, max: 100 items

### Respostas de Erro

Formato padrao:
```json
{
  "error": "Slot de horario nao disponivel",
  "code": "SLOT_UNAVAILABLE",
  "details": {
    "requested_start": "2026-05-10T14:00:00-03:00",
    "next_available": "2026-05-10T15:00:00-03:00"
  }
}
```

- `error`: Mensagem legivel (pode ser exibida ao usuario)
- `code`: Codigo maquina (SCREAMING_SNAKE_CASE)
- `details`: Objeto opcional com informacoes adicionais

### HTTP Status Codes

| Status | Uso                                      |
|--------|------------------------------------------|
| 200    | Sucesso (GET, PUT, PATCH)                |
| 201    | Criado (POST que cria recurso)           |
| 204    | Sem conteudo (DELETE)                    |
| 400    | Input invalido (validacao)               |
| 401    | Nao autenticado                          |
| 403    | Sem permissao (role insuficiente)        |
| 404    | Recurso nao encontrado                   |
| 409    | Conflito (slot ja reservado, slug duplicado) |
| 422    | Entidade nao processavel (regra de negocio)  |
| 429    | Rate limit excedido                      |
| 500    | Erro interno (nunca expor detalhes)      |

---

## Git

### Commits

- **Conventional commits em PT-BR**:
  - `feat: adiciona form builder com drag and drop`
  - `fix: corrige calculo de slots com timezone diferente`
  - `refactor: extrai flow engine para package compartilhado`
  - `test: adiciona testes de integracao para booking service`
  - `docs: atualiza schema do banco no Obsidian`
  - `chore: atualiza dependencias do frontend`
  - `perf: otimiza query de availability com index parcial`

### Branches

- `feature/form-builder` — Nova funcionalidade
- `fix/slot-timezone-calc` — Correcao de bug
- `chore/update-deps` — Manutencao
- `main` — Branch principal (sempre deployavel)
- `develop` — Branch de integracao (feature branches mergeiam aqui)

### Pull Requests

- Max **400 linhas** por PR
- **Squash merge** sempre (historico limpo no main)
- Titulo: conventional commit format
- Descricao: o que mudou, por que, como testar
- CI deve estar verde antes do merge

---

## Database

### Tabelas

- **snake_case plural**: `forms`, `bookings`, `availability_rules`, `response_answers`
- Toda tabela de dominio tem `organization_id NOT NULL` + RLS policy

### Colunas

- **snake_case**: `organization_id`, `created_at`, `event_type_id`, `is_active`
- Booleans: prefixo `is_` ou `has_`: `is_active`, `is_partial`, `has_booking`
- Foreign keys: `{tabela_singular}_id`: `form_id`, `user_id`, `booking_id`

### Primary Keys

- **UUID** gerado pelo banco: `DEFAULT gen_random_uuid()`
- Nunca auto-increment integer para PKs

### Timestamps

- **TIMESTAMPTZ** sempre (nunca TIMESTAMP sem timezone)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` (trigger para auto-update)
- Timezone padrao da aplicacao: `America/Sao_Paulo`

### Indexes

- Criados junto com a tabela na migration
- Nomeacao: `idx_{tabela}_{colunas}`: `idx_bookings_event_type_start_end`
- Partial indexes quando aplicavel: `WHERE status NOT IN ('cancelled', 'rescheduled')`
- GIN index para colunas JSONB frequentemente consultadas

### RLS

- Habilitado em **toda** tabela de dominio
- `FORCE ROW LEVEL SECURITY` pra garantir que owner tambem e filtrado
- Policy unica `tenant_isolation` como padrao

---

## Documentacao

### Obsidian Vault (TypeCall-dir/)

- Conteudo em **PT-BR**
- Estrutura de pastas numeradas (01 - Produto, 02 - Engenharia, etc.)
- Links internos via `[[wikilinks]]`
- Tags via frontmatter YAML

### Comentarios no Codigo

- Em **English** (minimalista)
- Apenas quando o "por que" nao e obvio pelo codigo
- Nunca comentar o "o que" — o codigo deve ser auto-explicativo
- Doc comments em funcoes exportadas (Go: `// FuncName does...`, TS: JSDoc)

### ADRs (Architecture Decision Records)

- Em **PT-BR**
- Formato: `ADR-{numero}-{slug}`
- Armazenados no Obsidian vault
- Campos: Contexto, Decisao, Consequencias, Status

### API Docs

- Em **English**
- Formato: OpenAPI 3.1 YAML
- Arquivo: `apps/api/api/openapi.yaml`
- Descricoes, exemplos, schemas completos
