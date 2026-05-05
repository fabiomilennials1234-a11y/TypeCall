---
tags:
  - dominio
  - response
status: vivo
created: 2026-05-05
---

# Response

Submission de um form. Cada vez que um respondente preenche um form, uma response e criada.

---

## Entidade: Response

| Campo | Tipo | Descricao |
|---|---|---|
| `id` | UUID v7 | PK. |
| `organization_id` | UUID | FK → organizations. |
| `form_id` | UUID | FK → forms. |
| `form_version_id` | UUID | FK → form_versions. Versao exata do flow respondida. |
| `status` | ENUM | `in_progress`, `completed`, `abandoned`. |
| `is_partial` | BOOLEAN | True se respondente saiu antes de completar. |
| `resume_token` | TEXT | Token pra retomar preenchimento (link via email). |
| `respondent_email` | TEXT | Extraido da answer do step de email (se existir). |
| `respondent_name` | TEXT | Extraido da answer do step de nome (se existir). |
| `score` | INT | Score de qualificacao calculado (0-100). NULL se nao configurado. |
| `metadata` | JSONB | Ver abaixo. |
| `started_at` | TIMESTAMPTZ | Quando o respondente abriu o form. |
| `completed_at` | TIMESTAMPTZ | Quando submeteu. NULL se in_progress/abandoned. |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### Status Lifecycle

```
in_progress → completed
      │
      └─────→ abandoned (job marca apos 24h sem atividade)
```

- **in_progress:** Respondente esta preenchendo. Answers sendo salvos incrementalmente.
- **completed:** Todas as perguntas obrigatorias respondidas e form submetido.
- **abandoned:** Sem atividade por 24h+ e nao completou. Marcado por job.

### Metadata (JSONB)

```json
{
  "utm_source": "linkedin",
  "utm_medium": "paid",
  "utm_campaign": "demo-q2-2026",
  "utm_term": "crm vendas",
  "utm_content": "banner-v2",
  "referrer": "https://blog.empresa.com/artigo",
  "device": "mobile",
  "browser": "Chrome 125",
  "os": "Android 15",
  "ip_geo": {
    "country": "BR",
    "state": "SP",
    "city": "Sao Paulo"
  },
  "embed_host": "https://empresa.com/contato",
  "embed_mode": "inline"
}
```

**Nota:** IP raw nao e armazenado (LGPD). Apenas geo derivado do IP no momento do request.

---

## Entidade: Answer

Resposta individual a um step dentro de uma response.

| Campo | Tipo | Descricao |
|---|---|---|
| `id` | UUID v7 | PK. |
| `response_id` | UUID | FK → responses. |
| `step_id` | TEXT | ID do step no FlowDefinition. |
| `step_type` | TEXT | Tipo do step (pra queries sem precisar do flow JSON). |
| `value` | JSONB | Resposta polimorfica (ver abaixo). |
| `answered_at` | TIMESTAMPTZ | Quando respondeu. |

### Value (JSONB) por StepType

| StepType | Formato do value |
|---|---|
| `short_text` | `{ "text": "Joao Silva" }` |
| `long_text` | `{ "text": "Precisamos de..." }` |
| `email` | `{ "text": "joao@empresa.com" }` |
| `phone` | `{ "text": "+5511999887766" }` |
| `number` | `{ "number": 42 }` |
| `multiple_choice` | `{ "choice": "4-10" }` |
| `checkboxes` | `{ "choices": ["CRM", "Marketing", "Vendas"] }` |
| `dropdown` | `{ "choice": "Tecnologia" }` |
| `rating` | `{ "number": 4 }` |
| `nps` | `{ "number": 9 }` |
| `date` | `{ "date": "2026-05-15" }` |
| `file_upload` | `{ "file_url": "https://cdn.../file.pdf", "file_name": "proposta.pdf", "file_size": 245000 }` |
| `schedule` | `{ "booking_id": "bkng_01J..." }` |
| `payment` | `{ "transaction_id": "txn_01J...", "amount": 9900, "currency": "BRL", "status": "paid" }` |

---

## Partial Submissions

Respondentes que abandonam no meio do form ainda tem dados valiosos.

### Salvamento incremental
- Cada answer e salva individualmente via `POST /public/forms/:slug/responses/:id/answers`.
- Nao espera o submit final.
- `is_partial = true` ate o submit.

