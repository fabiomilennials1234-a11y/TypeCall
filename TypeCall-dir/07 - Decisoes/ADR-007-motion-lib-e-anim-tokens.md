---
title: "ADR-007: Motion lib (apps/web) + CSS-only (apps/embed) com tokens de animacao"
tags: [adr, frontend, animation, ux]
status: accepted
created: 2026-05-11
id: ADR-007
---

# ADR-007: Motion lib em apps/web, CSS-only em apps/embed

## Contexto

Plataforma precisa de animacoes de classe Linear/Vercel/Stripe/Apple: route transitions, microinteracoes, stagger em listas, number tickers, builder com layout anim, runner com step transitions cinematograficas.

Decisao tecnica: qual lib de animacao? Bundle do embed tem budget rigido (D027: 66kb gz). apps/web nao tem budget hard.

Opcoes avaliadas:
1. **motion** (Framer Motion v12+ renomeada) — ~30kb gz, layoutId, AnimatePresence, useReducedMotion
2. **react-spring** — physics-first, ~25kb gz, API mais alien
3. **GSAP** — overkill, licenciamento, ~50kb gz
4. **CSS-only** — zero JS overhead, sem stagger declarativo, sem layoutId

## Decisao

**apps/web**: `motion@^12.x` como dep.

**apps/embed**: zero deps de animacao. CSS-only via `@keyframes` + `transition` no `styles.css`. Mesma linguagem visual atraves de tokens compartilhados conceitualmente.

**Tokens de animacao** (replicados em ambos apps):

| Token | Valor | Uso |
|-------|-------|-----|
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Default — Apple/Vercel style |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Loops, retornos |
| `--dur-tap` | 120ms | Tap/click feedback |
| `--dur-micro` | 200ms | Hover, small state changes |
| `--dur-route` | 350ms | Route, step, panel transitions |
| `--dur-cinema` | 600ms | Hero/success moments |

Override automatico em `@media (prefers-reduced-motion: reduce)` zera todas durations.

**apps/web tem em TS** (`apps/web/src/lib/motion.ts`):
- `DUR = { tap: 0.12, micro: 0.2, route: 0.35, cinema: 0.6 }` (segundos pra motion)
- `EASE = { outExpo: [0.16, 1, 0.3, 1], inOut: [0.4, 0, 0.2, 1] }` (cubic-bezier arrays)
- `useReducedMotion()` re-exportado de motion/react
- `withReducedMotion(props, reduced)` helper

## Justificativa

**Por que motion no web**:
- API declarativa: `<motion.div animate={{...}}>` mata 90% do CSS animation boilerplate
- `layoutId` magic move (sidebar active pill, DevicePreview viewport switch) e dificil de fazer sem lib
- `AnimatePresence mode="wait"` essencial pra route/step transitions com exit anim
- 30kb gz aceitavel num dashboard de 230kb gz total (15% do bundle)
- Mantenedor (Matt Perry) ativo, React 19 compativel

**Por que NAO motion no embed**:
- Budget 66kb gz fixado em D027. motion adicionaria ~30kb gz = bundle estoura.
- Embed tem N=10 animacoes simples (step transitions, success, hover). CSS keyframes cobre 100%.
- Sem layoutId no embed (sem features que precisem)

**Por que tokens em ambos**:
- Designer falando: "isso fica suave" → mesma curva nos dois apps
- Refator de duracao = mudar uma variavel
- Reduced motion respeitado uniformemente

## Consequencias

**Positivas**:
- Web: animacoes world-class com codigo declarativo
- Embed: zero JS overhead, mesma percepcao visual via CSS
- Tokens consistentes — easing nao "vibra" entre apps
- prefers-reduced-motion respeitado em tudo

**Negativas**:
- Duplicacao conceitual: tokens em motion.ts (TS) + globals.css (CSS) + embed/styles.css (CSS)
- Embed limitado: sem stagger declarativo, sem layoutId. Workarounds via animation-delay funcionam pros casos atuais
- Bundle web +30kb gz. Mitigacao futura: lazy-load motion ou code-splitting por rota

## Implementacao

| Camada | Onde |
|--------|------|
| Tokens TS | `apps/web/src/lib/motion.ts` |
| Tokens CSS web | `apps/web/src/styles/globals.css` (:root) |
| Tokens CSS embed | `apps/embed/src/styles.css` (:root) |
| Variants compartilhadas | `apps/web/src/lib/staggerList.ts` |
| Number ticker | `apps/web/src/components/ui/AnimatedNumber.tsx` |
| Keyframes embed | `apps/embed/src/styles.css` (`tc-*` prefixed) |

## Convencoes de uso

**Web**:
- Route transitions: AnimatePresence mode="wait" em AppLayout
- Listas: `listContainerVariants` + `listItemVariants` de staggerList
- Hover lift: inline `whileHover={{ y: -2 }}` (sem helper — variacao por contexto)
- Tap feedback: `whileTap={{ scale: 0.96 }}`
- Layout anim (block reorder, viewport resize): `layout` prop

**Embed**:
- Step transition: `animation: 'tc-step-enter-{forward,backward} var(--dur-route) var(--ease-out-expo) both'`
- Success: keyframes `tc-success-ring`, `tc-success-sonar`, `tc-success-check`, `tc-success-text` com delays
- Hover/tap: `hover:scale-[1.02] active:scale-[0.96]` Tailwind

**Reduced motion**:
- Web TS: `const reduced = useReducedMotion(); transition={reduced ? { duration: 0 } : ...}`
- Web CSS / Embed CSS: media query zera tokens automaticamente

## Referencias

- D010 — Dark-first design
- D027 — Embed budget 66kb gz
- motion.dev/docs/react
- Linear engineering blog: "Building a great web app" (easing tokens)
- Apple HIG — Motion section
