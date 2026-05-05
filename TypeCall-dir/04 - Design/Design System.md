---
tags:
  - design
  - tokens
status: vivo
created: 2026-05-05
---

# Design System

Heranca do ecossistema milennials. Dark-first. Editorial. Cinematico.

---

## Filosofia

O TypeCall herda a identidade visual do ecossistema milennials (Torque CRM e produtos futuros). Nao e um template. Nao e generico. E uma linguagem visual que transmite sofisticacao, confianca e modernidade.

**Referencias:** Apple, Airbnb, Linear, Stripe, Vercel.

**Principios:**
- **Dark-first:** O modo escuro e o default. O claro e a alternativa.
- **Tipografia editorial:** Hierarquia clara, peso tipografico como ferramenta de design, nao decoracao.
- **Sensibilidade cinematica:** Transicoes suaves, timing intencional, atencao ao motion como parte da experiencia.
- **Diferenciacao:** Se parece com qualquer outro SaaS, reprovou.

---

## Color System

HSL tokens via CSS custom properties. Padrao shadcn/ui adaptado pro ecossistema milennials.

### Tokens Base (Dark Mode — default)

```css
:root {
  /* Backgrounds */
  --background: 0 0% 3.9%;          /* quase preto */
  --foreground: 0 0% 98%;           /* quase branco */

  /* Cards e superficies */
  --card: 0 0% 5.5%;
  --card-foreground: 0 0% 98%;

  /* Popover */
  --popover: 0 0% 5.5%;
  --popover-foreground: 0 0% 98%;

  /* Primary — acao principal */
  --primary: 262 83% 58%;           /* violeta vibrante */
  --primary-foreground: 0 0% 100%;

  /* Secondary — acoes secundarias */
  --secondary: 0 0% 14.9%;
  --secondary-foreground: 0 0% 98%;

  /* Muted — elementos discretos */
  --muted: 0 0% 14.9%;
  --muted-foreground: 0 0% 63.9%;

  /* Accent — hover, highlight */
  --accent: 0 0% 14.9%;
  --accent-foreground: 0 0% 98%;

  /* Semanticos */
  --destructive: 0 84% 60%;         /* vermelho erro/delete */
  --success: 142 71% 45%;           /* verde confirmacao */
  --warning: 38 92% 50%;            /* amarelo atencao */

  /* Borders */
  --border: 0 0% 14.9%;
  --input: 0 0% 14.9%;
  --ring: 262 83% 58%;              /* focus ring = primary */

  /* Radius */
  --radius: 0.5rem;
}
```

### Tokens Base (Light Mode)

```css
.light {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --card: 0 0% 98%;
  --card-foreground: 0 0% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 3.9%;
  --primary: 262 83% 58%;
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 84% 60%;
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 262 83% 58%;
}
```

### Dark Mode Toggle

```
darkMode: "class"
```

Classe `.dark` no `<html>`. Controlada por:
1. Preferencia do usuario (localStorage).
2. Fallback: `prefers-color-scheme` do sistema.
3. Default: dark.

---

## Tipografia

### Font Stack

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
--font-display: 'Cal Sans', 'Inter', sans-serif; /* headings editoriais */
```

Fontes self-hosted via `@fontsource`. Sem Google Fonts CDN (LGPD, performance).

### Hierarquia

| Nivel | Uso | Tamanho | Peso | Line-height |
|---|---|---|---|---|
| **Display** | Hero, paginas de marketing | 3.5rem | 700 | 1.1 |
| **H1** | Titulo de pagina | 2.25rem | 700 | 1.2 |
| **H2** | Secao principal | 1.875rem | 600 | 1.3 |
| **H3** | Subsecao | 1.5rem | 600 | 1.4 |
| **H4** | Card title, sidebar | 1.25rem | 600 | 1.4 |
| **Body** | Texto corrido | 1rem | 400 | 1.6 |
| **Small** | Labels, captions | 0.875rem | 400 | 1.5 |
| **Tiny** | Badges, timestamps | 0.75rem | 500 | 1.4 |

---

## Motion

### Framework

Framer Motion (dashboard) e CSS transitions (runner/embed).

### Principios de Motion

- **Proposito:** Toda animacao tem uma razao funcional — guiar atencao, dar feedback, criar continuidade.
- **Duracao:** 150ms pra feedback (hover, click), 300ms pra transicoes (step change), 500ms pra entradas (page load).
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` — natural, sem bounce.
- **Reducao:** `prefers-reduced-motion: reduce` desliga tudo exceto opacity fades.

