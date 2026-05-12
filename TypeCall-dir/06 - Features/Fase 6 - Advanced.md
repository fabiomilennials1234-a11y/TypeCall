---
title: "Fase 6 - Advanced"
tags: [features, fase-6, advanced]
created: 2026-05-05
status: planned
timeline: Semanas 18+
---

# Fase 6 — Advanced (v1.1 + v2.0)

Funcionalidades avancadas que expandem o TypeCall de MVP para plataforma completa. Divididas em v1.1 (polish e conversao) e v2.0 (plataforma full).

## Escopo

- v1.1: branching UI, file upload, reminders, reschedule/cancel, qualification score, theme, embed, mobile
- v2.0: PIX payment, round-robin, WhatsApp forms, public API, billing, white-label, A/B testing

---

## Iteracao Pos-MVP — Animations + Preview Revamp

**Status**: entregue 2026-05-11 (branch `develop`)

Sistema de movimento world-class na plataforma + revamp do preview do builder. Detalhes em [[Animations]] e [[ADR-007-motion-lib-e-anim-tokens]].

### Capacidades

- **motion lib em apps/web** + CSS-only em apps/embed (preserva budget D027)
- **Tokens compartilhados**: easing out-expo + 4 durations (tap/micro/route/cinema)
- **prefers-reduced-motion** honrado em todas camadas
- **Plataforma**: route transitions, sidebar magic-move, stagger em listas, AnimatedNumber, builder layout anim, panel slide Editor↔Theme, save indicator refinado
- **Runner**: step transitions vertical direction-based, submit cinematografico (ring sonar + checkmark pathLength + text stagger), button hover/tap
- **Embed**: keyframes `tc-*` replicam linguagem do web sem JS overhead, loader popup/slider com RAF open anims
- **DevicePreview**: overlay com 3 viewports (mobile 390x780, tablet 768x1024, desktop 1280x800), sync canvas→preview, Ctrl/Meta+P toggle, Esc fecha, setas navegam steps

### Bundle delta

- Web: +30kb gz (motion runtime) — 230kb gz total
- Embed responder: +1.2kb gz (67.26kb gz)
- Loader: +150b (1.41kb gz)

### Decisoes

- Ver D037 em STATE.md
- Ver [[ADR-007-motion-lib-e-anim-tokens]]

---

## Iteracao Pos-MVP — Form Theming (visual customization)

**Status**: entregue 2026-05-07 (branch `feature/form-theming`)

Forms agora customizaveis visualmente via ThemePanel no builder. 7 controles curados, padrao Stripe Checkout / Tally.

### Capacidades

- **Background**: cor solida, gradiente (2 stops + angulo), imagem (upload ate 5MB)
- **Cores**: primaria (CTAs), texto, card
- **Tipografia**: 8 Google Fonts curadas (Inter, Geist, Manrope, Space Grotesk, Playfair Display, Cormorant Garamond, Crimson Pro, JetBrains Mono) com preview real no picker
- **Forma**: 5 niveis de border radius + alinhamento (esquerda/centro)
- **Auto-save**: debounce 1.5s, PATCH /forms/:id
- **Aplicado**: FormRunnerPage (publico) + Embed runner

### Sprints (1-12)

1. `feat(db)`: tabela form_assets + RLS
2. `feat(api)`: AssetRepository/Service/Handler com mime+size validation, static `/uploads/*`
3. `feat(api)`: validateThemeJSON com DisallowUnknownFields + enums + regex CSS color
4. `test(api)`: cobertura asset upload + theme validation
5. `feat(web)`: lista curada de fontes + Google Fonts link
6. `feat(web)`: helpers themeToCss + defaultTheme + readTheme + isFormTheme
7. `feat(web)`: ThemePanel + 6 sub-componentes (Background, Color, Font, Radius, Alignment, AssetUploader)
8. `feat(web)`: integra ThemePanel em PropertyPanel quando node === null + useThemeAutoSave
9. `feat(web)`: aplica theme em FormRunnerPage publico
10. `feat(embed)`: aplica theme + carrega Google Fonts no embed
11. `test(web)`: 13 tests vitest
12. `docs(vault)`: D032 + ADR-006

### Decisoes formais

- [[../07 - Decisoes/ADR-006-form-asset-storage-filesystem]] — armazenamento de assets em filesystem (vs S3/bytea)
- D032 em STATE.md

### Limitacao

`theme.ts` duplicado entre `apps/web/src/features/builder/lib/theme.ts` e `apps/embed/src/theme.ts`. Consolidar em `packages/shared` quando alguma logica adicional comecar a divergir.

---

## Iteracao Pos-MVP — Google OAuth + Google Calendar Sync

**Status**: entregue 2026-05-07 (branch `feature/google-integration`)

Trazido da Fase 3 onde foi adiado por D023. Sprint A-H executadas:

