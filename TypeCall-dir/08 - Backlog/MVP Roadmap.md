---
tags:
  - backlog
  - mvp
  - roadmap
created: 2026-05-05
status: vivo
type: roadmap
---

# MVP Roadmap — TypeCall

## Definicao de MVP

**MVP = Fases 1 + 2 + 3.** 7 sprints. 11 semanas.

Ao final, um usuario consegue:
1. Criar formulario conversacional no builder visual
2. Adicionar perguntas de qualificacao + step de agendamento
3. Publicar com link compartilhavel
4. Respondente preenche qualificacao E agenda reuniao no mesmo fluxo
5. Booking cria evento no Google Calendar com Google Meet
6. Admin ve respostas + bookings no dashboard

**O que NAO entra no MVP:** embed widget, analytics avancado, webhooks/CRM, branching condicional, PIX, WhatsApp, round-robin, public API.

---

## Sprints

### Sprint 1 — Alicerce (Semanas 1-2)

**Foco:** Go API funcional com auth e multi-tenancy.

| Entrega | Tipo | Detalhe |
|---------|------|---------|
| Go API skeleton | Infra | `cmd/api/main.go`, config, pgx pool, chi router, graceful shutdown |
| Middleware stack | API | RequestID, Logger, Recover, CORS, RateLimit, CSRF, Auth, Tenant |
| Migrations 0001-0002 | DB | `organizations`, `users` com RLS |
| Auth endpoints | API | register, login, refresh, logout, me |
| JWT + cookies | Auth | access (15min) + refresh (7d), httpOnly, SameSite=Strict |
| Health probes | API | `/healthz` (liveness), `/readyz` (DB + Redis check) |
| Docker compose | Infra | Postgres 16 + Redis 7 + Go API (hot-reload) |

**Checkpoint demonstravel:**
- `POST /auth/register` cria org + user
- `POST /auth/login` retorna JWT em cookie
- `GET /auth/me` retorna user autenticado
- RLS: tenant A nao ve tenant B (testavel via curl)

**Criterios de gate:**
- [ ] `go test ./...` green
- [ ] Auth flow completo via curl/httpie
- [ ] RLS verificado com 2 tenants

---

### Sprint 2 — Frontend Shell (Semana 3)

**Foco:** React scaffold com auth integrado. Primeira tela visivel.

| Entrega | Tipo | Detalhe |
|---------|------|---------|
| Vite + React + TS | Infra | Scaffold com Tailwind 4 + shadcn/ui |
| Auth pages | Web | Login, Register (org name + user) |
| App shell | Web | Sidebar + topbar + content area, dark-first |
| Protected routes | Web | Redirect pra login se nao autenticado |
| Token refresh | Web | Interceptor auto-refresh antes de expirar |
| CI/CD | Infra | GitHub Actions (frontend-ci + backend-ci) |

**Checkpoint demonstravel:**
- Abrir app → tela de login (dark mode, design clean)
- Registrar → criar org → entrar no dashboard
- Dashboard vazio mas funcional (sidebar, topbar, area de conteudo)
- Logout → redirect pra login

**Criterios de gate:**
- [ ] `pnpm build` sem erros
- [ ] CI green (lint + typecheck + build)
- [ ] Auth flow E2E funciona no browser

---

### Sprint 3 — Form CRUD + Builder (Semanas 4-5)

**Foco:** Criar e editar formularios. Builder visual funcional.

| Entrega | Tipo | Detalhe |
|---------|------|---------|
| Migrations 0003-0005 | DB | `forms`, `form_versions`, `questions` com RLS |
| Form CRUD API | API | create, list, get, update, delete, draft auto-save, publish |
| Builder UI | Web | Canvas @dnd-kit + block palette + property panel |
| 5 tipos core | Web | short_text, multiple_choice, email, statement, ending |
| Live preview | Web | Preview conversacional ao lado do builder |
| Auto-save | Web | Indicador visual, PATCH draft a cada 3s de inatividade |
| Lista de forms | Web | Pagina com cards: titulo, status, respostas, data |

