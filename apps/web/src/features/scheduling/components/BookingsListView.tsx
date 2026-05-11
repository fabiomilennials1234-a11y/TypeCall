import { useMemo } from 'react'
import { Calendar, Clock, User, XCircle, AlertCircle, MessageCircle, Phone, ExternalLink } from 'lucide-react'

import type { Booking } from '@/api/endpoints/bookings'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

import { sortBookings, getStatusConfig } from '../lib/bookings'

const TAG_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  diamond:      { bg: 'bg-[#7F77DD]/15', text: 'text-[#7F77DD]', label: 'Diamond' },
  gold:         { bg: 'bg-[#BA7517]/15', text: 'text-[#BA7517]', label: 'Gold' },
  silver:       { bg: 'bg-[#888780]/15', text: 'text-[#888780]', label: 'Silver' },
  bronze:       { bg: 'bg-[#D85A30]/15', text: 'text-[#D85A30]', label: 'Bronze' },
  disqualified: { bg: 'bg-destructive/15', text: 'text-destructive', label: 'Desq.' },
}

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
            <div className="flex h-14 w-14 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-background">
              <div className="bg-primary/10 py-0.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                {startDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
              </div>
              <div className="flex flex-1 items-center justify-center text-lg font-semibold leading-none tracking-tight text-foreground">
                {startDate.getDate()}
              </div>
              <div className="border-t border-border bg-muted/30 py-0.5 text-center text-[10px] tabular-nums text-muted-foreground">
                {startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
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

            {booking.leadTag && TAG_COLORS[booking.leadTag] && (
              <span className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
                TAG_COLORS[booking.leadTag]!.bg,
                TAG_COLORS[booking.leadTag]!.text,
              )}>
                {TAG_COLORS[booking.leadTag]!.label}
              </span>
            )}

            {booking.attendeePhone && (
              <>
                <a
                  href={`https://wa.me/${booking.attendeePhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-emerald-500"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
                <a
                  href={`tel:${booking.attendeePhone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  title="Ligar"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
              </>
            )}

            {booking.locationType === 'online' && booking.meetingUrl && (
              <a
                href={booking.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5" />
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
