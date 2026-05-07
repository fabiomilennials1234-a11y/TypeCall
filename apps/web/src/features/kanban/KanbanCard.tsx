import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Phone, MessageCircle, Clock, CalendarClock, Loader2 } from 'lucide-react'

import type { Booking } from '@/api/endpoints/bookings'
import { cn } from '@/lib/cn'

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  diamond:      { bg: 'bg-[#7F77DD]/15', text: 'text-[#7F77DD]' },
  gold:         { bg: 'bg-[#BA7517]/15', text: 'text-[#BA7517]' },
  silver:       { bg: 'bg-[#888780]/15', text: 'text-[#888780]' },
  bronze:       { bg: 'bg-[#D85A30]/15', text: 'text-[#D85A30]' },
  disqualified: { bg: 'bg-destructive/15', text: 'text-destructive' },
}

const TAG_LABEL: Record<string, string> = {
  diamond: 'Diamond', gold: 'Gold', silver: 'Silver', bronze: 'Bronze', disqualified: 'Desqualificado',
}

const LOCATION_LABEL: Record<string, string> = {
  online: 'Online', whatsapp: 'WhatsApp', presencial: 'Presencial', google_meet: 'Online', custom_url: 'Online', in_person: 'Presencial',
}

interface KanbanCardProps {
  booking: Booking
  onReschedule: (bookingId: string, newDatetime: string) => void
  isRescheduling: boolean
}

export function KanbanCard({ booking, onReschedule, isRescheduling }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: booking.id })
  const [showPicker, setShowPicker] = useState(false)

  const phone = booking.attendeePhone?.replace(/\D/g, '')
  const start = new Date(booking.startTime)
  const tagColors = booking.leadTag ? TAG_COLORS[booking.leadTag] : null
  const tagLabel = booking.leadTag ? TAG_LABEL[booking.leadTag] : null

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : {}

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow',
        isDragging ? 'opacity-60 shadow-xl ring-2 ring-primary/40' : 'hover:shadow-md',
      )}
    >
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">{booking.attendeeName}</h3>
          {tagLabel && tagColors && (
            <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold', tagColors.bg, tagColors.text)}>
              {tagLabel}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="tabular-nums">
            {start.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="opacity-60">•</span>
          <span>{LOCATION_LABEL[booking.locationType] ?? booking.locationType}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1">
        {phone && (
          <>
            <a
              href={`https://wa.me/${phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-emerald-500"
              title="WhatsApp"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
            <a
              href={`tel:${booking.attendeePhone}`}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              title="Ligar"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          </>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setShowPicker((v) => !v) }}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={isRescheduling}
          className="ml-auto flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          title="Remarcar"
        >
          {isRescheduling ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarClock className="h-3 w-3" />}
          Remarcar
        </button>
      </div>

      {showPicker && (
        <div className="mt-2" onPointerDown={(e) => e.stopPropagation()}>
          <input
            type="datetime-local"
            defaultValue={localDatetimeValue(start)}
            onBlur={(e) => {
              if (e.target.value) {
                const iso = new Date(e.target.value).toISOString()
                onReschedule(booking.id, iso)
                setShowPicker(false)
              }
            }}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          />
        </div>
      )}
    </div>
  )
}

function localDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