- **Sprint A**: migration 0007 `integration_credentials` (RLS, AES-256-GCM nonce/ciphertext separados), pkg `internal/crypto`, `internal/domain/integration.go`, env vars validadas (`ENCRYPTION_KEY` hex 32 bytes, `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`).
- **Sprint B**: link/unlink de conta Google ao usuario logado. `IntegrationRepository`, `IntegrationService` (state JWT-signed, prompt=consent, /userinfo verified email), `IntegrationHandler` (`/integrations/google/{authorize,callback,disconnect,status}`), `/settings/integrations` UI.
- **Sprint C**: Sign in with Google. Auto-cria User+Org se email novo (slug = dominio do email com fallback uuid). `GoogleSigninFlow`, `/auth/google/{authorize,callback}`. Botao "Continuar com Google" em `/login` e `/register`.
- **Sprint D**: client `internal/integration/gcal` sobre `google.golang.org/api/calendar/v3`. Refresh transparente (re-encripta access token), circuit breaker per-user, FreeBusy integrado em `availability_service.GetAvailableSlots` (busy slots merged em existingBookings). Soft-fail em outage.
- **Sprint E**: `bookingService.Create` cria evento GCal com Meet (conferenceData hangoutsMeet, attendees host+respondente, reminder 10min). Persiste `google_event_id` + `meeting_url`. `Cancel` deleta evento. Falha = soft-fail (booking persiste sem meet_url).
- **Sprint F**: stub `/webhooks/gcal` (parse headers, log). Setup/renew/cache invalidation deferidos pra Redis caching futura.
- **Sprint G**: botao "Acessar" oculto sem `meeting_url`, abre Meet em nova aba.
- **Sprint H**: ADR-005 + decisao D031 em STATE.md.

Referencias:
- [[../09 - Referencias/Integracoes/Google Calendar]] — brief tecnico
- [[../07 - Decisoes/ADR-005-google-oauth-gcal-sync]] — decisao formal

Pendente em sprint futura:
- Redis cache de slots (avail:{event_type_id}:{user_id}:{date_range}, TTL 15min).
- Watch channel setup completo + cron renovacao 24h antes dos 7d.
- Reschedule via UI.

---

## v1.1 — Polish + Convert

Funcionalidades que refinam a experiencia e aumentam conversao. Entregues incrementalmente apos o MVP.

### Logic Branching Visual

- Editor visual de logica condicional no builder
- Interface: ao clicar em uma edge entre steps, abrir painel de condicoes
- Condicoes: `if answer to {step} {operator} {value} then go to {step}`
- Operadores: equals, not_equals, contains, greater_than, less_than, is_empty
- Multiplas condicoes: AND/OR combinaveis
- Visualizacao: edges condicionais em cor diferente no canvas, labels com resumo da condicao
- Baseado no `evaluator.ts` do flow-engine — ver [[Fase 2 - Form Builder]]

### File Upload

- Question type `file_upload` — ver [[Form Engine]]
- Upload direto para S3 via presigned URL (nao passa pelo backend)
- Tipos aceitos e tamanho maximo configuraveis por step
- Drag-and-drop + click to browse
- Progress bar durante upload
- Preview de imagem/PDF apos upload
- Virus scan via S3 event → Lambda (async)

### Hidden Fields

- Campos invisiveis ao respondente, preenchidos via query string
- Uso: capturar dados de contexto (lead_id, campaign_id, sales_rep)
- Configuracao: definir hidden fields no builder, mapear para query params
- Disponivel como response variable `{{hidden_field_slug}}`

### Welcome Screen Customizado

- Imagem ou video de fundo
- Titulo, subtitulo, descricao com Markdown
- Botao CTA customizavel (texto, cor)
- Logo da organizacao

### Email + WhatsApp Reminders

- Reminders automaticos para bookings — ver [[Scheduling Engine]]
- Email: 24h antes + 1h antes via Resend
- WhatsApp: confirmacao imediata + reminder 24h via [[WhatsApp]] (Evolution API / Uazapi)
- Template messages aprovados pela Meta
- Configuravel: ativar/desativar por canal, editar texto

### Reschedule / Cancel

- Links unicos com tokens nos emails de confirmacao
- Respondente pode reagendar (selecionar novo horario) ou cancelar
- Politica configuravel: prazo minimo antes do evento
- Atualiza Google Calendar automaticamente
- Notificacao ao host por email

### Booking Limits

- `max_per_day`: limite de reunioes por dia por host
- `max_per_week`: limite semanal (previne semanas sobrecarregadas)
- `max_concurrent_upcoming`: limite de bookings futuros totais

### Qualification Score

- Score automatico baseado em respostas — ver [[Fusion Layer]]
- Score por opcao de multiple_choice/dropdown configuravel no builder
- Score total calculado como percentual
- Exibido no admin junto com a resposta
- Enviado no webhook para o CRM

### Conditional Routing

- Baseado em score ou respostas, rotear para calendarios diferentes
- Enterprise leads → senior rep event type
- SMB leads → SDR event type
- Desqualificados → ending sem agendamento
- Configuravel via branching visual

### Theme Customization

- Primary color, font family, logo, border radius, dark/light mode
- Aplicavel ao runner standalone e ao embed
- Preview no dashboard
- CSS custom properties no iframe

### Embed Modes Completos