### Transicoes Conversacionais (Runner)

O form e conversacional — cada step transiciona suavemente pro proximo:

| Transicao | Animacao |
|---|---|
| **Step forward** | Slide up + fade in (300ms). Step anterior slide up + fade out. |
| **Step backward** | Slide down + fade in (300ms). Inverso do forward. |
| **Progress bar** | Width transition suave (200ms). |
| **Slot selection** | Scale up sutil (1.02) + border highlight (150ms). |
| **Booking confirmed** | Confetti sutil + check icon scale (500ms). |
| **Error shake** | Horizontal shake (3x, 50ms each) no input com erro. |

---

## Componentes

### Dashboard (apps/web)

- **Base:** shadcn/ui (Radix primitives).
- **Icons:** Lucide.
- **Charts:** Recharts ou Nivo (analytics).
- **Drag-and-drop:** dnd-kit (builder).
- **Forms:** React Hook Form + Zod.
- **Tabelas:** TanStack Table.

### Runner (apps/embed)

- **Sem shadcn/ui.** Componentes custom lightweight.
- **Sem TanStack Query.** Fetch wrapper minimo.
- **Sem Zustand.** useReducer local.
- **Icons:** Inline SVGs (so os necessarios, tree-shakeable).
- **Calendario:** Componente custom (sem date-fns, Intl.DateTimeFormat nativo).

**Razao:** o runner tem budget de < 70KB gzipped total. Cada dependencia conta.

---

## Form Respondent Theme

O criador do form customiza a aparencia pra seus respondentes:

| Token | Descricao | Default |
|---|---|---|
| `primary_color` | Cor principal (botoes, links, progress) | `#6366f1` (violeta) |
| `font_family` | Fonte do form | `Inter` |
| `logo_url` | Logo da empresa (topo do form) | NULL |
| `border_radius` | Arredondamento de cantos | `0.5rem` |
| `mode` | `dark` ou `light` | `dark` |
| `background_color` | Override do fundo | NULL (usa default do mode) |
| `text_color` | Override do texto | NULL (usa default do mode) |

Esses valores sao armazenados no `theme` JSONB do [[03 - Modelo de Dominio/Form|Form]] e aplicados pelo runner via CSS custom properties injetadas no iframe.

### Embed: Heranca de Dark/Light Mode

Quando embedado, o runner pode:
1. **Herdar do host:** loader.js detecta `prefers-color-scheme` ou classe dark/light do host e envia via `typecall:init`.
2. **Forcar modo:** criador define `mode: "dark"` ou `mode: "light"` no theme — ignora host.
3. **Default:** se nenhuma config, usa dark (filosofia dark-first do ecossistema).

---

## Acessibilidade

- **Contraste:** minimo WCAG AA (4.5:1 pra texto, 3:1 pra UI).
- **Focus visible:** ring visivel em todos elementos interativos (`--ring` token).
- **Keyboard navigation:** tab order logico, Enter/Space pra acionar, Escape pra fechar.
- **Screen readers:** labels ARIA em todos componentes do form. `aria-live` pra feedback dinamico.
- **Reduced motion:** respeita `prefers-reduced-motion`.
- **Font scaling:** layout flexivel, nao quebra em 200% zoom.

---

## Links

- [[02 - Arquitetura/Embed Architecture|Embed Architecture]]
- [[02 - Arquitetura/Visao Geral|Visao Geral]]
- [[01 - Produto/Visao do Produto|Visao do Produto]]
- [[00 - Indice|Voltar ao Indice]]
