import { useMemo } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

import type { Booking } from '@/api/endpoints/bookings'
import { cn } from '@/lib/cn'

import {
  addMonths,
  dayKey,
  formatMonthLabel,
  getMonthGrid,
  getStatusConfig,
  groupBookingsByDay,
  isSameDay,
} from '../lib/bookings'

interface BookingsCalendarViewProps {
  bookings: Booking[] | undefined
  isLoading: boolean
  isError: boolean
  currentMonth: Date
  onChangeMonth: (next: Date) => void
  onSelectBooking: (booking: Booking) => void
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const MAX_CHIPS = 3

export function BookingsCalendarView({
  bookings,
  isLoading,
  isError,
  currentMonth,
  onChangeMonth,
  onSelectBooking,
}: BookingsCalendarViewProps) {
  const today = useMemo(() => new Date(), [])
  const days = useMemo(() => getMonthGrid(currentMonth), [currentMonth])
  const grouped = useMemo(() => groupBookingsByDay(bookings ?? []), [bookings])

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          onClick={() => onChangeMonth(addMonths(currentMonth, -1))}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-medium text-foreground">{formatMonthLabel(currentMonth)}</h2>
        <button
          onClick={() => onChangeMonth(addMonths(currentMonth, 1))}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Proximo mes"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h3 className="mt-4 text-sm font-medium">Erro ao carregar reunioes</h3>
        </div>
      ) : (
        <div className="relative grid grid-cols-7">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/50 backdrop-blur-sm">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
          {days.map((day) => {
            const inMonth = day.getMonth() === currentMonth.getMonth()
            const isToday = isSameDay(day, today)
            const dayBookings = grouped.get(dayKey(day)) ?? []
            const visible = dayBookings.slice(0, MAX_CHIPS)
            const overflow = dayBookings.length - visible.length

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'min-h-[110px] border-b border-r border-border p-1.5',
                  !inMonth && 'bg-muted/20',
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                      !inMonth && 'text-muted-foreground/50',
                      inMonth && !isToday && 'text-foreground',
                      isToday && 'bg-primary font-semibold text-primary-foreground',
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {visible.map((b) => {
                    const config = getStatusConfig(b.status)
                    const start = new Date(b.startTime)
                    return (
                      <button
                        key={b.id}
                        onClick={() => onSelectBooking(b)}
                        className={cn(
                          'flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-xs transition-opacity hover:opacity-80',
                          config.className,
                        )}
                        title={`${b.attendeeName} · ${start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                      >
                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', config.dotClassName)} />
                        <span className="truncate">
                          {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {b.attendeeName}
                        </span>
                      </button>
                    )
                  })}
                  {overflow > 0 && (
                    <div className="px-1.5 text-[11px] text-muted-foreground">+{overflow}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