**Checkpoint demonstravel:**
- Dashboard → "Novo Formulario" → builder abre
- Arrastar blocos da paleta pro canvas
- Configurar pergunta (titulo, opcoes, required)
- Preview ao vivo mostra form conversacional
- Salvar (auto-save) → fechar → reabrir → draft intacto

**Criterios de gate:**
- [ ] Criar form com 5+ perguntas dos 5 tipos
- [ ] Drag-and-drop reordena perguntas
- [ ] Auto-save funciona (indicador visual)
- [ ] Live preview atualiza em real-time
- [ ] Forms listados no dashboard com status correto

---

### Sprint 4 — Runner + Respostas (Semana 6)

**Foco:** Respondente preenche form via link. Admin ve respostas.

| Entrega | Tipo | Detalhe |
|---------|------|---------|
| Publish flow | API | POST publish → cria form_version imutavel |
| Public form API | API | GET /public/forms/{slug} retorna version ativa |
| Response API | API | POST submit response, GET list responses (admin) |
| Form runner | Web | Conversacional (1 pergunta por vez), transicoes, progress bar |
| Shareable link | Web | `typecall.com.br/f/{slug}`, OG meta tags |
| Response viewer | Web | Tabela de submissions, expand pra detalhes, export CSV |
| packages/flow-engine | Shared | types.ts, traverser.ts, evaluator.ts, validator.ts |

**Checkpoint demonstravel:**
- Publicar form → copiar link → abrir em aba anonima
- Responder form conversacional (animacoes, progress bar, mobile-friendly)
- Submeter → "Obrigado!" screen
- Voltar pro admin → ver resposta na lista → expandir detalhes
- Re-publicar (nova versao) → versao anterior intacta

**Criterios de gate:**
- [ ] Form publicado acessivel via link sem auth
- [ ] Runner funciona mobile + desktop
- [ ] Validacao inline (required, email format)
- [ ] Respostas persistidas com form_version_id correto
- [ ] Admin lista respostas com filtro e paginacao

---

### Sprint 5 — Scheduling Basics (Semanas 7-8)

**Foco:** Event types, disponibilidade, integracao Google Calendar.

| Entrega | Tipo | Detalhe |
|---------|------|---------|
| Migrations 0006-0009 | DB | `event_types`, `availability_rules`, `availability_overrides`, `integration_credentials` |
| Event type CRUD | API | create, list, get, update, delete |
| Availability CRUD | API | set rules, add/remove overrides |
| GCal OAuth | API | connect, callback, disconnect. AES-256-GCM token storage. |
| GCal freeBusy | API | Consulta busy times, cache Redis 15min |
| Event types UI | Web | Pagina de gestao: criar, configurar duracao/buffer/notice |
| Availability UI | Web | Grid semanal (seg-dom) com horarios arrastáveis, overrides por data |
| GCal connect UI | Web | Botao "Conectar Google Calendar", status de conexao |

**Checkpoint demonstravel:**
- Criar event type "Discovery Call 30min" com buffer 15min
- Configurar disponibilidade: seg-sex 9h-18h
- Conectar Google Calendar via OAuth
- Ver status "Conectado" com email do Google

**Criterios de gate:**
- [ ] Event type criado com todas configuracoes
- [ ] Availability grid funcional (add/remove horarios)
- [ ] GCal OAuth completo (connect → callback → token stored)
- [ ] freeBusy retorna busy times do calendario

---

### Sprint 6 — Booking Engine (Semanas 9-10)

**Foco:** Calculo de slots, criacao de booking, Google Calendar event.

