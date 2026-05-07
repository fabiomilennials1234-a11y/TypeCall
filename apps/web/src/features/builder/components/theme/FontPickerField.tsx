import { FONTS, type FontKey } from '../../lib/fonts'
import { cn } from '@/lib/cn'

interface FontPickerFieldProps {
  label: string
  value: FontKey
  onChange: (next: FontKey) => void
  className?: string
}

export function FontPickerField({ label, value, onChange, className }: FontPickerFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="grid gap-1.5">
        {FONTS.map((f) => {
          const selected = value === f.key
          return (
            <button
              key={f.key}
              onClick={() => onChange(f.key)}
              className={cn(
                'flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors',
                selected
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              <span className="text-base" style={{ fontFamily: f.stack }}>
                {f.label}
              </span>
              <span className="text-[10px] uppercase tracking-wider opacity-60">{f.category}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
