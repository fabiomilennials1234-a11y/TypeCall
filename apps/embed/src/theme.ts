// Mirror of apps/web/src/features/builder/lib/theme.ts.
// Embed bundle ships standalone; shared types could move to packages/shared
// later. Kept slim here to avoid cross-app imports.
import type { CSSProperties } from 'react'

const FONT_STACKS: Record<string, string> = {
  'inter':         '"Inter", system-ui, sans-serif',
  'geist':         '"Geist", system-ui, sans-serif',
  'manrope':       '"Manrope", system-ui, sans-serif',
  'space-grotesk': '"Space Grotesk", system-ui, sans-serif',
  'playfair':      '"Playfair Display", Georgia, serif',
  'cormorant':     '"Cormorant Garamond", Georgia, serif',
  'crimson':       '"Crimson Pro", Georgia, serif',
  'jetbrains':     '"JetBrains Mono", ui-monospace, monospace',
}

const RADIUS_PX: Record<string, string> = {
  none: '0px', sm: '6px', md: '12px', lg: '16px', xl: '24px',
}

interface ThemeBackground {
  kind: 'color' | 'gradient' | 'image'
  color?: string
  from?: string
  to?: string
  angle?: number
  url?: string
  fit?: 'cover' | 'contain'
}

interface FormThemeShape {
  background?: ThemeBackground
  primaryColor?: string
  textColor?: string
  cardColor?: string
  headingFont?: string
  bodyFont?: string
  borderRadius?: string
  alignment?: 'left' | 'center'
}

interface ThemedRender {
  style: CSSProperties
  alignment: 'left' | 'center'
}

export function themeToCss(raw: unknown): ThemedRender {
  const t = (raw && typeof raw === 'object' ? raw : {}) as FormThemeShape
  const headingFont = FONT_STACKS[t.headingFont ?? 'inter'] ?? FONT_STACKS.inter
  const bodyFont = FONT_STACKS[t.bodyFont ?? 'inter'] ?? FONT_STACKS.inter
  const radius = RADIUS_PX[t.borderRadius ?? 'lg'] ?? RADIUS_PX.lg

  const style: CSSProperties & Record<`--${string}`, string> = {
    '--form-primary': t.primaryColor ?? 'hsl(263 70% 58%)',
    '--form-text': t.textColor ?? '#fafafa',
    '--form-card': t.cardColor ?? 'rgba(20,20,24,0.85)',
    '--form-radius': radius,
    '--form-heading-font': headingFont,
    '--form-body-font': bodyFont,
    color: t.textColor ?? '#fafafa',
    fontFamily: bodyFont,
  }

  const bg = t.background ?? { kind: 'color', color: '#0a0a0b' }
  if (bg.kind === 'gradient' && bg.from && bg.to) {
    style.background = `linear-gradient(${bg.angle ?? 135}deg, ${bg.from}, ${bg.to})`
  } else if (bg.kind === 'image' && bg.url) {
    style.backgroundImage = `url(${bg.url})`
    style.backgroundSize = bg.fit ?? 'cover'
    style.backgroundPosition = 'center'
    style.backgroundRepeat = 'no-repeat'
  } else {
    style.background = bg.color ?? '#0a0a0b'
  }

  return { style, alignment: t.alignment ?? 'left' }
}
