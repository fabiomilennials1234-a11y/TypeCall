---
tags:
  - arquitetura
  - multi-tenancy
status: vivo
created: 2026-05-05
---

# Multi-tenancy

Modelo identico ao Torque-v2. Tres camadas de isolamento, defesa em profundidade.

---

## As 3 Camadas

### Camada 1: JWT

O token JWT carrega o `org_id` como claim:

```json
{
  "sub": "user_01J...",
  "org": "org_01J...",
  "role": "admin",
  "exp": 1748700000
}
```

O middleware de autenticacao extrai o claim `org` e o coloca no contexto do request. Nenhuma outra fonte de org_id e aceita pra requests autenticados.

### Camada 2: Middleware

Apos autenticacao, o middleware de organizacao:

1. Extrai `org_id` do contexto (colocado pela camada 1).
2. Seta a session variable no PostgreSQL:

```sql
SET LOCAL app.current_org_id = 'org_01J...';
```

3. Toda query subsequente naquela transacao esta automaticamente filtrada via RLS.

**Fluxo completo:**

```
Request → Auth Middleware (extrai JWT)
        → Org Middleware (seta session var)
        → Handler (executa queries — RLS filtra automaticamente)
```

### Camada 3: RLS (Row-Level Security)

Toda tabela com dados de tenant tem a coluna `organization_id` e a policy:

```sql
CREATE POLICY org_isolation ON forms
  USING (organization_id = app_current_org_id());

CREATE POLICY org_isolation ON event_types
  USING (organization_id = app_current_org_id());

CREATE POLICY org_isolation ON bookings
  USING (organization_id = app_current_org_id());

-- ... em TODAS as tabelas com organization_id
```

A funcao helper:

```sql
CREATE OR REPLACE FUNCTION app_current_org_id()
RETURNS TEXT AS $$
  SELECT current_setting('app.current_org_id', true);
$$ LANGUAGE sql STABLE;
```

**Resultado:** mesmo que um bug no codigo tente acessar dados de outra org, o banco bloqueia. A seguranca nao depende do codigo da aplicacao.

---

## Regra do Frontend

> **O frontend NUNCA envia `org_id` em mutations.**

- Nao em headers.
- Nao em body.
- Nao em query params.

O `org_id` e sempre extraido do JWT no backend. Isso elimina uma classe inteira de vulnerabilidades (IDOR via org spoofing).

No frontend, o `org_id` so e usado pra display (nome da org, billing) — nunca como parametro de escrita.

---

## Endpoints Publicos

Endpoints publicos (form runner, availability, booking) nao tem JWT. O org_id e resolvido a partir da entidade:

```
GET /public/forms/:slug
  → SELECT organization_id FROM forms WHERE slug = :slug
  → SET LOCAL app.current_org_id = <resultado>
```

```
GET /public/event-types/:id/availability
  → SELECT organization_id FROM event_types WHERE id = :id
  → SET LOCAL app.current_org_id = <resultado>
```

Isso garante que:
1. O respondente nunca precisa saber o org_id.
2. O RLS ainda funciona pra queries subsequentes.
3. Nao ha forma de o respondente acessar dados de outra org.

---

## Tabelas Globais (sem RLS)

Algumas tabelas nao tem `organization_id` e nao usam RLS:

| Tabela | Razao |
|---|---|
| `organizations` | Cada row e uma org — nao faz sentido filtrar por org. |
| `users` | Um usuario pode pertencer a multiplas orgs. Filtrado via `org_members`. |
| `plans` | Dados de planos/pricing — globais. |
| `system_settings` | Configuracoes de plataforma. |

Essas tabelas tem controle de acesso via handler/service layer, nao via RLS.

---

## Testes

Toda suite de testes de integracao valida isolamento:

1. Cria 2 orgs (A e B).
2. Cria dados em ambas.
3. Autentica como org A.
4. Verifica que so ve dados de A.
5. Tenta acessar ID de dado de B — espera 404 (nao 403, pra nao vazar existencia).

---

## Links

- [[02 - Arquitetura/Autenticacao e Seguranca|Autenticacao e Seguranca]]
- [[02 - Arquitetura/Visao Geral|Visao Geral]]
- [[00 - Indice|Voltar ao Indice]]
