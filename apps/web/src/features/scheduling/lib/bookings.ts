import type { Booking } from '@/api/endpoints/bookings'

export const statusConfig = {
  pending: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-500', dotClassName: 'bg-amber-500' },
  confirmed: { label: 'Confirmado', className: 'bg-primary/10 text-primary', dotClassName: 'bg-primary' },
  completed: { label: 'Concluido', className: 'bg-emerald-500/10 text-emerald-500', dotClassName: 'bg-emerald-500' },
  cancelled: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive', dotClassName: 'bg-destructive' },
  rescheduled: { label: 'Reagendado', className: 'bg-orange-500/10 text-orange-500', dotClassName: 'bg-orange-500' },
  no_show: { label: 'No-show', className: 'bg-muted text-muted-foreground', dotClassName: 'bg-muted-foreground' },
} as const

export type StatusKey = keyof typeof statusConfig

export function getStatusConfig(status: string) {
  return statusConfig[status as StatusKey] ?? statusConfig.confirmed
}

export function sortBookings(bookings: Booking[], now: Date = new Date()): Booking[] {
  const nowMs = now.getTime()
  const future: Booking[] = []
  const past: Booking[] = []
  for (const b of bookings) {
    if (new Date(b.startTime).getTime() >= nowMs) future.push(b)
    else past.push(b)
  }
  future.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  past.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  return [...future, ...past]
}

export function dayKey(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function groupBookingsByDay(bookings: Booking[]): Map<string, Booking[]> {
  const map = new Map<string, Booking[]>()
  for (const b of bookings) {
    const key = dayKey(new Date(b.startTime))
    const arr = map.get(key)
    if (arr) arr.push(b)
    else map.set(key, [b])
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }
  return map
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

// Returns 35 or 42 dates covering the calendar grid (Sunday-first weeks)
// from the Sunday on/before the 1st through the Saturday on/after the last day.
export function getMonthGrid(monthAnchor: Date): Date[] {
  const first = startOfMonth(monthAnchor)
  const last = endOfMonth(monthAnchor)
  const startOffset = first.getDay() // 0 (Sun) .. 6 (Sat)
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - startOffset)
  const endOffset = 6 - last.getDay()
  const end = new Date(last.getFullYear(), last.getMonth(), last.getDate() + endOffset)
  const days: Date[] = []
  for (let cur = start; cur.getTime() <= end.getTime(); cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1)) {
    days.push(new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()))
  }
  return days
}

export function formatMonthLabel(d: Date, locale = 'pt-BR'): string {
  const label = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function diffMinutes(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
}