- Todos os 4 modos implementados e polidos: inline, popup, slider, full page
- Embed code generator com preview

### Mobile Optimization

- Touch targets >= 44px
- Swipe gestures para navegacao entre steps
- Teclado virtual otimizado por tipo de input (numeric, email, tel)
- Orientacao landscape suportada

---

## v2.0 — Full Platform

Funcionalidades que transformam o TypeCall em plataforma completa de conversao.

### PIX Payment (Asaas)

- Step `payment` inline no formulario — ver [[Asaas Payments]]
- PIX: QR code gerado via Asaas, respondente escaneia, webhook confirma pagamento
- Cartao de credito: Asaas hosted fields (PCI compliance)
- Boleto: geracao e envio por email
- Liberacao condicional: proximo step so libera apos `payment.confirmed` webhook
- Uso: cobrar por consultorias, eventos, servicos antes do agendamento

### Round-robin Scheduling

- Distribuicao automatica de bookings entre membros da equipe
- Peso configuravel por membro (ex: senior 2x, junior 1x)
- Equalizacao: prioriza membro com menos reunioes no periodo
- Fallback: se membro preferido nao tem disponibilidade, proximo da fila

### Collective Scheduling

- Reunioes que exigem presenca de multiplos membros
- Calcula intersecao de disponibilidade de todos os participantes obrigatorios
- Participantes opcionais: nao bloqueiam slots, marcados como "nice to have"

### Outlook / Microsoft 365

- MS Graph API com Azure AD OAuth 2.0
- Paridade funcional com Google Calendar
- Scope: `Calendars.ReadWrite`
- freeBusy, event creation, attendees

### WhatsApp-native Forms

- Formularios executados dentro de conversas WhatsApp — ver [[Fusion Layer]]
- Copilot agent do Torque consome API TypeCall
- Perguntas enviadas 1 por vez no chat
- Schedule step: envia link de agendamento ou agenda via API
- Lead qualifica e agenda sem sair do WhatsApp

### Form-triggered Workflows

- On completion, TypeCall dispara evento consumido pelo workflow engine do Torque
- Trigger type: `typecall_submission`
- Actions: add tag, move stage, assign SDR, send WhatsApp message, create task
- Ver [[Torque CRM Integration]]

### Pre-fill from CRM

- Lead reconhecido via `lead_id` na query string
- TypeCall consulta Torque API para dados existentes
- Skip perguntas ja respondidas
- Personalizacao: "Bem-vindo de volta, {{lead.name}}!"
- Fallback gracioso se API indisponivel

### Public API

- REST API completa para integracao programatica
- Endpoints: forms, responses, bookings, event-types, analytics
- Autenticacao: API key por organizacao
- Rate limiting: por key
- Documentacao: OpenAPI 3.0

### Zapier / Make

- Triggers: form.completed, booking.created, booking.cancelled
- Actions: create form, get responses, get bookings
- Zapier app publicado no marketplace
- Make (Integromat) modules

### Billing / Subscription

- Planos: Free (100 respostas/mes, 1 form), Pro (ilimitado, R$97/mes), Enterprise (custom)
- Gateway: [[Asaas Payments]] para cobranca recorrente
- Trial: 14 dias Pro gratis
- Upgrade/downgrade: proporcional
- Limites enforced: respostas, forms, integrações por plano

### White-label

- Remover branding "TypeCall" do runner e embed
- Logo customizado no footer
- Dominio customizado para forms
- Disponivel apenas no plano Enterprise

### SSO (Single Sign-On)

- Login via Torque CRM sem credenciais separadas
- Opcao 1: shared JWT validation
- Opcao 2: OAuth2 authorization code flow (Torque como IdP)
- Ver [[Torque CRM Integration]]

### Custom Domains

- Formularios servidos em dominio proprio do cliente (ex: `forms.empresa.com`)
- CNAME + certificado SSL automatico (Let's Encrypt)
- Configuracao via dashboard

### A/B Testing

- Variantes de formulario com traffic splitting — ver [[Analytics]]
- Metricas comparativas com calculo de significancia estatistica
- Auto-selection da variante vencedora

### Real-time Dashboard

- WebSocket-powered live feed de respostas — ver [[Analytics]]
- Contadores animados atualizando em real-time
- Ideal para acompanhar campanhas ao vivo

### Conversion Attribution

- Form → Deal tracking via [[Torque CRM Integration]]
- Revenue attribution por formulario e source
- ROI calculation se custo de campanha disponivel

## Relacionamentos

- [[Form Engine]] — tipos de pergunta adicionais (file_upload, payment)
- [[Scheduling Engine]] — round-robin, collective, reminders
- [[Fusion Layer]] — qualification score, conditional routing, pre-fill, WhatsApp forms
- [[Analytics]] — A/B testing, real-time dashboard, conversion attribution
- [[Torque CRM Integration]] — workflows, pre-fill, SSO
- [[Asaas Payments]] — PIX payment step, billing
- [[WhatsApp]] — reminders, native forms
- [[Google Calendar]] — base da integracao calendar
- [[Roadmap]] — planejamento de versoes
