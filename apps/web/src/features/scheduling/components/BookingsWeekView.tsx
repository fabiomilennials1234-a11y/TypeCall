import { useMemo } from 'react'
import { motion } from 'motion/react'
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

import type { Booking } from '@/api/endpoints/bookings'
import { cn } from '@/lib/cn'
import { getStatusConfig } from '../lib/bookings'
import {
  addWeeks,
  bookingDayIndex,
  bookingDurationMinutes,
  bookingStartHour,
  formatWeekRange,
  getWeekDays,
  startOfWeek,
} from '../lib/week'

const HOURS: number[] = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const FIRST_HOUR = 8
const LAST_HOUR = 19
const ROW_HEIGHT = 56
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

interface Props {
  bookings: Booking[] | undefined
  isLoading: boolean
  isError: boolean
  currentWeek: Date
  onChangeWeek: (next: Date) => void
  onSelectBooking: (b: Booking) => void
}

export function BookingsWeekView({
  bookings,
  isLoading,
  isError,
  currentWeek,
  onChangeWeek,
  onSelectBooking,
}: Props) {
  const today = useMemo(() => new Date(), [])
  const weekStart = useMemo(() => startOfWeek(currentWeek), [currentWeek])
  const days = useMemo(() => getWeekDays(weekStart), [weekStart])

  const positioned = useMemo(() => {
    if (!bookings) return []
    return bookings
      .map((b) => {
        const di = bookingDayIndex(b, weekStart)
        if (di < 0 || di > 6) return null
        const startHour = bookingStartHour(b)
        const durMin = bookingDurationMinutes(b)
        if (startHour >= LAST_HOUR) return null
        if (startHour + durMin / 60 <= FIRST_HOUR) return null
        const clippedStart = Math.max(startHour, FIRST_HOUR)
        const clippedEnd = Math.min(startHour + durMin / 60, LAST_HOUR)
        const top = (clippedStart - FIRST_HOUR) * ROW_HEIGHT
        const height = Math.max(ROW_HEIGHT * 0.45, (clippedEnd - clippedStart) * ROW_HEIGHT - 2)
        return { booking: b, dayIndex: di, top, height }
      })
      .filter((x): x is { booking: Booking; dayIndex: number; top: number; height: number } => x !== null)
  }, [bookings, weekStart])

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          onClick={() => onChangeWeek(addWeeks(weekStart, -1))}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-foreground">{formatWeekRange(weekStart)}</h2>
          <button
            onClick={() => onChangeWeek(new Date())}
            className="rounded-md border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Hoje
          </button>
        </div>
        <button
          onClick={() => onChangeWeek(addWeeks(weekStart, 1))}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Proxima semana"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </header>

      <div
        className="grid border-b border-border bg-muted/30"
        style={{ gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))' }}
      >
        <div />
        {days.map((d, i) => {
          const isToday = isSameDay(d, today)
          return (
            <div
              key={i}
              className="flex items-center justify-between gap-2 border-l border-border px-3 py-2 text-center"
            >
              <span className="text-xs font-medium text-muted-foreground">{WEEKDAYS[i]}</span>
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  isToday ? 'bg-primary font-semibold text-primary-foreground' : 'text-foreground',
                )}
              >
                {d.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h3 className="mt-4 text-sm font-medium">Erro ao carregar reunioes</h3>
        </div>
      ) : (
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/50 backdrop-blur-sm">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
          <div
            className="grid"
            style={{ gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))' }}
          >
            <div>
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-end border-b border-border pr-2 pt-1.5"
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {days.map((d, di) => {
              const isToday = isSameDay(d, today)
              return (
                <div
                  key={di}
                  className={cn(
                    'relative border-l border-border',
                    isToday && 'bg-primary/[0.03]',
                  )}
                  style={{ height: HOURS.length * ROW_HEIGHT }}
                >
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-b border-border"
                      style={{
                        top: (h - FIRST_HOUR) * ROW_HEIGHT,
                        height: ROW_HEIGHT,
                      }}
                    />
                  ))}
                  {positioned
                    .filter((p) => p.dayIndex === di)
                    .map((p) => (
                      <Chip
                        key={p.booking.id}
                        booking={p.booking}
                        top={p.top}
                        height={p.height}
                        onClick={() => onSelectBooking(p.booking)}
                      />
                    ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({
  booking,
  top,
  height,
  onClick,
}: {
  booking: Booking
  top: number
  height: number
  onClick: () => void
}) {
  const config = getStatusConfig(booking.status)
  const singleLine = height < ROW_HEIGHT * 0.7

  if (singleLine) {
    return (
      <motion.button
        onClick={onClick}
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -1, transition: { duration: 0.12 } }}
        title={`${booking.attendeeName} · ${fmtTime(booking.startTime)}`}
        className={cn(
          'absolute inset-x-1 flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-xs transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary/40',
          config.className,
        )}
        style={{ top, height }}
      >
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', config.dotClassName)} />
        <span className="truncate">
          {fmtTime(booking.startTime)} {booking.attendeeName}
        </span>
      </motion.button>
    )
  }

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1, transition: { duration: 0.12 } }}
      title={`${booking.attendeeName} · ${fmtTime(booking.startTime)}`}
      className={cn(
        'absolute inset-x-1 flex flex-col overflow-hidden rounded px-1.5 py-1 text-left transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40',
        config.className,
      )}
      style={{ top, height }}
    >
      <span className="flex items-center gap-1 truncate text-xs">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', config.dotClassName)} />
        <span className="truncate">{fmtTime(booking.startTime)}</span>
      </span>
      <span className="mt-0.5 truncate text-xs font-medium">{booking.attendeeName}</span>
      {height >= ROW_HEIGHT * 1.5 && (
        <span className="mt-0.5 truncate text-[10.5px] opacity-70">{booking.attendeeEmail}</span>
      )}
    </motion.button>
  )
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
