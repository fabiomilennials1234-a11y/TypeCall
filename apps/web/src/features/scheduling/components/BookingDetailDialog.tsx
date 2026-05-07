import { useEffect } from 'react'
import { Calendar, Clock, Mail, MapPin, Phone, StickyNote, X } from 'lucide-react'

import type { Booking } from '@/api/endpoints/bookings'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

import { diffMinutes, getStatusConfig } from '../lib/bookings'

interface BookingDetailDialogProps {
  booking: Booking | null
  isCancelling: boolean
  onClose: () => void
  onCancel: (id: string) => void
}

export function BookingDetailDialog({ booking, isCancelling, onClose, onCancel }: BookingDetailDialogProps) {
  useEffect(() => {
    if (!booking) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [booking, onClose])

  if (!booking) return null

  const config = getStatusConfig(booking.status)
  const start = new Date(booking.startTime)
  const end = new Date(booking.endTime)
  const duration = diffMinutes(booking.startTime, booking.endTime)
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed'
  const isUrlLocation = booking.meetingUrl ?? (booking.locationValue?.startsWith('http') ? booking.locationValue : null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-foreground">{booking.attendeeName}</h2>
            <span className={cn('mt-1.5 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', config.className)}>
              {config.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-3 text-sm">
          <Row icon={<Calendar className="h-4 w-4" />}>
            {start.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </Row>
          <Row icon={<Clock className="h-4 w-4" />}>
            {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {' - '}
            {end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            <span className="ml-2 text-xs text-muted-foreground">
              ({duration} min · {booking.timezone})
            </span>
          </Row>
          <Row icon={<Mail className="h-4 w-4" />}>
            <a href={`mailto:${booking.attendeeEmail}`} className="text-foreground hover:text-primary">
              {booking.attendeeEmail}
            </a>
          </Row>
          {booking.attendeePhone && (
            <Row icon={<Phone className="h-4 w-4" />}>
              <a href={`tel:${booking.attendeePhone}`} className="text-foreground hover:text-primary">
                {booking.attendeePhone}
              </a>
            </Row>
          )}
          {(booking.locationType || isUrlLocation) && (
            <Row icon={<MapPin className="h-4 w-4" />}>
              {isUrlLocation ? (
                <a
                  href={isUrlLocation}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {booking.locationType || 'Link da reuniao'}
                </a>
              ) : (
                <span className="text-foreground">{booking.locationValue || booking.locationType}</span>
              )}
            </Row>
          )}
          {booking.notes && (
            <Row icon={<StickyNote className="h-4 w-4" />}>
              <span className="whitespace-pre-wrap text-foreground">{booking.notes}</span>
            </Row>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {canCancel ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={isCancelling}
              onClick={() => {
                if (confirm('Cancelar esta reuniao?')) {
                  onCancel(booking.id)
                }
              }}
            >
              {isCancelling ? 'Cancelando...' : 'Cancelar reuniao'}
            </Button>
          ) : (
            <span />
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