### Retomada via link
- Se o respondente forneceu email, pode receber email com link de retomada.
- Link contem `resume_token` (opaco, 32 bytes).
- Ao abrir, o runner carrega a response existente e posiciona no ultimo step respondido.

### Expiracao
- Responses `in_progress` sem atividade por 24h: marcadas como `abandoned` por job.
- Respostas parciais sao incluidas em analytics (com flag).

---

## Analytics Events

Tabela `response_events` captura interacoes granulares pra analytics de funil.

| Campo | Tipo | Descricao |
|---|---|---|
| `id` | UUID v7 | PK. |
| `response_id` | UUID | FK → responses. NULL pra eventos pre-response (view). |
| `form_id` | UUID | FK → forms. |
| `event_type` | TEXT | Tipo do evento. |
| `step_id` | TEXT | Step relacionado (se aplicavel). |
| `metadata` | JSONB | Dados adicionais. |
| `created_at` | TIMESTAMPTZ | |

### Event Types

| Evento | Quando | Descricao |
|---|---|---|
| `form_view` | Form carregou | Respondente abriu o form (pode nao interagir). |
| `form_start` | Clicou "Comecar" | Respondente iniciou o preenchimento. |
| `question_seen` | Step renderizou | Respondente viu a pergunta (impressao). |
| `question_answered` | Answer salvo | Respondente respondeu. |
| `question_skipped` | Navegou pra frente sem responder | So pra steps opcionais. |
| `form_submit` | Submit final | Response completada. |
| `form_abandon` | Job de cleanup | Marcado retroativamente quando response expira. |
| `booking_started` | Schedule step renderizou | Respondente viu o calendario. |
| `booking_slot_selected` | Clicou num slot | Interacao com o calendario. |
| `booking_confirmed` | Booking criado | Reuniao agendada com sucesso. |

### Uso em Analytics

Esses eventos alimentam o dashboard de analytics:

```
Funil do Form:
  form_view → form_start → question_seen → question_answered → form_submit
  (com drop-off em cada etapa)

Funil de Booking:
  booking_started → booking_slot_selected → booking_confirmed
  (conversao do schedule step)

Metricas derivadas:
  - Completion rate = form_submit / form_start
  - Drop-off por step = (question_seen[n] - question_seen[n+1]) / question_seen[n]
  - Booking conversion = booking_confirmed / form_submit
  - Median time per step = median(question_answered.created_at - question_seen.created_at)
```

---

## Schema SQL

```sql
CREATE TABLE responses (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id),
    form_id          UUID NOT NULL REFERENCES forms(id),
    form_version_id  UUID NOT NULL REFERENCES form_versions(id),
    status           TEXT NOT NULL DEFAULT 'in_progress'
                     CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    is_partial       BOOLEAN NOT NULL DEFAULT true,
    resume_token     TEXT UNIQUE,
    respondent_email TEXT,
    respondent_name  TEXT,
    score            INT CHECK (score >= 0 AND score <= 100),
    metadata         JSONB NOT NULL DEFAULT '{}',
    started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_responses_form ON responses (form_id, status);
CREATE INDEX idx_responses_org ON responses (organization_id, created_at DESC);
CREATE INDEX idx_responses_resume ON responses (resume_token) WHERE resume_token IS NOT NULL;

ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON responses
    USING (organization_id = app_current_org_id());

---

CREATE TABLE answers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    step_id     TEXT NOT NULL,
    step_type   TEXT NOT NULL,
    value       JSONB NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (response_id, step_id)
);

CREATE INDEX idx_answers_response ON answers (response_id);

---

CREATE TABLE response_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES responses(id) ON DELETE SET NULL,
    form_id     UUID NOT NULL REFERENCES forms(id),
    event_type  TEXT NOT NULL,
    step_id     TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_response_events_form ON response_events (form_id, event_type, created_at);
CREATE INDEX idx_response_events_response ON response_events (response_id) WHERE response_id IS NOT NULL;
```

---

## Links

- [[03 - Modelo de Dominio/Form|Form]]
- [[03 - Modelo de Dominio/Flow|Flow]]
- [[03 - Modelo de Dominio/Booking|Booking]]
- [[01 - Produto/Glossario|Glossario]]
- [[00 - Indice|Voltar ao Indice]]
