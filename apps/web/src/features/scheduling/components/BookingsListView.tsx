import { useMemo } from 'react'
import { Calendar, Clock, User, XCircle, AlertCircle } from 'lucide-react'

import type { Booking } from '@/api/endpoints/bookings'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

import { sortBookings, getStatusConfig } from '../lib/bookings'

interface BookingsListViewProps {
  bookings: Booking[] | undefined
  isLoading: boolean
  isError: boolean
  isCancelling: boolean
  onCancel: (id: string) => void
  onSelect: (booking: Booking) => void
}

export function BookingsListView({
  bookings,
  isLoading,
  isError,
  isCancelling,
  onCancel,
  onSelect,
}: BookingsListViewProps) {
  const sorted = useMemo(() => (bookings ? sortBookings(bookings) : []), [bookings])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-12">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="mt-4 text-lg font-medium">Erro ao carregar reuniões</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tente recarregar a página.</p>
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <Calendar className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="mt-4 text-lg font-medium">Nenhuma reuniao</h2>
        <p className="mt-1 text-sm text-muted-foreground">Reunioes agendadas aparecerao aqui</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sorted.map((booking) => {
        const config = getStatusConfig(booking.status)
        const startDate = new Date(booking.startTime)
        const endDate = new Date(booking.endTime)
        const canCancel = booking.status === 'pending' || booking.status === 'confirmed'

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

            <button
              onClick={() => onSelect(booking)}
              className="min-w-0 flex-1 text-left"
            >
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
            </button>

            <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', config.className)}>
              {config.label}
            </span>

            {booking.meetingUrl && (
              <a
                href={booking.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="outline" size="sm">
                  Acessar
                </Button>
              </a>
            )}

            {canCancel && (
              <button
                onClick={() => {
                  if (confirm('Cancelar esta reuniao?')) {
                    onCancel(booking.id)
                  }
                }}
                disabled={isCancelling}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                title="Cancelar"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
