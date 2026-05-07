import { Palette, Image as ImageIcon, Sparkles } from 'lucide-react'

import { cn } from '@/lib/cn'
import type { ThemeBackground } from '../../lib/theme'
import { ColorPickerField } from './ColorPickerField'
import { AssetUploader } from './AssetUploader'

interface BackgroundEditorProps {
  formId: string
  value: ThemeBackground
  onChange: (next: ThemeBackground) => void
}

export function BackgroundEditor({ formId, value, onChange }: BackgroundEditorProps) {
  return (
    <div className="space-y-3">
      <KindTabs kind={value.kind} onChange={onChange} />

      {value.kind === 'color' && (
        <ColorPickerField
          label="Cor de fundo"
          value={value.color}
          onChange={(color) => onChange({ kind: 'color', color })}
        />
      )}

      {value.kind === 'gradient' && (
        <div className="space-y-2">
          <ColorPickerField
            label="De"
            value={value.from}
            onChange={(from) => onChange({ ...value, from })}
          />
          <ColorPickerField
            label="Para"
            value={value.to}
            onChange={(to) => onChange({ ...value, to })}
          />
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Angulo: {value.angle}°</label>
            <input
              type="range"
              min={0}
              max={360}
              value={value.angle}
              onChange={(e) => onChange({ ...value, angle: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          <div
            className="h-12 w-full rounded-md border border-border"
            style={{ background: `linear-gradient(${value.angle}deg, ${value.from}, ${value.to})` }}
          />
        </div>
      )}

      {value.kind === 'image' && (
        <AssetUploader
          formId={formId}
          currentUrl={value.url}
          onUploaded={(asset) =>
            onChange({ kind: 'image', assetId: asset.id, url: asset.url, fit: 'cover' })
          }
          onClear={() => onChange({ kind: 'color', color: '#0a0a0b' })}
        />
      )}
    </div>
  )
}

function KindTabs({
  kind,
  onChange,
}: {
  kind: ThemeBackground['kind']
  onChange: (next: ThemeBackground) => void
}) {
  function pick(next: ThemeBackground['kind']) {
    if (next === kind) return
    if (next === 'color') onChange({ kind: 'color', color: '#0a0a0b' })
    if (next === 'gradient') onChange({ kind: 'gradient', from: '#0a0a0b', to: '#1f1f23', angle: 135 })
    if (next === 'image') onChange({ kind: 'image', assetId: '', url: '', fit: 'cover' })
  }

  const tabs: Array<{ key: ThemeBackground['kind']; label: string; Icon: typeof Palette }> = [
    { key: 'color',    label: 'Cor',       Icon: Palette },
    { key: 'gradient', label: 'Gradiente', Icon: Sparkles },
    { key: 'image',    label: 'Imagem',    Icon: ImageIcon },
  ]

  return (
    <div className="flex rounded-lg border border-border p-0.5">
      {tabs.map((t) => {
        const selected = kind === t.key
        return (
          <button
            key={t.key}
            onClick={() => pick(t.key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
              selected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <t.Icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
