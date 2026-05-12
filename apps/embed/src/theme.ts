// Mirror of apps/web/src/features/builder/lib/theme.ts.
// Embed bundle ships standalone; shared types could move to packages/shared
// later. Kept slim here to avoid cross-app imports.
import type { CSSProperties } from 'react'

export const FONT_STACKS: Record<string, string> = {
  'inter':         '"Inter", system-ui, sans-serif',
  'geist':         '"Geist", system-ui, sans-serif',
  'manrope':       '"Manrope", system-ui, sans-serif',
  'space-grotesk': '"Space Grotesk", system-ui, sans-serif',
  'playfair':      '"Playfair Display", Georgia, serif',
  'cormorant':     '"Cormorant Garamond", Georgia, serif',
  'crimson':       '"Crimson Pro", Georgia, serif',
  'jetbrains':     '"JetBrains Mono", ui-monospace, monospace',
}

export function getFontStack(key?: string): string {
  return FONT_STACKS[key ?? 'inter'] ?? FONT_STACKS.inter!
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
  borderRadius?: string
  alignment?: 'left' | 'center'
}

interface ThemedRender {
  style: CSSProperties
  alignment: 'left' | 'center'
}

export function themeToCss(raw: unknown): ThemedRender {
  const t = (raw && typeof raw === 'object' ? raw : {}) as FormThemeShape
  const radius: string = RADIUS_PX[t.borderRadius ?? 'lg'] ?? RADIUS_PX.lg ?? '16px'

  const style: CSSProperties & Record<`--${string}`, string> = {
    '--form-primary': t.primaryColor ?? 'hsl(263 70% 58%)',
    '--form-text': t.textColor ?? '#fafafa',
    '--form-card': t.cardColor ?? 'rgba(20,20,24,0.85)',
    '--form-radius': radius,
    color: t.textColor ?? '#fafafa',
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
