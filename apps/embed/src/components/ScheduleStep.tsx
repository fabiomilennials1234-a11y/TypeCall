import { useState, useMemo, useEffect } from 'react'
import { getSlots, createBooking, type TimeSlot } from '@/api'
import { notifyBookingCreated } from '@/bridge'

interface ScheduleStepProps {
  eventTypeId: string
  prefillName?: string
  prefillEmail?: string
  onBooked: (bookingId: string) => void
}

export function ScheduleStep({ eventTypeId, prefillName, prefillEmail, onBooked }: ScheduleStepProps) {
  const [phase, setPhase] = useState<'calendar' | 'slots' | 'confirm' | 'done'>('calendar')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [name, setName] = useState(prefillName ?? '')
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingPending, setBookingPending] = useState(false)

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())

  useEffect(() => {
    if (!eventTypeId) return
    setSlotsLoading(true)
    const from = new Date(viewYear, viewMonth, 1).toISOString().slice(0, 10)
    const to = new Date(viewYear, viewMonth + 1, 0).toISOString().slice(0, 10)
    getSlots(eventTypeId, { from, to, timezone: tz })
      .then((data) => setSlots(data.slots))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [eventTypeId, viewMonth, viewYear, tz])

  const slotsByDate = useMemo(() => {
    const map: Record<string, TimeSlot[]> = {}
    for (const slot of slots) {
      const date = new Date(slot.start).toLocaleDateString('en-CA')
      if (!map[date]) map[date] = []
      map[date]!.push(slot)
    }
    return map
  }, [slots])

  const handleBook = async () => {
    if (!selectedSlot || !name.trim() || !email.trim()) return
    setBookingPending(true)
    setBookingError('')
    try {
      const booking = await createBooking({
        eventTypeId,
        attendeeName: name,
        attendeeEmail: email,
        startTime: selectedSlot.start,
        timezone: tz,
      })
      setPhase('done')
      notifyBookingCreated(booking.id, selectedSlot.start, selectedSlot.end)
      onBooked(booking.id)
    } catch {
      setBookingError('Horario indisponivel. Tente outro horario.')
    } finally {
      setBookingPending(false)
    }
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">Agendamento confirmado!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedSlot && new Date(selectedSlot.start).toLocaleString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
    )
  }

  if (phase === 'confirm') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm">
            <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <span className="font-medium text-foreground">
              {selectedSlot && new Date(selectedSlot.start).toLocaleString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              className="mt-1 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="mt-1 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPhase('slots')}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
          >
            Voltar
          </button>
          <button
            onClick={handleBook}
            disabled={!name.trim() || !email.trim() || bookingPending}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {bookingPending ? 'Agendando...' : 'Confirmar agendamento'}
          </button>
        </div>
        {bookingError && <p className="text-sm text-destructive">{bookingError}</p>}
      </div>
    )
  }

  if (phase === 'slots' && selectedDate) {
    const daySlots = slotsByDate[selectedDate] ?? []
    return (
      <div className="space-y-3">
        <button
          onClick={() => { setPhase('calendar'); setSelectedDate(null); setSelectedSlot(null) }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
        </button>
        {daySlots.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum horario disponivel</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {daySlots.map((slot) => {
              const time = new Date(slot.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              return (
                <button
                  key={slot.start}
                  onClick={() => { setSelectedSlot(slot); setPhase('confirm') }}
                  className="rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground hover:border-primary/40"
                >
                  {time}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) } else setViewMonth(viewMonth - 1) }}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        >
          ‹
        </button>
        <span className="text-sm font-medium capitalize text-foreground">{monthLabel}</span>
        <button
          onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) } else setViewMonth(viewMonth + 1) }}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} className="py-1 text-xs font-medium text-muted-foreground">{d}</div>
        ))}

        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasSlots = (slotsByDate[dateStr]?.length ?? 0) > 0
          const isPast = new Date(dateStr) < new Date(today.toISOString().slice(0, 10))

          return (
            <button
              key={day}
              disabled={!hasSlots || isPast}
              onClick={() => { setSelectedDate(dateStr); setPhase('slots') }}
              className={`relative rounded-lg py-2 text-sm transition-all ${
                hasSlots && !isPast
                  ? 'cursor-pointer font-medium text-foreground hover:bg-primary/10'
                  : 'cursor-default text-muted-foreground/40'
              }`}
            >
              {day}
              {hasSlots && !isPast && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>

      {slotsLoading && (
        <div className="flex items-center justify-center py-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  )
}
