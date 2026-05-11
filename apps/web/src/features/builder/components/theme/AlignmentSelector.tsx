import { AlignLeft, AlignCenter } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Alignment } from '../../lib/theme'

interface AlignmentSelectorProps {
  value: Alignment
  onChange: (next: Alignment) => void
}

const OPTS: Array<{ key: Alignment; label: string; Icon: typeof AlignLeft }> = [
  { key: 'left',   label: 'Esquerda', Icon: AlignLeft },
  { key: 'center', label: 'Centro',   Icon: AlignCenter },
]

export function AlignmentSelector({ value, onChange }: AlignmentSelectorProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">Alinhamento</span>
      <div className="grid grid-cols-2 gap-1.5">
        {OPTS.map((o) => {
          const selected = value === o.key
          return (
            <button
              key={o.key}
              onClick={() => onChange(o.key)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors',
                selected
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/40',
              )}
            >
              <o.Icon className="h-3.5 w-3.5" />
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
