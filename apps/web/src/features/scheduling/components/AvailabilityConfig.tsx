import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import * as eventTypesApi from '@/api/endpoints/eventTypes'
import { cn } from '@/lib/cn'

const DAYS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']

interface DayRule {
  enabled: boolean
  startTime: string
  endTime: string
}

export function AvailabilityConfig({ eventTypeId }: { eventTypeId: string }) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['availability', eventTypeId],
    queryFn: () => eventTypesApi.getAvailability(eventTypeId),
  })

  const [rules, setRules] = useState<DayRule[]>(() =>
    Array.from({ length: 7 }, () => ({ enabled: false, startTime: '09:00', endTime: '18:00' }))
  )
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!data || initialized) return
    const newRules: DayRule[] = Array.from({ length: 7 }, () => ({
      enabled: false,
      startTime: '09:00',
      endTime: '18:00',
    }))
    for (const rule of data.rules ?? []) {
      if (rule.dayOfWeek >= 0 && rule.dayOfWeek <= 6) {
        newRules[rule.dayOfWeek] = {
          enabled: true,
          startTime: (rule.startTime ?? '09:00:00').slice(0, 5),
          endTime: (rule.endTime ?? '18:00:00').slice(0, 5),
        }
      }
    }
    setRules(newRules)
    setInitialized(true)
  }, [data, initialized])

  const saveMutation = useMutation({
    mutationFn: () => {
      const ruleInputs = rules
        .map((r, idx) => (r.enabled ? { dayOfWeek: idx, startTime: r.startTime, endTime: r.endTime } : null))
        .filter((r): r is NonNullable<typeof r> => r !== null)

      return eventTypesApi.setAvailability(eventTypeId, { rules: ruleInputs })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', eventTypeId] })
    },
  })

  const updateDay = (idx: number, update: Partial<DayRule>) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...update } : r)))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-base font-medium">Horario semanal</h3>
        <p className="text-sm text-muted-foreground">
          Configure os dias e horarios que voce esta disponivel
        </p>
      </div>

      <div className="space-y-2">
        {DAYS.map((day, idx) => (
          <div
            key={idx}
            className={cn(
              'flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors',
              rules[idx]!.enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/30'
            )}
          >
            <label className="flex w-24 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={rules[idx]!.enabled}
                onChange={(e) => updateDay(idx, { enabled: e.target.checked })}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className={cn(
                'text-sm',
                rules[idx]!.enabled ? 'font-medium text-foreground' : 'text-muted-foreground'
              )}>
                {day}
              </span>
            </label>

            {rules[idx]!.enabled && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={rules[idx]!.startTime}
                  onChange={(e) => updateDay(idx, { startTime: e.target.value })}
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
                />
                <span className="text-sm text-muted-foreground">ate</span>
                <input
                  type="time"
                  value={rules[idx]!.endTime}
                  onChange={(e) => updateDay(idx, { endTime: e.target.value })}
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
                />
              </div>
            )}

            {!rules[idx]!.enabled && (
              <span className="text-sm text-muted-foreground">Indisponivel</span>
            )}
          </div>
        ))}
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        <Save className="h-4 w-4" />
        {saveMutation.isPending ? 'Salvando...' : 'Salvar disponibilidade'}
      </Button>

      {data && (data.overrides?.length ?? 0) > 0 && (
        <div className="mt-8">
          <h3 className="text-base font-medium">Excecoes</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Datas especificas com horario diferente ou bloqueadas
          </p>
          <div className="space-y-2">
            {(data.overrides ?? []).map((o) => (
              <OverrideItem key={o.id} override={o} eventTypeId={eventTypeId} />
            ))}
          </div>
        </div>
      )}

      <AddOverrideForm eventTypeId={eventTypeId} />
    </div>
  )
}

function OverrideItem({ override, eventTypeId }: { override: eventTypesApi.AvailabilityOverride; eventTypeId: string }) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => eventTypesApi.deleteOverride(eventTypeId, override.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability', eventTypeId] }),
  })

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
      <div>
        <span className="text-sm font-medium text-foreground">
          {new Date(override.date + 'T12:00:00').toLocaleDateString('pt-BR')}
        </span>
        {override.isAvailable ? (
          <span className="ml-2 text-sm text-muted-foreground">
            {override.startTime?.slice(0, 5)} - {override.endTime?.slice(0, 5)}
          </span>
        ) : (
          <span className="ml-2 text-sm text-destructive">Bloqueado</span>
        )}
        {override.reason && (
          <span className="ml-2 text-xs text-muted-foreground">({override.reason})</span>
        )}
      </div>
      <button
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        className="rounded-md p-1.5 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function AddOverrideForm({ eventTypeId }: { eventTypeId: string }) {
  const queryClient = useQueryClient()
  const [date, setDate] = useState('')
  const [isAvailable, setIsAvailable] = useState(false)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('12:00')
  const [reason, setReason] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      eventTypesApi.createOverride(eventTypeId, {
        date,
        isAvailable,
        startTime: isAvailable ? startTime : undefined,
        endTime: isAvailable ? endTime : undefined,
        reason: reason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', eventTypeId] })
      setDate('')
      setReason('')
    },
  })

  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <h4 className="text-sm font-medium text-foreground mb-3">Adicionar excecao</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tipo</label>
          <select
            value={isAvailable ? 'custom' : 'blocked'}
            onChange={(e) => setIsAvailable(e.target.value === 'custom')}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
          >
            <option value="blocked">Dia bloqueado</option>
            <option value="custom">Horario customizado</option>
          </select>
        </div>
        {isAvailable && (
          <>
            <div>
              <label className="text-xs text-muted-foreground">Inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fim</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </>
        )}
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground">Motivo (opcional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Feriado"
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>
      <Button
        size="sm"
        className="mt-3"
        onClick={() => createMutation.mutate()}
        disabled={!date || createMutation.isPending}
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar excecao
      </Button>
    </div>
  )
}
