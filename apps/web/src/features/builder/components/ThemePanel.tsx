import { Palette } from 'lucide-react'

import type { FormTheme } from '../lib/theme'
import { BackgroundEditor } from './theme/BackgroundEditor'
import { ColorPickerField } from './theme/ColorPickerField'
import { FontPickerField } from './theme/FontPickerField'
import { RadiusSelector } from './theme/RadiusSelector'
import { AlignmentSelector } from './theme/AlignmentSelector'

interface ThemePanelProps {
  formId: string
  theme: FormTheme
  onChange: (next: FormTheme) => void
}

export function ThemePanel({ formId, theme, onChange }: ThemePanelProps) {
  function patch<K extends keyof FormTheme>(key: K, value: FormTheme[K]) {
    onChange({ ...theme, [key]: value })
  }

  return (
    <div className="flex h-full w-72 flex-col border-l border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Palette className="h-3.5 w-3.5 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Tema do formulario</h2>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <Section title="Fundo">
          <BackgroundEditor
            formId={formId}
            value={theme.background}
            onChange={(bg) => patch('background', bg)}
          />
        </Section>

        <Section title="Cores">
          <div className="space-y-3">
            <ColorPickerField
              label="Cor primaria"
              value={theme.primaryColor}
              onChange={(v) => patch('primaryColor', v)}
            />
            <ColorPickerField
              label="Cor de texto"
              value={theme.textColor}
              onChange={(v) => patch('textColor', v)}
            />
            <ColorPickerField
              label="Cor do card"
              value={theme.cardColor}
              onChange={(v) => patch('cardColor', v)}
            />
          </div>
        </Section>

        <Section title="Tipografia">
          <div className="space-y-4">
            <FontPickerField
              label="Fonte de titulos"
              value={theme.headingFont}
              onChange={(v) => patch('headingFont', v)}
            />
            <FontPickerField
              label="Fonte de corpo"
              value={theme.bodyFont}
              onChange={(v) => patch('bodyFont', v)}
            />
          </div>
        </Section>

        <Section title="Forma">
          <div className="space-y-3">
            <RadiusSelector
              value={theme.borderRadius}
              onChange={(v) => patch('borderRadius', v)}
            />
            <AlignmentSelector
              value={theme.alignment}
              onChange={(v) => patch('alignment', v)}
            />
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  )
}
