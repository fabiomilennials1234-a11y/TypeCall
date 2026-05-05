---
title: "ADR-001: Backend em Go, nao Supabase"
tags: [adr, architecture]
status: accepted
created: 2026-05-05
id: ADR-001
---

# ADR-001: Backend em Go, nao Supabase

## Contexto

O ecossistema milennials tem dois patterns arquiteturais coexistindo:

1. **Go (Torque-v2)**: API em Go 1.25+ / chi / pgx, deploy em container, controle total sobre infra
2. **Supabase (v8milennialsb2bv2)**: Edge Functions em Deno, RLS nativo, auth integrado, deploy Supabase-hosted

O TypeCall tem requisitos especificos que influenciam a decisao:

- **Scheduling engine CPU-bound**: calculo de disponibilidade com 7 etapas, intersecao de calendarios, processamento de regras de recorrencia — beneficia-se de runtime compilado e goroutines
- **WebSocket hub persistente**: dashboard real-time (v2.0) precisa de conexoes WebSocket de longa duracao — incompativel com model serverless/Edge Functions
- **Embed API sub-10ms**: loader.js e responder precisam de respostas ultra-rapidas para nao impactar performance de sites de terceiros — cold start de Edge Functions e inaceitavel
- **Convergencia de ecossistema**: Torque-v2 e a direcao estrategica do ecossistema, migrar para Go e a tendencia

## Decisao

**Backend em Go 1.25+ / chi / pgx**, identico ao stack do Torque-v2.

Estrutura:
- `cmd/api/main.go` — entrypoint
- `internal/handler/` — HTTP handlers por dominio
- `internal/service/` — business logic
- `internal/repository/` — data access (pgx queries)
- `internal/middleware/` — middleware stack
- `pkg/` — pacotes compartilhaveis

## Alternativas Consideradas

### Supabase (rejeitado)

- **Lock-in**: dependencia forte do Supabase para auth, storage, realtime. Migracao futura custosa.
- **Edge Functions cold start**: Deno runtime tem cold start de 200-500ms. Inaceitavel para embed API que precisa de sub-10ms.
- **RLS limita auth**: RLS do Supabase assume que auth e feita pelo Supabase Auth. TypeCall precisa de auth customizada (JWT httpOnly cookies compartilhado com Torque).
- **Scheduling engine**: logica complexa de calculo de slots e inviavel em Edge Functions (timeout de 60s, sem estado, sem goroutines).
- **WebSocket**: Edge Functions nao suportam WebSocket persistente.

### Node.js (rejeitado)

- **Runtime overhead**: event loop single-threaded nao e ideal para scheduling calculation CPU-bound. Worker threads adicionam complexidade.
- **Performance**: latencia de GC em picos de trafego. Go oferece latencia mais previsivel.
- **Ecossistema**: nao ha nenhum servico Node.js no ecossistema milennials. Introduzir um terceiro runtime aumenta carga cognitiva do time.

### Python (rejeitado)

- **Nao esta no ecossistema**: nenhum servico Python existe na infraestrutura milennials.
- **Performance**: GIL limita paralelismo. Asyncio adiciona complexidade para o problema errado.
- **Deploy**: requer gestao de virtualenv/Docker mais pesado que Go binary estatico.

## Consequencias

### Positivas

- **Convergencia**: alinha com Torque-v2, reduz fragmentacao do ecossistema. Um dev que trabalha no Torque pode contribuir no TypeCall sem context-switch de stack.
- **Performance**: Go compilado com goroutines e ideal para scheduling engine e WebSocket hub. Binary estatico, startup < 100ms.
- **Controle**: total controle sobre middleware, auth, performance tuning, deploy.
- **Shared packages**: possibilidade futura de extrair pacotes compartilhados entre Torque-v2 e TypeCall (auth, middleware, gcal integration).

### Negativas

- **Tempo de setup**: scaffolding Go (middleware, auth, migrations, config) leva 2-3 semanas vs horas no Supabase.
- **Infra propria**: precisa gerenciar deploy, CI/CD, monitoring, logging. Supabase oferece tudo managed.
- **Tamanho do time**: exige proficiencia em Go. Developer pool menor que JavaScript/TypeScript.
- **Sem admin dashboard gratis**: Supabase Studio oferece dashboard DB gratis. TypeCall precisa construir ou usar ferramentas externas.

## Notas

- Esta decisao impacta [[Fase 1 - Foundation]] diretamente — o scaffolding Go e o deliverable principal.
- A integracao com Google Calendar (`integration/gcal`) segue o mesmo pattern do `Torque-v2/torque-api/internal/service/integration/`.
