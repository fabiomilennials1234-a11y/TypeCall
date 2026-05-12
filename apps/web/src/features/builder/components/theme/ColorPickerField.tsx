import { useId } from 'react'
import { cn } from '@/lib/cn'

interface ColorPickerFieldProps {
  label: string
  value: string
  onChange: (next: string) => void
  className?: string
}

export function ColorPickerField({ label, value, onChange, className }: ColorPickerFieldProps) {
  const id = useId()
  const safeColor = isHex(value) ? value : '#000000'

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <label
          htmlFor={id}
          className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border"
          style={{ background: value }}
          aria-label={`Selecionar cor de ${label}`}
        >
          <input
            id={id}
            type="color"
            value={safeColor}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000 or hsl(...)"
          className={cn(
            'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm tabular-nums',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          )}
        />
      </div>
    </div>
  )
}

function isHex(s: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(s)
}
