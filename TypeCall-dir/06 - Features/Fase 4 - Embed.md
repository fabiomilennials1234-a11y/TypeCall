---
title: "Fase 4 - Embed"
tags: [features, fase-4, embed]
created: 2026-05-05
status: delivered
timeline: Semanas 12-14
---

# Fase 4 — Embed

Permite que formularios TypeCall sejam embedados em sites de terceiros. Entrega o SDK JavaScript (loader.js), o runner otimizado para iframe, protocolo de comunicacao via postMessage e quatro modos de exibicao. Ver [[ADR-003-embed-iframe-nao-web-component]] para a decisao arquitetural.

## Escopo

- `typecall-widget` (loader.js) — SDK IIFE bundle
- `typecall-responder` — build otimizado do runner para iframe
- Protocolo postMessage bidirecional
- 4 modos de embed: inline, popup, slider, full page
- Theme customization (cores, fonte, logo)
- Gerador de embed code no dashboard

## Timeline

| Semana | Foco |
|--------|------|
| 12 | loader.js SDK, iframe bootstrap, postMessage protocol, modo inline com auto-resize |
| 13 | Modos popup, slider, full page. typecall-responder build otimizado (< 50KB gz). |
| 14 | Theme customization, embed code generator no dashboard, testes cross-browser. |

## Deliverables

### typecall-widget — loader.js

SDK JavaScript que site de terceiro inclui para embedar formularios TypeCall.

- **Formato**: IIFE (Immediately Invoked Function Expression) — nenhuma dependencia externa
- **Budget**: **< 3KB gzipped** — nao pode impactar performance do site host
- **Distribuicao**: CDN (`cdn.typecall.com.br/widget/v1/loader.js`)
- **API publica**:

```javascript
// Inline embed
TypeCall.createWidget({
  formId: "uuid-or-slug",
  container: "#typecall-container",  // CSS selector ou HTMLElement
  mode: "inline",                     // inline | popup | slider | fullpage
  theme: {                            // opcional
    primaryColor: "#6366F1",
    fontFamily: "Inter",
    borderRadius: 12,
    mode: "dark"                      // dark | light
  },
  onReady: () => {},
  onStepChanged: (step) => {},
  onCompleted: (response) => {},
  onBookingCreated: (booking) => {},
  onClose: () => {}
});

// Popup trigger
TypeCall.openPopup({ formId: "slug", theme: { ... } });

// Slider trigger
TypeCall.openSlider({ formId: "slug", theme: { ... } });
```

- **Inicializacao**: loader.js cria iframe, injeta URL do responder, estabelece comunicacao postMessage
- **Lazy load**: iframe so e criado quando `createWidget` e chamado (nao no load da pagina)
- **Destruicao**: `widget.destroy()` remove iframe e listeners

### typecall-responder — Build otimizado

Build separado e otimizado do form runner, servido dentro do iframe.

- **Budget**: **< 50KB gzipped** (React + runner + styles)
- **Otimizacoes**:
  - Tree-shaking agressivo (apenas codigo do runner, sem builder/admin)
  - Code splitting por question type (lazy load tipos menos comuns)
  - CSS purgado (apenas styles usados)
  - Preact como fallback se React exceder budget (ver [[Master Plan]] — risk register)
- **URL**: `embed.typecall.com.br/f/{slug}` (subdominio separado para isolamento)
- **CSP**: Content-Security-Policy headers configurados para prevenir XSS

### postMessage Protocol

Comunicacao bidirecional entre loader.js (host page) e responder (iframe).

| Mensagem | Direcao | Payload | Descricao |
|----------|---------|---------|-----------|
| `typecall:init` | Host → Iframe | `{ formId, theme, metadata }` | Inicializa o form com configuracoes |
| `typecall:ready` | Iframe → Host | `{ formTitle, totalSteps }` | Form carregado e pronto para exibicao |
| `typecall:step-changed` | Iframe → Host | `{ stepIndex, stepType, stepTitle }` | Respondente avancou/voltou de step |
| `typecall:answer` | Iframe → Host | `{ stepId, value }` | Respondente respondeu uma pergunta |
| `typecall:booking-created` | Iframe → Host | `{ bookingId, startTime, endTime, meetingUrl }` | Booking confirmado no schedule step |
| `typecall:completed` | Iframe → Host | `{ responseId, answers, booking }` | Form completado com sucesso |
| `typecall:resize` | Iframe → Host | `{ width, height }` | Iframe solicita resize (modo inline) |
| `typecall:close` | Iframe → Host | `{}` | Respondente clicou em fechar (popup/slider) |

