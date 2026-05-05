---
title: "ADR-004: Auth via JWT em httpOnly cookies"
tags: [adr, architecture]
status: accepted
created: 2026-05-05
id: ADR-004
---

# ADR-004: Auth via JWT em httpOnly Cookies

Herdado do Torque-v2 ADR-003. Pattern identico para convergencia de ecossistema.

## Decisao

Autenticacao via **JWT armazenado em httpOnly cookies** com protecao CSRF via double-submit cookie.

### Implementacao

**Access Token**:
- JWT assinado com HS256 (secret compartilhado) ou RS256 (chave assimetrica) — preferencia RS256 para permitir validacao sem secret
- TTL: 15 minutos
- Claims: `sub` (user_id), `org` (organization_id), `role` (user role), `exp`, `iat`
- Cookie: `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api`

**Refresh Token**:
- UUID opaco armazenado no banco (tabela `refresh_tokens`)
- TTL: 7 dias
- Cookie separado: `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/v1/auth/refresh`
- Rotacao: cada uso gera novo refresh token e invalida o anterior (previne replay)
- Revogacao: logout invalida todos os refresh tokens do usuario

**CSRF Protection**:
- Double-submit cookie pattern
- Cookie `csrf_token` (nao httpOnly — JS precisa ler) com token aleatorio
- Toda request mutante (POST/PUT/PATCH/DELETE) deve incluir header `X-CSRF-Token` com mesmo valor
- Middleware valida que cookie == header
- Token gerado no login, renovado no refresh

### Fluxo

```
Login:
POST /api/v1/auth/login { email, password }
→ Valida credenciais
→ Gera access_token JWT (15min)
→ Gera refresh_token UUID (7d), salva no DB
→ Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Strict
→ Set-Cookie: refresh_token=<uuid>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh
→ Set-Cookie: csrf_token=<random>; Secure; SameSite=Strict
→ 200 OK { user }

Request autenticado:
GET /api/v1/forms
→ Cookie: access_token=<jwt>
→ Middleware Auth: valida JWT, extrai claims
→ Middleware Tenant: SET LOCAL app.current_org = claims.org
→ Handler processa request com RLS ativo

Refresh:
POST /api/v1/auth/refresh
→ Cookie: refresh_token=<uuid>
→ Valida refresh_token no DB (existe, nao expirado, nao revogado)
→ Gera novo access_token + novo refresh_token
→ Invalida refresh_token antigo
→ Set-Cookie: novos cookies
→ 200 OK

Logout:
POST /api/v1/auth/logout
→ Invalida todos os refresh_tokens do usuario no DB
→ Set-Cookie: access_token=; Max-Age=0 (limpa)
→ Set-Cookie: refresh_token=; Max-Age=0 (limpa)
→ Set-Cookie: csrf_token=; Max-Age=0 (limpa)
→ 200 OK
```

## Razao

Identico ao pattern provado no Torque-v2. Razoes tecnicas:

1. **Previne XSS token theft**: tokens em httpOnly cookies sao inacessiveis via JavaScript. Mesmo com XSS no site, o atacante nao consegue extrair o token. Comparado com localStorage, onde qualquer script pode ler `localStorage.getItem('token')`.

2. **CSRF mitigado**: `SameSite=Strict` previne a maioria dos ataques CSRF. Double-submit cookie adiciona camada extra para browsers que nao suportam SameSite plenamente.

3. **Convergencia**: mesmo pattern do Torque-v2 permite eventual SSO entre produtos (v2.0) — shared JWT validation ou OAuth2 flow.

4. **Refresh token rotation**: previne replay attacks. Se token vazou, primeiro uso pelo atacante invalida o token, e proximo uso pelo usuario legitimo falha → deteccao de comprometimento.

## Alternativas Nao Consideradas

- **localStorage + Bearer header**: vulneravel a XSS. Qualquer script injetado extrai o token.
- **Session-based auth**: stateful no servidor, nao escala horizontalmente sem session store compartilhado. JWT e stateless.
- **OAuth2 externo (Auth0, Clerk)**: dependencia e custo. TypeCall precisa de auth propria para integracao com Torque.

## Relacionamentos

- [[Fase 1 - Foundation]] — implementacao da auth
- [[Torque CRM Integration]] — SSO futuro baseado neste pattern
- [[ADR-001-backend-go-nao-supabase]] — auth propria vs Supabase Auth
