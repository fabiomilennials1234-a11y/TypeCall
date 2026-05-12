import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Loader2 } from 'lucide-react'

import * as sellersApi from '@/api/endpoints/sellers'
import type { SellerLocationType } from '@/api/endpoints/sellers'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

interface DayRule {
  enabled: boolean
  startTime: string
  endTime: string
}

const DURATIONS = [15, 30, 45, 60]
const BUFFERS = [0, 15, 30]
const LOCATIONS: Array<{ key: SellerLocationType; label: string }> = [
  { key: 'online',     label: 'Meeting online' },
  { key: 'whatsapp',   label: 'Ligacao WhatsApp' },
  { key: 'presencial', label: 'Visita presencial' },
]

export function AvailabilitySettings({ sellerId }: { sellerId: string }) {
  const queryClient = useQueryClient()

  const sellerQ = useQuery({
    queryKey: ['seller', sellerId],
    queryFn: () => sellersApi.getSeller(sellerId),
  })
  const availQ = useQuery({
    queryKey: ['seller-availability', sellerId],
    queryFn: () => sellersApi.getAvailability(sellerId),
  })

  const [duration, setDuration] = useState(30)
  const [buffer, setBuffer] = useState(15)
  const [location, setLocation] = useState<SellerLocationType>('online')
  const [active, setActive] = useState(true)
  const [rules, setRules] = useState<DayRule[]>(() =>
    Array.from({ length: 7 }, () => ({ enabled: false, startTime: '09:00', endTime: '18:00' })),
  )
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!sellerQ.data) return
    setDuration(sellerQ.data.meetingDurationMinutes)
    setBuffer(sellerQ.data.bufferAfterMinutes)
    setLocation(sellerQ.data.locationType)
    setActive(sellerQ.data.active)
  }, [sellerQ.data])

  useEffect(() => {
    if (!availQ.data || initialized) return
    const next = Array.from({ length: 7 }, () => ({ enabled: false, startTime: '09:00', endTime: '18:00' }))
    for (const slot of availQ.data.slots ?? []) {
      if (slot.dayOfWeek >= 0 && slot.dayOfWeek <= 6) {
        next[slot.dayOfWeek] = {
          enabled: true,
          startTime: (slot.startTime ?? '09:00:00').slice(0, 5),
          endTime: (slot.endTime ?? '18:00:00').slice(0, 5),
        }
      }
    }
    setRules(next)
    setInitialized(true)
  }, [availQ.data, initialized])

  const updateSeller = useMutation({
    mutationFn: () => sellersApi.updateSeller(sellerId, {
      meetingDurationMinutes: duration,
      bufferAfterMinutes: buffer,
      locationType: location,
      active,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seller', sellerId] }),
  })

  const updateAvailability = useMutation({
    mutationFn: () => {
      const slots = rules
        .map((r, idx) => (r.enabled ? { dayOfWeek: idx, startTime: r.startTime, endTime: r.endTime } : null))
        .filter((s): s is NonNullable<typeof s> => s !== null)
      return sellersApi.setAvailability(sellerId, slots)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seller-availability', sellerId] }),
  })

  const save = () => {
    updateSeller.mutate()
    updateAvailability.mutate()
  }

  const isSaving = updateSeller.isPending || updateAvailability.isPending

  function patchDay(idx: number, patch: Partial<DayRule>) {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  if (sellerQ.isLoading || availQ.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Section title="Tipo de reuniao">
        <div className="grid grid-cols-3 gap-2">
          {LOCATIONS.map((l) => (
            <button
              key={l.key}
              onClick={() => setLocation(l.key)}
              className={cn(
                'rounded-md border px-3 py-2 text-xs transition-colors',
                location === l.key
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:border-primary/40',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Duracao da reuniao">
        <div className="grid grid-cols-4 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={cn(
                'rounded-md border py-2 text-xs',
                duration === d
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:border-primary/40',
              )}
            >
              {d} min
            </button>
          ))}
        </div>
      </Section>

      <Section title="Buffer apos reuniao">
        <div className="grid grid-cols-3 gap-2">
          {BUFFERS.map((b) => (
            <button
              key={b}
              onClick={() => setBuffer(b)}
              className={cn(
                'rounded-md border py-2 text-xs',
                buffer === b
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:border-primary/40',
              )}
            >
              {b === 0 ? 'Sem buffer' : `${b} min`}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Disponibilidade semanal">
        <div className="space-y-1.5">
          {DAYS.map((day, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                rules[idx]!.enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/30',
              )}
            >
              <label className="flex w-20 cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={rules[idx]!.enabled}
                  onChange={(e) => patchDay(idx, { enabled: e.target.checked })}
                  className="h-3.5 w-3.5 rounded accent-primary"
                />
                <span className={rules[idx]!.enabled ? 'font-medium' : 'text-muted-foreground'}>{day}</span>
              </label>
              {rules[idx]!.enabled ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <input
                    type="time"
                    value={rules[idx]!.startTime}
                    onChange={(e) => patchDay(idx, { startTime: e.target.value })}
                    className="rounded-md border border-border bg-background px-2 py-1"
                  />
                  <span className="text-muted-foreground">ate</span>
                  <input
                    type="time"
                    value={rules[idx]!.endTime}
                    onChange={(e) => patchDay(idx, { endTime: e.target.value })}
                    className="rounded-md border border-border bg-background px-2 py-1"
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Indisponivel</span>
              )}
            </div>
          ))}
        </div>
      </Section>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded accent-primary"
          />
          Vendedor ativo
        </label>
        <Button onClick={save} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}
