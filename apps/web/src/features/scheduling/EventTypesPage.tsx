import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar, Clock, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import * as eventTypesApi from '@/api/endpoints/eventTypes'
import { cn } from '@/lib/cn'

export function EventTypesPage() {
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['event-types'],
    queryFn: () => eventTypesApi.listEventTypes(),
  })

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agendamentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure seus tipos de reuniao e disponibilidade
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Novo tipo
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-12">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h2 className="mt-4 text-lg font-medium">Erro ao carregar agendamentos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tente recarregar a página.</p>
        </div>
      )}

      {data && data.eventTypes.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Calendar className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-medium">Nenhum tipo de reuniao</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie seu primeiro tipo de reuniao para receber agendamentos
          </p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Criar tipo de reuniao
          </Button>
        </div>
      )}

      {data && data.eventTypes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.eventTypes.map((et) => (
            <Link
              key={et.id}
              to={`/scheduling/${et.id}`}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: et.color }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {et.title}
                  </h3>
                  {et.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {et.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {et.durationMinutes}min
                </span>
                <span className={cn(
                  'rounded-md px-1.5 py-0.5 text-xs font-medium',
                  et.isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {et.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && <CreateEventTypeDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function CreateEventTypeDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(30)

  const createMutation = useMutation({
    mutationFn: () =>
      eventTypesApi.createEventType({
        title,
        durationMinutes: duration,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Novo tipo de reuniao</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina o nome e duracao da reuniao
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Nome</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reuniao de Demonstracao"
              autoFocus
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Duracao (minutos)</label>
            <div className="mt-1.5 flex gap-2">
              {[15, 30, 45, 60].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
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
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!title.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Criando...' : 'Criar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