| Entrega | Tipo | Detalhe |
|---------|------|---------|
| Migration 0010 | DB | `bookings` com RLS |
| Slot calculation | API | service/availability — algoritmo 7 etapas, target <50ms |
| Public slots API | API | GET /public/event-types/{id}/slots?timezone=&from=&to= |
| Booking creation | API | POST /public/bookings — atomico com FOR UPDATE |
| GCal event create | API | Cria evento com attendees + Google Meet |
| Booking email | API | Confirmacao PT-BR via Resend (host + respondente) |
| Booking cancel/reschedule | API | POST cancel, POST reschedule com tokens |
| Booking page UI | Web | Standalone: calendario + slots + formulario de confirmacao |
| Bookings admin UI | Web | Lista de bookings, status, detalhes, cancelar |

**Checkpoint demonstravel:**
- Acessar pagina de booking standalone
- Ver calendario com dias disponiveis (excluindo busy do GCal)
- Selecionar dia → ver slots → selecionar horario
- Preencher nome/email/phone → confirmar
- Email de confirmacao chega (PT-BR, com link Meet)
- Evento aparece no Google Calendar do host
- Admin ve booking na lista

**Criterios de gate:**
- [ ] Slots calculados corretamente (exclui busy, aplica buffer/notice)
- [ ] Booking atomico — double-booking impossivel
- [ ] Google Calendar event criado com Meet link
- [ ] Email confirmacao enviado pra ambos
- [ ] Cancel/reschedule via token links funciona
- [ ] Redis cache funcional (2a consulta mais rapida)

---

### Sprint 7 — THE FUSION + Polish (Semana 11)

**Foco:** Schedule step dentro do form. MVP completo.

| Entrega | Tipo | Detalhe |
|---------|------|---------|
| Schedule step (builder) | Web | Bloco "Agendar Reuniao" na paleta, property panel: selecionar event_type |
| Schedule step (runner) | Web | Calendario inline no fluxo conversacional |
| Booking + Response link | API | booking.response_id FK, resposta armazena booking_id |
| MVP polish | Web | Loading states, empty states, error handling, micro-copy PT-BR |
| Onboarding flow | Web | Primeiro acesso: criar org → criar primeiro event type → criar primeiro form |
| E2E tests | Test | Playwright: golden path completo (register → build → publish → respond → book) |
| Responsive final | Web | Testar todos os fluxos em mobile (Chrome DevTools + dispositivo real) |

**Checkpoint demonstravel — DEMO DO MVP:**
- Registrar no TypeCall
- Criar event type "Discovery Call 30min"
- Conectar Google Calendar
- Criar formulario:
  - Welcome: "Vamos agendar uma conversa?"
  - Email: "Qual seu email?"
  - Choice: "Qual o tamanho da sua empresa?" (1-10, 11-50, 51-200, 200+)
  - Text: "Qual seu principal desafio?"
  - **Schedule: "Escolha o melhor horario pra gente conversar"** ← THE FUSION
  - Ending: "Perfeito! Sua reuniao esta confirmada."
- Publicar → copiar link
- Abrir link em aba anonima (simular respondente)
- Responder perguntas (1 por vez, animacoes)
- Chegar no step de agendamento → ver calendario → selecionar slot → confirmar
- "Reuniao confirmada!" com detalhes
- Voltar pro admin:
  - Ver resposta com todas as respostas + booking vinculado
  - Ver booking na lista de bookings
  - Ver evento no Google Calendar com Meet link

**Criterios de gate:**
- [ ] Fluxo end-to-end funciona sem erros
- [ ] Schedule step renderiza calendario inline no runner
- [ ] Booking vinculado a response (FK populado)
- [ ] Playwright E2E green pra golden path
- [ ] Mobile responsive (form runner + booking)
- [ ] Onboarding flow guia primeiro uso
- [ ] Zero console errors, zero broken states

---

## Timeline Visual

```
Semana:  1    2    3    4    5    6    7    8    9    10   11
         |----|----|----|----|----|----|----|----|----|----|
Sprint:  [  S1: Alicerce  ][S2 ][ S3: Builder  ][ S4 ]
                                      [S5: Sched][S6: Book ][ S7 ]
                                                            ^^^^^
                                                          MVP DEMO
Fase:    [---- Fase 1 ----][------ Fase 2 ------][--- Fase 3 ---]
```

