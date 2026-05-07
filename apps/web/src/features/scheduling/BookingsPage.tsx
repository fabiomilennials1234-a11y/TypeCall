import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Clock, User, XCircle, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import * as bookingsApi from '@/api/endpoints/bookings'
import { cn } from '@/lib/cn'

const statusConfig = {
  pending: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-500' },
  confirmed: { label: 'Confirmado', className: 'bg-primary/10 text-primary' },
  completed: { label: 'Concluido', className: 'bg-emerald-500/10 text-emerald-500' },
  cancelled: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive' },
  rescheduled: { label: 'Reagendado', className: 'bg-orange-500/10 text-orange-500' },
  no_show: { label: 'No-show', className: 'bg-muted text-muted-foreground' },
} as const

export function BookingsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.listBookings(),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.cancelBooking(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Reunioes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.bookings.length} reuniao${data.bookings.length !== 1 ? 'es' : ''}` : 'Carregando...'}
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-12">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h2 className="mt-4 text-lg font-medium">Erro ao carregar reuniões</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tente recarregar a página.</p>
        </div>
      )}

      {data && data.bookings.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Calendar className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-medium">Nenhuma reuniao</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reunioes agendadas aparecerao aqui
          </p>
        </div>
      )}

      {data && data.bookings.length > 0 && (
        <div className="space-y-2">
          {data.bookings.map((booking) => {
            const config = statusConfig[booking.status] ?? statusConfig.confirmed
            const startDate = new Date(booking.startTime)
            const endDate = new Date(booking.endTime)

            return (
              <div
                key={booking.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-muted">
                  <span className="text-xs font-medium text-muted-foreground">
                    {startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {booking.attendeeName}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{booking.attendeeEmail}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', config.className)}>
                  {config.label}
                </span>

                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                  <button
                    onClick={() => {
                      if (confirm('Cancelar esta reuniao?')) {
                        cancelMutation.mutate(booking.id)
                      }
                    }}
                    disabled={cancelMutation.isPending}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    title="Cancelar"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
