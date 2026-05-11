export type FontCategory = 'sans' | 'display' | 'serif' | 'mono'

export interface FontDef {
  key: FontKey
  label: string
  category: FontCategory
  stack: string
}

export const FONTS = [
  { key: 'inter',          label: 'Inter',              category: 'sans',    stack: '"Inter", system-ui, sans-serif' },
  { key: 'geist',          label: 'Geist',              category: 'sans',    stack: '"Geist", system-ui, sans-serif' },
  { key: 'manrope',        label: 'Manrope',            category: 'sans',    stack: '"Manrope", system-ui, sans-serif' },
  { key: 'space-grotesk',  label: 'Space Grotesk',      category: 'display', stack: '"Space Grotesk", system-ui, sans-serif' },
  { key: 'playfair',       label: 'Playfair Display',   category: 'serif',   stack: '"Playfair Display", Georgia, serif' },
  { key: 'cormorant',      label: 'Cormorant Garamond', category: 'serif',   stack: '"Cormorant Garamond", Georgia, serif' },
  { key: 'crimson',        label: 'Crimson Pro',        category: 'serif',   stack: '"Crimson Pro", Georgia, serif' },
  { key: 'jetbrains',      label: 'JetBrains Mono',     category: 'mono',    stack: '"JetBrains Mono", ui-monospace, monospace' },
] as const

export type FontKey =
  | 'inter'
  | 'geist'
  | 'manrope'
  | 'space-grotesk'
  | 'playfair'
  | 'cormorant'
  | 'crimson'
  | 'jetbrains'

const FONT_BY_KEY: Record<FontKey, FontDef> = FONTS.reduce(
  (acc, f) => ({ ...acc, [f.key]: f }),
  {} as Record<FontKey, FontDef>,
)

export function getFontStack(key: FontKey): string {
  return FONT_BY_KEY[key]?.stack ?? FONT_BY_KEY.inter.stack
}

export function getFontDef(key: FontKey): FontDef {
  return FONT_BY_KEY[key] ?? FONT_BY_KEY.inter
}