---

## Milestones Demonstraveis

| Semana | Milestone | O que mostrar |
|--------|-----------|---------------|
| 2 | **Auth funciona** | Register + login + JWT via curl |
| 3 | **Primeira tela** | App dark-mode, login, dashboard shell |
| 5 | **Builder funciona** | Criar form visual com drag-and-drop |
| 6 | **Form vivo** | Responder form via link, ver respostas no admin |
| 8 | **Calendario conectado** | GCal OAuth + availability configurada |
| 10 | **Booking funciona** | Agendar reuniao, evento no GCal, email confirmacao |
| 11 | **MVP COMPLETO** | Qualify + book em um fluxo. O produto existe. |

---

## Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| Google Calendar API rate limits | Slots lentos em pico | Redis cache 15min, stagger requests |
| Bundle size do runner | LCP lento | Sem shadcn no runner, tree-shaking agressivo |
| Double-booking | Dados inconsistentes | SELECT FOR UPDATE atomico, testes de concorrencia |
| OAuth token expiry | GCal para de funcionar | Auto-refresh com circuit breaker, alert no admin |
| DST timezone edge cases | Slots errados na transicao | time.LoadLocation (Go) + date-fns-tz (TS), testes pra DST |
| Form version drift | Respondente ve versao errada | response armazena form_version_id, respondente sempre na versao que comecou |

---

## Pos-MVP — O que vem depois

Apos MVP demonstrado e validado, prioridade:

| Prioridade | Feature | Impacto |
|------------|---------|---------|
| 1 | Embed widget (fase 4) | Distribuicao — forms em qualquer site |
| 2 | Webhook Torque CRM (fase 5) | Leads vao pro pipeline automaticamente |
| 3 | Logic branching (fase 6) | Forms inteligentes, roteamento condicional |
| 4 | WhatsApp reminders (fase 6) | Reduce no-show rate (~30-50% no BR) |
| 5 | PIX payment step (fase 6) | Monetizacao inline |

---

## Demo Script (Apresentacao MVP)

### Setup previo
- Conta TypeCall criada com org "Milennials"
- Google Calendar conectado
- Event type "Discovery Call 30min" com disponibilidade seg-sex 9h-18h

### Roteiro (5 minutos)

**[1 min] Problema**
> "Hoje times de vendas usam Typeform pra qualificar e Calendly pra agendar. Dois sistemas. Dados duplicados. Lead preenche formulario, recebe link de agenda, muitos desistem no meio. Resultado: 40% de drop-off entre qualificacao e agendamento."

**[2 min] Demo ao vivo — Builder**
> "No TypeCall, criamos um formulario que qualifica E agenda em um fluxo so."
- Mostrar builder: arrastar blocos, configurar perguntas
- Destacar: step de agendamento como "mais um bloco no formulario"
- Publicar → copiar link

**[1.5 min] Demo ao vivo — Respondente**
> "Agora sou o lead que recebeu esse link no WhatsApp."
- Abrir link no celular (ou simulacao mobile)
- Responder perguntas (1 por vez, animacoes suaves)
- Chegar no calendario → selecionar data → horario → confirmar
- "Reuniao confirmada" com detalhes

**[0.5 min] Resultado**
> "Voltando pro admin..."
- Mostrar resposta com dados + booking vinculado
- Mostrar evento no Google Calendar
- "Um link. Um fluxo. Qualificacao + agendamento. Zero friccao."

---

## Metricas de Sucesso do MVP

| Metrica | Target | Como medir |
|---------|--------|------------|
| Form completion rate | > 70% | responses.completed / responses.started |
| Booking conversion | > 50% dos que completam | bookings / responses.completed (com schedule step) |
| Time to complete | < 3 min | responses.completed_at - responses.started_at |
| Builder usability | Criar form em < 5 min | observacao em user test |
| Uptime | 99.5% | health check monitoring |
