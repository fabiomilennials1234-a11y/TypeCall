import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2, Clock, MapPin, Save, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import * as eventTypesApi from '@/api/endpoints/eventTypes'
import { AvailabilityConfig } from '@/features/scheduling/components/AvailabilityConfig'
import { cn } from '@/lib/cn'

export function EventTypeDetailPage() {
  const { eventTypeId } = useParams<{ eventTypeId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: et, isLoading, isError } = useQuery({
    queryKey: ['event-type', eventTypeId],
    queryFn: () => eventTypesApi.getEventType(eventTypeId!),
    enabled: !!eventTypeId,
  })

  const [tab, setTab] = useState<'settings' | 'availability'>('settings')

  const deleteMutation = useMutation({
    mutationFn: () => eventTypesApi.deleteEventType(eventTypeId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] })
      navigate('/scheduling')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !et) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="mt-4 text-lg font-medium">Tipo de reunião não encontrado</h2>
        <p className="mt-1 text-sm text-muted-foreground">Este agendamento não existe ou foi removido.</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/scheduling')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Agendamentos
        </button>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className="mt-1 h-4 w-4 shrink-0 rounded-full"
            style={{ backgroundColor: et.color }}
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{et.title}</h1>
            {et.description && (
              <p className="mt-1 text-sm text-muted-foreground">{et.description}</p>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {et.durationMinutes}min
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {et.locationType === 'google_meet' ? 'Google Meet' : et.locationType === 'in_person' ? 'Presencial' : 'Link customizado'}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm('Tem certeza que deseja excluir este tipo de reuniao?')) {
              deleteMutation.mutate()
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </div>

      <div className="mb-6 flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('settings')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            tab === 'settings'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Configuracoes
        </button>
        <button
          onClick={() => setTab('availability')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            tab === 'availability'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Disponibilidade
        </button>
      </div>

      {tab === 'settings' && (
        <EventTypeSettings eventType={et} />
      )}

      {tab === 'availability' && (
        <AvailabilityConfig eventTypeId={et.id} />
      )}
    </div>
  )
}

function EventTypeSettings({ eventType }: { eventType: eventTypesApi.EventType }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(eventType.title)
  const [description, setDescription] = useState(eventType.description ?? '')
  const [duration, setDuration] = useState(eventType.durationMinutes)
  const [bufferBefore, setBufferBefore] = useState(eventType.bufferBeforeMinutes)
  const [bufferAfter, setBufferAfter] = useState(eventType.bufferAfterMinutes)
  const [minNotice, setMinNotice] = useState(eventType.minNoticeHours)
  const [maxAdvance, setMaxAdvance] = useState(eventType.maxAdvanceDays)

  const updateMutation = useMutation({
    mutationFn: () =>
      eventTypesApi.updateEventType(eventType.id, {
        title,
        description: description || undefined,
        durationMinutes: duration,
        bufferBeforeMinutes: bufferBefore,
        bufferAfterMinutes: bufferAfter,
        minNoticeHours: minNotice,
        maxAdvanceDays: maxAdvance,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-type', eventType.id] })
    },
  })

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <label className="text-sm font-medium text-foreground">Nome</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Descricao</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Duracao (minutos)</label>
        <div className="mt-1.5 flex gap-2">
          {[15, 30, 45, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={cn(
                'rounded-md border px-3 py-2 text-sm transition-colors',
                duration === d
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-border text-foreground hover:border-primary/40'
              )}
            >
              {d}min
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground">Buffer antes (min)</label>
          <input
            type="number"
            value={bufferBefore}
            onChange={(e) => setBufferBefore(Number(e.target.value))}
            min={0}
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Buffer depois (min)</label>
          <input
            type="number"
            value={bufferAfter}
            onChange={(e) => setBufferAfter(Number(e.target.value))}
            min={0}
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground">Antecedencia minima (horas)</label>
          <input
            type="number"
            value={minNotice}
            onChange={(e) => setMinNotice(Number(e.target.value))}
            min={0}
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Maximo no futuro (dias)</label>
          <input
            type="number"
            value={maxAdvance}
            onChange={(e) => setMaxAdvance(Number(e.target.value))}
            min={1}
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <Button
        onClick={() => updateMutation.mutate()}
        disabled={updateMutation.isPending || !title.trim()}
      >
        <Save className="h-4 w-4" />
        {updateMutation.isPending ? 'Salvando...' : 'Salvar alteracoes'}
      </Button>
    </div>
  )
}
