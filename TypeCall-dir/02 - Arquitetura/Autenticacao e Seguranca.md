---
tags:
  - arquitetura
  - seguranca
  - auth
status: vivo
created: 2026-05-05
---

# Autenticacao e Seguranca

---

## Autenticacao

### JWT em httpOnly Cookies

Pattern herdado do Torque-v2 ([[ADR-003]]):

- **Access token:** JWT assinado (EdDSA/Ed25519), `exp` 15 min, claims: `sub` (user_id), `org` (org_id), `role`.
- **Refresh token:** opaco, armazenado em `refresh_tokens` table, `exp` 30 dias, rotacao a cada uso.
- **Transporte:** `Set-Cookie` com flags:
  - `HttpOnly` — inacessivel via JS
  - `Secure` — apenas HTTPS
  - `SameSite=Strict` — protecao CSRF nivel 1
  - `Path=/api` — cookie nao enviado pra rotas de assets

### CSRF Double-Submit

`SameSite=Strict` cobre a maioria dos cenarios, mas como defesa em profundidade:

- Login retorna header `X-CSRF-Token` (random, vinculado a sessao).
- Toda mutation (POST/PUT/PATCH/DELETE) exige header `X-CSRF-Token` matching.
- Middleware valida token antes de processar request.

### OAuth2 (Google Calendar)

- Fluxo Authorization Code com PKCE.
- Tokens (access + refresh) armazenados criptografados no banco (ver abaixo).
- Refresh automatico no backend — frontend nunca ve OAuth tokens.

---

## Endpoints Publicos

Endpoints que nao exigem autenticacao (acessados por respondentes):

| Endpoint | Descricao | Resolucao de org |
|---|---|---|
| `GET /public/forms/:slug` | Carregar form pra renderizacao | `form.organization_id` |
| `POST /public/forms/:slug/responses` | Iniciar/atualizar response | `form.organization_id` |
| `GET /public/event-types/:id/availability` | Consultar slots disponiveis | `event_type.organization_id` |
| `POST /public/bookings` | Criar booking | `event_type.organization_id` |
| `PATCH /public/bookings/:token/cancel` | Cancelar via token | `booking.organization_id` |
| `PATCH /public/bookings/:token/reschedule` | Reagendar via token | `booking.organization_id` |

**Regra:** nenhum endpoint publico recebe `org_id` como parametro. O org_id e sempre resolvido a partir da entidade referenciada (form, event_type, booking). Isso impede tenant spoofing.

---

## Criptografia de Tokens OAuth

OAuth tokens do Google Calendar sao dados sensiveis — acesso ao calendario do usuario.

**Pattern v8 (identico Torque-v2):**

- Algoritmo: **AES-256-GCM**
- Chave: derivada via HKDF a partir de `ENCRYPTION_MASTER_KEY` (env var, 256-bit)
- Nonce: 12 bytes random, prefixado ao ciphertext
- AAD (Additional Authenticated Data): `user_id` — impede token swapping entre usuarios
- Armazenamento: coluna `encrypted_oauth_token BYTEA` na tabela `user_calendar_connections`
- Rotacao de chave: suportada via `key_version` column

---

## Rate Limiting

Implementado via Redis (sliding window):

| Escopo | Limite | Janela |
|---|---|---|
| **Autenticado (por org)** | 1000 req | 1 min |
| **Publico (por IP)** | 100 req | 1 min |
| **Login (por IP)** | 10 tentativas | 15 min |
| **Booking creation (por IP)** | 20 req | 1 min |
| **File upload (por org)** | 50 req | 1 min |

Headers retornados: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
Resposta quando excedido: `429 Too Many Requests` com `Retry-After` header.

---

## Headers de Seguranca

Aplicados via middleware em todas as respostas:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.typecall.com.br wss://api.typecall.com.br; frame-ancestors 'self' *;
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**Nota:** `frame-ancestors *` e necessario pra permitir embed em sites externos. A CSP do runner e mais permissiva que a do dashboard.

---

## PII Scrubbing

Dados pessoais nao devem aparecer em logs nem em error tracking.

### Sentry
- `beforeSend` hook que scrub campos: `email`, `phone`, `cpf`, `cnpj`, `name`, `ip_address`.
- Eventos de breadcrumb sanitizados.
- Attachment de request body desabilitado.

### zerolog (backend)
- Campos sensiveis marcados com tag `pii:"true"` no struct.
- Logger middleware redacta automaticamente valores desses campos.
- IP do request logado como hash (SHA-256 truncado), nao como valor original.

---

## LGPD — Consideracoes

### Consentimento
- Antes de coletar qualquer dado no form, step de consentimento obrigatorio (configuravel pelo criador).
- Texto do consentimento editavel. Default inclui: finalidade, base legal, retencao, direitos.
- Registro de consentimento: timestamp + versao do texto + IP (hash) armazenados em `consent_records`.

### Direito a Exclusao
- Endpoint `DELETE /api/respondents/:id/data` — hard delete de todas as respostas e dados pessoais.
- Bookings: dados pessoais anonimizados, metadados de agendamento mantidos pra integridade de analytics.
- Logs: PII ja scrubbed, nao ha acao adicional necessaria.
- Google Calendar: evento deletado via API.

### Retencao
- Respostas: retencao padrao 2 anos, configuravel por org.
- Job de cleanup: roda diariamente, deleta responses expiradas.

---

## Links

- [[02 - Arquitetura/Multi-tenancy|Multi-tenancy]]
- [[02 - Arquitetura/Visao Geral|Visao Geral]]
- [[00 - Indice|Voltar ao Indice]]
