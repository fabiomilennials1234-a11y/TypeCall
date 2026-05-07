import { describe, it, expect } from 'vitest'

import { defaultTheme, themeToCss, readTheme, isFormTheme, type FormTheme } from './theme'

const base = defaultTheme()

describe('defaultTheme', () => {
  it('returns inter font + dark bg + lg radius', () => {
    expect(base.headingFont).toBe('inter')
    expect(base.bodyFont).toBe('inter')
    expect(base.borderRadius).toBe('lg')
    expect(base.background.kind).toBe('color')
    expect(base.alignment).toBe('left')
  })
})

describe('isFormTheme', () => {
  it('accepts a complete theme', () => {
    expect(isFormTheme(base)).toBe(true)
  })
  it('rejects null/undefined/non-object', () => {
    expect(isFormTheme(null)).toBe(false)
    expect(isFormTheme(undefined)).toBe(false)
    expect(isFormTheme('x')).toBe(false)
    expect(isFormTheme(42)).toBe(false)
  })
  it('rejects partial', () => {
    expect(isFormTheme({ primaryColor: '#fff' })).toBe(false)
  })
})

describe('readTheme', () => {
  it('falls back to default for empty/invalid input', () => {
    expect(readTheme(null)).toEqual(base)
    expect(readTheme({})).toEqual(base)
    expect(readTheme('garbage')).toEqual(base)
  })
  it('preserves a valid theme', () => {
    const custom: FormTheme = { ...base, primaryColor: '#ff0000' }
    expect(readTheme(custom).primaryColor).toBe('#ff0000')
  })
})

describe('themeToCss — color background', () => {
  it('sets background to color', () => {
    const t: FormTheme = { ...base, background: { kind: 'color', color: '#123456' } }
    const out = themeToCss(t)
    expect(out.style.background).toBe('#123456')
  })
  it('exposes CSS vars', () => {
    const out = themeToCss(base) as { style: Record<string, string>; alignment: string }
    expect(out.style['--form-primary']).toBe(base.primaryColor)
    expect(out.style['--form-text']).toBe(base.textColor)
    expect(out.style['--form-radius']).toBeTruthy()
    expect(out.style['--form-heading-font']).toContain('Inter')
  })
})

describe('themeToCss — gradient', () => {
  it('builds linear-gradient with angle', () => {
    const t: FormTheme = { ...base, background: { kind: 'gradient', from: '#000', to: '#fff', angle: 90 } }
    const out = themeToCss(t)
    expect(out.style.background).toBe('linear-gradient(90deg, #000, #fff)')
  })
})

describe('themeToCss — image', () => {
  it('sets backgroundImage and fit', () => {
    const t: FormTheme = { ...base, background: { kind: 'image', assetId: 'a', url: '/uploads/x.jpg', fit: 'contain' } }
    const out = themeToCss(t)
    expect(out.style.backgroundImage).toBe('url(/uploads/x.jpg)')
    expect(out.style.backgroundSize).toBe('contain')
  })
  it('defaults fit to cover when missing', () => {
    const t: FormTheme = { ...base, background: { kind: 'image', assetId: 'a', url: '/uploads/x.jpg' } }
    const out = themeToCss(t)
    expect(out.style.backgroundSize).toBe('cover')
  })
})

describe('themeToCss — radius mapping', () => {
  it('maps each radius key to a px value', () => {
    for (const key of ['none', 'sm', 'md', 'lg', 'xl'] as const) {
      const out = themeToCss({ ...base, borderRadius: key }) as { style: Record<string, string> }
      expect(out.style['--form-radius']).toMatch(/^\d+px$/)
    }
  })
})

describe('themeToCss — font stacks differ', () => {
  it('heading and body resolve independently', () => {
    const out = themeToCss({ ...base, headingFont: 'playfair', bodyFont: 'jetbrains' }) as { style: Record<string, string> }
    expect(out.style['--form-heading-font']).toContain('Playfair')
    expect(out.style['--form-body-font']).toContain('JetBrains')
  })
})
