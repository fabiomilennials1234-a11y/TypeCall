import type { Booking } from '@/api/endpoints/bookings'

const DAY_MS = 24 * 60 * 60 * 1000

export function startOfWeek(d: Date): Date {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = start.getDay()
  // Sunday-first to match Calendar grid in this app
  start.setDate(start.getDate() - dow)
  start.setHours(0, 0, 0, 0)
  return start
}

export function endOfWeek(d: Date): Date {
  const start = startOfWeek(d)
  const end = new Date(start.getTime() + 7 * DAY_MS - 1)
  end.setHours(23, 59, 59, 999)
  return end
}

export function addWeeks(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 7 * DAY_MS)
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor)
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }
  return days
}

export function formatWeekRange(anchor: Date, locale = 'pt-BR'): string {
  const start = startOfWeek(anchor)
  const end = new Date(start.getTime() + 6 * DAY_MS)
  const startStr = start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const endStr = end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startStr} – ${endStr}`
}

export function bookingDayIndex(b: Booking, weekStart: Date): number {
  const d = new Date(b.startTime)
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const start = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
  return Math.round((day.getTime() - start.getTime()) / DAY_MS)
}

export function bookingDurationMinutes(b: Booking): number {
  return Math.max(15, Math.round((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000))
}

export function bookingStartHour(b: Booking): number {
  const d = new Date(b.startTime)
  return d.getHours() + d.getMinutes() / 60
}
