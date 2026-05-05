---
tags:
  - arquitetura
  - embed
status: vivo
created: 2026-05-05
---

# Embed Architecture

---

## Estrategia: iframe + JS SDK

**Decisao:** iframe, nao Web Component.

Web Components pareciam a escolha moderna, mas trazem problemas reais pra um form builder:
- Style encapsulation via Shadow DOM e incompleta (fonts, CSS custom properties vazam).
- Bundle pesado (framework inteiro no custom element).
- Compatibility issues com frameworks do host (React, Vue, Angular shadow DOM quirks).

iframe garante:
- Isolamento total de CSS e JS.
- Seguranca via `sandbox` attribute.
- Independencia completa do framework do host.
- Tamanho controlado do runtime.

O trade-off (comunicacao via postMessage, sizing manual) e aceitavel e bem resolvido.

---

## Fluxo de Carregamento

```
1. Host page carrega loader.js (async, defer)
   ↓
2. loader.js encontra elementos [data-form-id] no DOM
   ↓
3. Pra cada elemento, cria <iframe> apontando pro runner
   ↓
4. Runner app inicializa dentro do iframe
   ↓
5. postMessage(typecall:ready) → host sabe que ta pronto
   ↓
6. Host envia postMessage(typecall:init) com config
   ↓
7. Runner renderiza form, comunica eventos via postMessage
```

---

## loader.js

Script minimo que o cliente coloca no site:

```html
<script async src="https://cdn.typecall.com.br/loader.js"></script>
<div data-form-id="abc123" data-mode="inline"></div>
```

Responsabilidades do loader:
- Encontrar todos `[data-form-id]` no DOM.
- Criar iframe com `src` apontando pro runner.
- Gerenciar resize (via postMessage do runner informando altura).
- Abrir/fechar popup/slider quando necessario.
- Expor API global `window.TypeCall` pra controle programatico.

**Budget: < 3KB gzipped.**

---

## Runner App

Aplicacao React lightweight que roda dentro do iframe. Build separado do dashboard.

Responsabilidades:
- Renderizar o form conversacional step-by-step.
- Avaliar logica condicional (flow traversal).
- Exibir calendario de availability no schedule step.
- Submeter respostas e bookings via API.
- Comunicar eventos pro host via postMessage.

**Restricoes:**
- Sem shadcn/ui — componentes custom lightweight.
- Sem TanStack Query — fetch nativo com wrapper minimo.
- Sem Zustand — state local com useReducer.
- Minimo de dependencias externas.

---

## Modos de Embed

| Modo | Comportamento | Atributo |
|---|---|---|
| **inline** | iframe renderizado dentro do elemento `[data-form-id]`. Altura dinamica. | `data-mode="inline"` |
| **popup** | Modal centralizado, overlay escuro. Aberto via trigger (botao, link, API). | `data-mode="popup"` |
| **slider** | Painel lateral deslizante (direita). Aberto via trigger. | `data-mode="slider"` |
| **full-page** | Pagina completa hospedada em `typecall.com.br/f/:slug`. Sem iframe. | N/A (link direto) |

---

## Performance Budget

| Asset | Limite | Justificativa |
|---|---|---|
| `loader.js` | < 3KB gz | Carregado em toda page view do host. Deve ser imperceptivel. |
| `runner.js` | < 50KB gz | Core da experiencia. React + form engine + calendar UI. |
| `runner.css` | < 15KB gz | Estilos do runner. Sem framework CSS pesado. |
| **Total embed** | **< 70KB gz** | Competitivo com Typeform (~150KB) e Calendly (~200KB). |

Estrategias pra manter budget:
- Tree-shaking agressivo.
- Preact como alternativa se React estourar budget.
- Code splitting por StepType (lazy load do schedule step que e o mais pesado).
- Fonts: usar system font stack no runner, custom fonts so se configurado.
- Sem moment/dayjs — Intl.DateTimeFormat nativo.

---

## Protocolo postMessage

Comunicacao host <-> iframe via `window.postMessage` com validacao de origin.

### Host → Runner

| Mensagem | Payload | Descricao |
|---|---|---|
| `typecall:init` | `{ formId, mode, theme, locale, metadata }` | Inicializa runner com config. |

### Runner → Host

| Mensagem | Payload | Descricao |
|---|---|---|
| `typecall:ready` | `{}` | Runner carregou e esta pronto. |
| `typecall:step-changed` | `{ stepId, stepType, index, total }` | Respondente avancou/voltou de step. |
| `typecall:answer` | `{ stepId, value }` | Respondente respondeu um step. |
| `typecall:booking-created` | `{ bookingId, startTime, endTime }` | Reuniao agendada com sucesso. |
| `typecall:completed` | `{ responseId, score }` | Form completo. |
| `typecall:resize` | `{ height }` | Runner precisa de mais/menos espaco (modo inline). |
| `typecall:close` | `{}` | Respondente pediu pra fechar (modo popup/slider). |

### Seguranca do postMessage

```typescript
// No runner — so aceita mensagens do host
window.addEventListener('message', (event) => {
  if (event.origin !== expectedHostOrigin) return;
  if (!event.data?.type?.startsWith('typecall:')) return;
  // processar
});

// No loader — so aceita mensagens do runner
iframe.contentWindow.addEventListener('message', (event) => {
  if (event.origin !== 'https://runner.typecall.com.br') return;
  // processar
});
```

Origin validation e obrigatoria. Sem wildcards. Sem `*`.

---

## API Programatica

O loader expoe `window.TypeCall` pra controle via JS:

```javascript
// Abrir form como popup
TypeCall.open('form-id');

// Fechar
TypeCall.close('form-id');

// Ouvir eventos
TypeCall.on('completed', (data) => {
  console.log('Score:', data.score);
  // redirect, track, etc.
});

// Pre-preencher campos
TypeCall.prefill('form-id', {
  email: 'lead@empresa.com',
  company: 'Empresa X'
});
```

---

## Links

- [[02 - Arquitetura/Visao Geral|Visao Geral]]
- [[04 - Design/Design System|Design System]]
- [[00 - Indice|Voltar ao Indice]]