- **Seguranca**: todas as mensagens prefixadas com `typecall:` para evitar colisao
- **Origin validation**: iframe valida `event.origin` antes de processar mensagens
- **Serialization**: payloads JSON-safe (sem funcoes ou referencias circulares)

### Embed Modes

**Inline** (auto-resize):
- Iframe inserido dentro de um container HTML do site host
- Auto-resize: iframe ajusta altura automaticamente conforme conteudo muda (via `typecall:resize`)
- `ResizeObserver` no iframe monitora mudancas de altura
- Sem scroll interno — scroll do host page

**Popup** (modal overlay):
- Overlay escuro (backdrop) cobre a pagina
- Iframe centralizado como modal
- Fechamento: botao X, click no backdrop, tecla Escape
- Animacao: fade-in backdrop + scale-in modal

**Slider** (right panel):
- Painel lateral desliza da direita
- Largura fixa (420px desktop, full-width mobile)
- Backdrop sutil
- Fechamento: botao X, click no backdrop, swipe right (mobile)

**Full page**:
- Iframe ocupa viewport inteira (100vw x 100vh)
- Barra superior com logo e botao fechar
- Ideal para links diretos ou CTAs que querem experiencia imersiva

### Theme Customization

Opcoes de personalizacao visual aplicaveis ao form embedado.

| Propriedade | Tipo | Default | Descricao |
|-------------|------|---------|-----------|
| `primaryColor` | HEX | `#6366F1` | Cor principal (botoes, progress bar, selecao) |
| `fontFamily` | String | `"Inter"` | Fonte do formulario (carregada via Google Fonts se nao presente) |
| `logo` | URL | null | Logo exibido no header do form |
| `borderRadius` | Number | 12 | Border radius dos cards e botoes (px) |
| `mode` | `"dark"` \| `"light"` | `"dark"` | Tema claro ou escuro |

- Theme passado via `typecall:init` e aplicado como CSS custom properties no iframe
- Isolamento: tema do embed nao afeta site host e vice-versa (beneficio do iframe)
- Preview: no dashboard, preview ao vivo das opcoes de tema

### Embed Code Generator

Pagina no dashboard que gera o snippet HTML para embedding.

- **Interface**: selecionar formulario, escolher modo, configurar tema, copiar codigo
- **Preview**: visualizacao ao vivo do embed com as configuracoes selecionadas
- **Snippet gerado**:

```html
<!-- TypeCall Embed -->
<div id="typecall-form"></div>
<script src="https://cdn.typecall.com.br/widget/v1/loader.js"></script>
<script>
  TypeCall.createWidget({
    formId: "qualificacao-comercial",
    container: "#typecall-form",
    mode: "inline"
  });
</script>
```

- **Variantes**: snippets diferentes para cada modo (inline, popup trigger button, slider trigger)
- **Frameworks**: instrucoes adicionais para React, Next.js, WordPress, HTML puro

## Criterios de Aceitacao

- [ ] loader.js < 3KB gzipped
- [ ] typecall-responder < 50KB gzipped
- [ ] Modo inline funciona com auto-resize em site externo
- [ ] Modo popup abre/fecha corretamente com animacoes
- [ ] Modo slider desliza da direita, fecha com X/backdrop/swipe
- [ ] Modo full page ocupa viewport inteira
- [ ] postMessage protocol funciona (eventos chegam no host page)
- [ ] Theme customization aplicada corretamente no iframe
- [ ] Embed code generator gera snippet funcional
- [ ] Cross-browser: Chrome, Firefox, Safari, Edge (ultimas 2 versoes)
- [ ] Mobile: embed responsivo em viewport < 768px
- [ ] CSP: nenhum erro de Content-Security-Policy em site com CSP restritivo
- [ ] Performance: First Contentful Paint do embed < 1.5s

## Dependencias

- [[Fase 2 - Form Builder]] — form runner (base do responder)
- [[Fase 3 - Scheduling]] — schedule step no runner

## Decisoes Relevantes

- [[ADR-003-embed-iframe-nao-web-component]] — por que iframe e nao Web Component

## Proxima Fase

→ [[Fase 5 - Analytics e Webhooks]]
