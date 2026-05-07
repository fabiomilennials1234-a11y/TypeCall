import { cn } from '@/lib/cn'
import type { RadiusKey } from '../../lib/theme'

const OPTIONS: Array<{ key: RadiusKey; label: string; preview: string }> = [
  { key: 'none', label: 'Reto',     preview: 'rounded-none' },
  { key: 'sm',   label: 'Sutil',    preview: 'rounded-sm' },
  { key: 'md',   label: 'Medio',    preview: 'rounded-md' },
  { key: 'lg',   label: 'Generoso', preview: 'rounded-lg' },
  { key: 'xl',   label: 'Pleno',    preview: 'rounded-xl' },
]

interface RadiusSelectorProps {
  value: RadiusKey
  onChange: (next: RadiusKey) => void
}

export function RadiusSelector({ value, onChange }: RadiusSelectorProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">Cantos</span>
      <div className="grid grid-cols-5 gap-1.5">
        {OPTIONS.map((opt) => {
          const selected = value === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md border px-1 py-1.5 text-[10px] transition-colors',
                selected
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/40',
              )}
              title={opt.label}
            >
              <span
                className={cn(
                  'h-5 w-5 border border-current',
                  opt.preview,
                )}
              />
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
