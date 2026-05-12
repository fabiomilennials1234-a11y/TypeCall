import type { CSSProperties } from 'react'

export type RadiusKey = 'none' | 'sm' | 'md' | 'lg' | 'xl'
export type Alignment = 'left' | 'center'

export type ThemeBackground =
  | { kind: 'color'; color: string }
  | { kind: 'gradient'; from: string; to: string; angle: number }
  | { kind: 'image'; assetId: string; url: string; fit?: 'cover' | 'contain' }

export interface FormTheme {
  background: ThemeBackground
  primaryColor: string
  textColor: string
  cardColor: string
  borderRadius: RadiusKey
  alignment: Alignment
}

const RADIUS_PX: Record<RadiusKey, string> = {
  none: '0px',
  sm: '6px',
  md: '12px',
  lg: '16px',
  xl: '24px',
}

export function defaultTheme(): FormTheme {
  return {
    background: { kind: 'color', color: '#0a0a0b' },
    primaryColor: 'hsl(263 70% 58%)',
    textColor: '#fafafa',
    cardColor: 'rgba(20,20,24,0.85)',
    borderRadius: 'lg',
    alignment: 'left',
  }
}

export function isFormTheme(value: unknown): value is FormTheme {
  if (!value || typeof value !== 'object') return false
  const t = value as Record<string, unknown>
  return (
    typeof t.background === 'object' &&
    typeof t.primaryColor === 'string' &&
    typeof t.textColor === 'string' &&
    typeof t.cardColor === 'string' &&
    typeof t.borderRadius === 'string' &&
    typeof t.alignment === 'string'
  )
}

export function readTheme(value: unknown): FormTheme {
  if (isFormTheme(value)) return value
  return defaultTheme()
}

interface ThemeCss {
  style: CSSProperties
  alignment: Alignment
  radius: string
}

export function themeToCss(theme: FormTheme): ThemeCss {
  const radius = RADIUS_PX[theme.borderRadius]

  const style: CSSProperties & Record<`--${string}`, string> = {
    '--form-primary': theme.primaryColor,
    '--form-text': theme.textColor,
    '--form-card': theme.cardColor,
    '--form-radius': radius,
    color: theme.textColor,
  }

  switch (theme.background.kind) {
    case 'color':
      style.background = theme.background.color
      break
    case 'gradient':
      style.background = `linear-gradient(${theme.background.angle}deg, ${theme.background.from}, ${theme.background.to})`
      break
    case 'image':
      style.backgroundImage = `url(${theme.background.url})`
      style.backgroundSize = theme.background.fit ?? 'cover'
      style.backgroundPosition = 'center'
      style.backgroundRepeat = 'no-repeat'
      break
  }

  return {
    style,
    alignment: theme.alignment,
    radius,
  }
}
