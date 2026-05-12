import type { LeadTag } from '@typecall/flow-engine'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'

export type DestinationKind = 'schedule' | 'close' | 'redirect'

export interface TagDestination {
  kind: DestinationKind
  redirectUrl?: string
}

export type TagDestinationsMap = Partial<Record<LeadTag, TagDestination>>

const TAGS: Array<{ key: LeadTag; label: string; color: string }> = [
  { key: 'diamond',      label: 'Diamond',         color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40' },
  { key: 'gold',         label: 'Gold',            color: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
  { key: 'silver',       label: 'Silver',          color: 'bg-zinc-400/15 text-zinc-300 border-zinc-400/40' },
  { key: 'bronze',       label: 'Bronze',          color: 'bg-orange-700/15 text-orange-400 border-orange-700/40' },
  { key: 'disqualified', label: 'Desqualificado',  color: 'bg-destructive/15 text-destructive border-destructive/40' },
]

const KIND_LABELS: Record<DestinationKind, string> = {
  schedule: 'Avancar para agendamento',
  close: 'Fechar formulario',
  redirect: 'Redirecionar para URL',
}

export const DEFAULT_TAG_DESTINATIONS: TagDestinationsMap = {
  diamond: { kind: 'schedule' },
  gold: { kind: 'schedule' },
  silver: { kind: 'schedule' },
  bronze: { kind: 'close' },
  disqualified: { kind: 'close' },
}

interface TagDestinationPanelProps {
  value: TagDestinationsMap
  onChange: (next: TagDestinationsMap) => void
}

export function TagDestinationPanel({ value, onChange }: TagDestinationPanelProps) {
  function patch(tag: LeadTag, patchValue: Partial<TagDestination>) {
    const current = value[tag] ?? { kind: 'close' as DestinationKind }
    onChange({ ...value, [tag]: { ...current, ...patchValue } })
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-foreground">Destino por etiqueta</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Define o que acontece apos a qualificacao baseado na tag final do lead.
        </p>
      </div>

      <div className="space-y-2">
        {TAGS.map((t) => {
          const dest = value[t.key] ?? DEFAULT_TAG_DESTINATIONS[t.key] ?? { kind: 'close' }
          return (
            <div key={t.key} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between">
                <span className={cn('rounded px-2 py-0.5 text-[11px] font-medium border', t.color)}>
                  {t.label}
                </span>
              </div>

              <select
                value={dest.kind}
                onChange={(e) => patch(t.key, { kind: e.target.value as DestinationKind })}
                className="mt-2 h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
              >
                {(Object.keys(KIND_LABELS) as DestinationKind[]).map((k) => (
                  <option key={k} value={k}>{KIND_LABELS[k]}</option>
                ))}
              </select>

              {dest.kind === 'redirect' && (
                <Input
                  className="mt-2 h-8 text-xs"
                  value={dest.redirectUrl ?? ''}
                  onChange={(e) => patch(t.key, { redirectUrl: e.target.value })}
                  placeholder="https://..."
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
