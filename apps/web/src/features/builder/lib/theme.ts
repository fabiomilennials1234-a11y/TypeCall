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
    background: { kind: 'color', color: '#f5f1ea' },
    primaryColor: '#1f1a16',
    textColor: '#1f1a16',
    cardColor: 'rgba(255,253,248,0.9)',
    borderRadius: 'sm',
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
  const primaryFg = pickReadableForeground(theme.primaryColor)

  const style: CSSProperties & Record<`--${string}`, string> = {
    '--form-primary': theme.primaryColor,
    '--form-primary-fg': primaryFg,
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

/** Pick #fff or near-black foreground for a given color so text stays legible. */
export function pickReadableForeground(color: string): string {
  const rgb = parseColor(color)
  if (!rgb) return '#ffffff'
  const lum = relativeLuminance(rgb)
  return lum > 0.55 ? '#1f1a16' : '#ffffff'
}

interface RGB {
  r: number
  g: number
  b: number
}

function parseColor(input: string): RGB | null {
  const s = input.trim()
  if (s.startsWith('#')) {
    const hex = s.slice(1)
    if (hex.length === 3) {
      const r = parseInt(hex.charAt(0) + hex.charAt(0), 16)
      const g = parseInt(hex.charAt(1) + hex.charAt(1), 16)
      const b = parseInt(hex.charAt(2) + hex.charAt(2), 16)
      return { r, g, b }
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      }
    }
    return null
  }
  const hslMatch = s.match(/hsl\(\s*([\d.]+)\s*,?\s*([\d.]+)%\s*,?\s*([\d.]+)%/i)
  if (hslMatch) {
    return hslToRgb(Number(hslMatch[1]), Number(hslMatch[2]) / 100, Number(hslMatch[3]) / 100)
  }
  const rgbMatch = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i)
  if (rgbMatch) {
    return { r: Number(rgbMatch[1]), g: Number(rgbMatch[2]), b: Number(rgbMatch[3]) }
  }
  return null
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = ((h % 360) + 360) % 360 / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r1 = 0
  let g1 = 0
  let b1 = 0
  if (hp < 1) [r1, g1, b1] = [c, x, 0]
  else if (hp < 2) [r1, g1, b1] = [x, c, 0]
  else if (hp < 3) [r1, g1, b1] = [0, c, x]
  else if (hp < 4) [r1, g1, b1] = [0, x, c]
  else if (hp < 5) [r1, g1, b1] = [x, 0, c]
  else [r1, g1, b1] = [c, 0, x]
  const m = l - c / 2
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  }
}

function relativeLuminance({ r, g, b }: RGB): number {
  const transform = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b)
}
