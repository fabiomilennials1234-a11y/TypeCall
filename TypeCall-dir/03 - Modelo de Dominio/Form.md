---
tags:
  - dominio
  - form
status: vivo
created: 2026-05-05
---

# Form

Entidade central do TypeCall. Container top-level que agrupa flow, respostas, embeds e configuracoes.

---

## Entidade: Form

| Campo | Tipo | Descricao |
|---|---|---|
| `id` | UUID v7 | PK, ordenavel por tempo. |
| `organization_id` | UUID | FK → organizations. Tenant owner. |
| `created_by` | UUID | FK → users. Criador original. |
| `slug` | TEXT | Unico por org. Usado na URL publica: `/f/:slug`. |
| `name` | TEXT | Nome interno (visivel so no dashboard). |
| `status` | ENUM | `draft`, `published`, `archived`. |
| `published_version_id` | UUID | FK → form_versions. Versao atualmente ativa. NULL se draft. |
| `settings` | JSONB | Configuracoes do form (ver abaixo). |
| `theme` | JSONB | Tema visual (ver abaixo). |
| `created_at` | TIMESTAMPTZ | Criacao. |
| `updated_at` | TIMESTAMPTZ | Ultima modificacao. |

### Status Lifecycle

```
draft → published → archived
  ↑         │
  └─────────┘  (unpublish volta pra draft)
```

- **draft:** Editavel no builder. Nao acessivel publicamente.
- **published:** Ativo. Respondentes podem acessar. Edicoes criam nova draft version sem afetar a publicada.
- **archived:** Inativo. URLs retornam mensagem de form encerrado. Dados preservados.

---

## Entidade: FormVersion

Cada publish cria uma nova version imutavel. Isso garante que respostas sempre referenciam a versao exata do flow que o respondente viu.

| Campo | Tipo | Descricao |
|---|---|---|
| `id` | UUID v7 | PK. |
| `form_id` | UUID | FK → forms. |
| `version_number` | INT | Sequencial por form. Auto-incrementado no publish. |
| `flow_definition` | JSONB | O [[03 - Modelo de Dominio/Flow\|FlowDefinition]] completo: steps + edges. |
| `published_at` | TIMESTAMPTZ | Momento do publish. |
| `published_by` | UUID | FK → users. Quem publicou. |

### Modelo de Versionamento

```
Builder edita draft (form_versions com published_at = NULL)
     │
     ▼
Publish → cria nova form_version imutavel
     │     (version_number incrementa)
     │     (form.published_version_id atualiza)
     │
     ▼
Respondentes veem a versao publicada
Builder pode continuar editando o draft
```

**Regra:** uma `form_version` publicada nunca e alterada. Se o usuario editar o form apos publicar, as edicoes vao pra um draft separado. Proximo publish cria nova version.

---

## Settings (JSONB)

```json
{
  "close_message": "Obrigado por responder!",
  "redirect_url": "https://empresa.com/obrigado",
  "max_responses": null,
  "language": "pt-BR",
  "collect_email": true,
  "allow_multiple_submissions": false,
  "show_progress_bar": true,
  "enable_partial_save": true,
  "notifications": {
    "email_on_completion": true,
    "email_recipients": ["vendas@empresa.com"],
    "webhook_url": "https://empresa.com/webhook"
  },
  "scheduling": {
    "event_type_id": "evt_01J...",
    "require_qualification_score": 70,
    "round_robin_pool_id": null
  }
}
```

---

## Theme (JSONB)

```json
{
  "primary_color": "#6366f1",
  "background_color": "#0a0a0a",
  "text_color": "#fafafa",
  "font_family": "Inter",
  "border_radius": "0.5rem",
  "logo_url": "https://cdn.typecall.com.br/org_01J/logo.png",
  "mode": "dark",
  "custom_css": null
}
```

O tema e aplicado pelo runner. O respondente ve o form com a identidade visual da empresa.

---

## Relationships

```
Form 1:N FormVersion
Form 1:N Response (via form_version)
Form 1:N EmbedConfig
Form N:1 Organization
Form N:1 User (created_by)
FormVersion 1:N Response
```

---

## Schema SQL

```sql
CREATE TABLE forms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_by  UUID NOT NULL REFERENCES users(id),
    slug        TEXT NOT NULL,
    name        TEXT NOT NULL DEFAULT 'Novo Form',
    status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'published', 'archived')),
    published_version_id UUID REFERENCES form_versions(id),
    settings    JSONB NOT NULL DEFAULT '{}',
    theme       JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (organization_id, slug)
);

CREATE INDEX idx_forms_org_status ON forms (organization_id, status);
CREATE INDEX idx_forms_slug ON forms (slug);

-- RLS
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON forms
    USING (organization_id = app_current_org_id());

---

CREATE TABLE form_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    version_number  INT NOT NULL,
    flow_definition JSONB NOT NULL,
    published_at    TIMESTAMPTZ,
    published_by    UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (form_id, version_number)
);

CREATE INDEX idx_form_versions_form ON form_versions (form_id);

-- RLS via form join
ALTER TABLE form_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON form_versions
    USING (form_id IN (
        SELECT id FROM forms
        WHERE organization_id = app_current_org_id()
    ));
```

---

## Links

- [[03 - Modelo de Dominio/Flow|Flow]]
- [[03 - Modelo de Dominio/Response|Response]]
- [[01 - Produto/Glossario|Glossario]]
- [[00 - Indice|Voltar ao Indice]]
