import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Clock, Loader2, Check } from 'lucide-react'

import * as bookingsApi from '@/api/endpoints/bookings'
import { cn } from '@/lib/cn'

interface ScheduleStepProps {
  eventTypeId: string
  prefillName?: string
  prefillEmail?: string
  onBooked: (bookingId: string) => void
}

export function ScheduleStep({ eventTypeId, prefillName, prefillEmail, onBooked }: ScheduleStepProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<bookingsApi.TimeSlot | null>(null)
  const [phase, setPhase] = useState<'calendar' | 'slots' | 'confirm' | 'done'>('calendar')
  const [name, setName] = useState(prefillName ?? '')
  const [email, setEmail] = useState(prefillEmail ?? '')

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())

  const fromDate = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1)
    return d.toISOString().slice(0, 10)
  }, [viewMonth, viewYear])

  const toDate = useMemo(() => {
    const d = new Date(viewYear, viewMonth + 1, 0)
    return d.toISOString().slice(0, 10)
  }, [viewMonth, viewYear])

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', eventTypeId, fromDate, toDate, tz],
    queryFn: () => bookingsApi.getSlots(eventTypeId, { from: fromDate, to: toDate, timezone: tz }),
    enabled: !!eventTypeId,
  })

  const slotsByDate = useMemo(() => {
    const map: Record<string, bookingsApi.TimeSlot[]> = {}
    if (!slotsData?.slots) return map
    for (const slot of slotsData.slots) {
      const date = new Date(slot.start).toLocaleDateString('en-CA')
      if (!map[date]) map[date] = []
      map[date]!.push(slot)
    }
    return map
  }, [slotsData])

  const bookMutation = useMutation({
    mutationFn: () =>
      bookingsApi.createPublicBooking({
        eventTypeId,
        attendeeName: name,
        attendeeEmail: email,
        startTime: selectedSlot!.start,
        timezone: tz,
      }),
    onSuccess: (booking) => {
      setPhase('done')
      onBooked(booking.id)
    },
  })

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-7 w-7 text-primary" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">Agendamento confirmado!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedSlot && new Date(selectedSlot.start).toLocaleString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
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
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">
              {selectedSlot && new Date(selectedSlot.start).toLocaleString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
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
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
          >
            Voltar
          </button>
          <button
            onClick={() => bookMutation.mutate()}
            disabled={!name.trim() || !email.trim() || bookMutation.isPending}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {bookMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Agendando...
              </span>
            ) : (
              'Confirmar agendamento'
            )}
          </button>
        </div>

        {bookMutation.isError && (
          <p className="text-sm text-destructive">
            Horario indisponivel. Tente outro horario.
          </p>
        )}
      </div>
    )
  }

  if (phase === 'slots' && selectedDate) {
    const daySlots = slotsByDate[selectedDate] ?? []

    return (
      <div className="space-y-3">
        <button
          onClick={() => { setPhase('calendar'); setSelectedDate(null); setSelectedSlot(null) }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </button>

        {daySlots.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum horario disponivel neste dia
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {daySlots.map((slot) => {
              const time = new Date(slot.start).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })
              const isSelected = selectedSlot?.start === slot.start
              return (
                <button
                  key={slot.start}
                  onClick={() => {
                    setSelectedSlot(slot)
                    setPhase('confirm')
                  }}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-foreground hover:border-primary/40'
                  )}
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
        <button onClick={prevMonth} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium capitalize text-foreground">{monthLabel}</span>
        <button onClick={nextMonth} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} className="py-1 text-xs font-medium text-muted-foreground">{d}</div>
        ))}

        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasSlots = (slotsByDate[dateStr]?.length ?? 0) > 0
          const isPast = new Date(dateStr) < new Date(today.toISOString().slice(0, 10))
          const isToday = dateStr === today.toISOString().slice(0, 10)

          return (
            <button
              key={day}
              disabled={!hasSlots || isPast}
              onClick={() => {
                setSelectedDate(dateStr)
                setPhase('slots')
              }}
              className={cn(
                'relative rounded-lg py-2 text-sm transition-all',
                hasSlots && !isPast
                  ? 'cursor-pointer font-medium text-foreground hover:bg-primary/10'
                  : 'cursor-default text-muted-foreground/40',
                isToday && 'ring-1 ring-primary/30',
              )}
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
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}
