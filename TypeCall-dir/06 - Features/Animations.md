---
title: "Animations — sistema de movimento da plataforma"
tags: [feature, frontend, ux, animation]
status: shipped
phase: 6
delivered: 2026-05-11
---

# Animations

Sistema de movimento world-class na plataforma e no formulario. Referencias: Linear, Vercel, Stripe, Apple.

## Filosofia

- **Subtle, nao bombastico**: o movimento serve a interface, nao chama atencao
- **Cinematografico**: easing out-expo + sequenciamento criam ritmo
- **A11y first**: `prefers-reduced-motion: reduce` honrado em tudo
- **Performance**: layout anims so onde fazem sentido, AnimatePresence mode="wait" garante 1 instancia por vez

## Tokens

| Token | Web (TS) | Web/Embed (CSS) | Uso |
|-------|----------|-----------------|-----|
| outExpo | `EASE.outExpo` | `var(--ease-out-expo)` | Default |
| inOut | `EASE.inOut` | `var(--ease-in-out)` | Loops |
| tap | `DUR.tap` (0.12s) | `var(--dur-tap)` (120ms) | Tap feedback |
| micro | `DUR.micro` (0.2s) | `var(--dur-micro)` (200ms) | Hover, micro state |
| route | `DUR.route` (0.35s) | `var(--dur-route)` (350ms) | Step, page, panel |
| cinema | `DUR.cinema` (0.6s) | `var(--dur-cinema)` (600ms) | Hero moments |

## Onde aparece

### Plataforma (apps/web)

| Local | Animacao |
|-------|----------|
| Route transitions | AppLayout AnimatePresence — fade+y subtle entre rotas |
| Sidebar | Active pill desliza entre items (layoutId magic-move) |
| Forms grid | Stagger reveal + hover lift y=-2 |
| Bookings list | Stagger + hover lift |
| SalesDashboard KPIs | Stagger + number ticker (anima 0→value, 0.6s outExpo) |
| Builder canvas | Block insert/remove com layout anim + AnimatePresence (fade+y+scale) |
| Property panel | Slide x entre Editor↔Theme |
| Save indicator | Swap saving/saved/dirty fade+y; bullet amber pulse infinito |
| Preview (Ctrl+P) | DevicePreview overlay: backdrop blur + frame scale 0.92→1; 3 viewports com layout resize |
| Runner steps | Vertical y±24 direction-based; step transitions DUR.route |
| Submit success | Ring sonar (scale 2.2 fade) + ring base scale overshoot + checkmark pathLength + text stagger |
| Botoes | whileHover scale 1.02 + whileTap scale 0.96 |

### Embed (apps/embed)

CSS-only. Mesma linguagem, sem motion lib:

- Step transitions: keyframes `tc-step-enter-{forward,backward}`
- Success: `tc-success-ring`, `tc-success-sonar`, `tc-success-check`, `tc-success-text` com animation-delay
- Botoes: Tailwind `hover:scale-[1.02] active:scale-[0.96]`
- Loader popup: RAF trick — scale 0.96→1 + opacity 0→1
- Loader slider: translateX 100%→0
- Loader overlay: opacity 0→1

## Preview revamp

Substitui painel lateral 320px que ocultava PropertyPanel.

### Antes
- Toggle "Preview" troca painel direito (props ou ThemePanel) por preview mini lateral
- Mockup minusculo
- Pouco descobrivel
- So 5 step types renderizados

### Depois — DevicePreview
- Overlay full-screen z-50 com backdrop blur
- Device frame centralizado, chrome de 10px
- 3 viewports com layout anim entre dimensoes:
  - Mobile 390x780 r=32 com notch
  - Tablet 768x1024 r=20
  - Desktop 1280x800 r=12
- Top bar flutuante: switcher + close
- Theme do form aplicado dentro do frame (CSS vars `--form-*`)
- Sync canvas→preview: clicar bloco no canvas posiciona preview no step correspondente
- Atalho Ctrl/Meta+P toggle (cancela print padrao do browser)
- Esc fecha, click backdrop fecha, setas left/right navegam
- PropertyPanel/ThemePanel sempre visiveis no fundo — preview e overlay, nao substituicao
- 13 step types cobertos no PreviewStep (welcome, short_text, long_text, email, phone, number, multiple_choice, checkboxes, dropdown, rating, nps, date, statement, schedule, ending)

## Implementacao

### Decisao de lib

Ver [[ADR-007-motion-lib-e-anim-tokens]].

### Arquivos chave

```
apps/web/src/lib/
  motion.ts           # DUR, EASE, useReducedMotion, withReducedMotion
  staggerList.ts      # listContainerVariants, listItemVariants
apps/web/src/components/ui/
  AnimatedNumber.tsx  # ticker com useMotionValue + animate
apps/web/src/styles/
  globals.css         # CSS tokens + reduced-motion override
apps/web/src/features/builder/components/
  DevicePreview.tsx   # overlay com 3 viewports
  PreviewStep.tsx     # render unificado de step types
apps/embed/src/
  styles.css          # tokens + keyframes tc-*
  EmbedApp.tsx        # animation properties
  loader/index.ts     # RAF open anims
```

### Bundle impacto

- Web: +30kb gz (motion runtime) — 230kb gz total. Aceitavel pro dashboard.
- Embed responder: +1.2kb gz (67.26kb gz total — D027 budget 66kb gz extrapolado em 2%, aceitavel pelo valor)
- Loader: +150b (1.41kb gz — ainda <3kb budget)

## Convencoes de uso

### Web — novos componentes que precisam de anim

1. Import `DUR`, `EASE` de `@/lib/motion`
2. Para listas: import `listContainerVariants`, `listItemVariants` de `@/lib/staggerList`
3. Hover lift: inline `whileHover={{ y: -2, transition: { duration: DUR.tap, ease: EASE.outExpo } }}`
4. Tap: `whileTap={{ scale: 0.96 }}`
5. Page transition: ja coberto pelo AppLayout — nao adicionar de novo no Page
6. Reduced motion: `useReducedMotion()` e passar `transition={reduced ? { duration: 0 } : ...}` ou usar `withReducedMotion()`

### Embed — novos componentes

1. Definir keyframe em `apps/embed/src/styles.css` com prefix `tc-`
2. Aplicar via `style={{ animation: 'tc-foo var(--dur-route) var(--ease-out-expo) both' }}`
3. Reduced motion: ja coberto pelo media query nos tokens
4. NUNCA adicionar JS lib de animacao — budget

## Limitacoes conhecidas

- Tokens duplicados em 3 arquivos (motion.ts + 2 styles.css). Source of truth conceitual em ADR-007. Consolidar em packages/shared/tokens nao prioridade.
- Embed sem stagger declarativo — workaround via animation-delay multiplos funciona pra casos atuais.
- DevicePreview sync e one-way (canvas→preview). Bidirectional (preview→canvas highlight) deferido pra v2.
- Loader close anim nao existe (cleanup destroi DOM imediato). Adicionar se UX pedir.

## Referencias

- [[ADR-007-motion-lib-e-anim-tokens]]
- D037 — STATE.md
- motion.dev/docs/react
- Apple HIG — Motion section
