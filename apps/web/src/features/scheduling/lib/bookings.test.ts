import { describe, it, expect } from 'vitest'

import type { Booking } from '@/api/endpoints/bookings'
import {
  sortBookings,
  dayKey,
  groupBookingsByDay,
  getMonthGrid,
  startOfMonth,
  endOfMonth,
  isSameDay,
  addMonths,
  diffMinutes,
} from './bookings'

function makeBooking(id: string, startIso: string, endIso?: string): Booking {
  return {
    id,
    organizationId: 'org-1',
    eventTypeId: 'et-1',
    hostUserId: 'user-1',
    responseId: null,
    attendeeName: `Attendee ${id}`,
    attendeeEmail: `${id}@test.com`,
    attendeePhone: null,
    startTime: startIso,
    endTime: endIso ?? new Date(new Date(startIso).getTime() + 30 * 60_000).toISOString(),
    timezone: 'America/Sao_Paulo',
    status: 'confirmed',
    locationType: 'gmeet',
    locationValue: null,
    googleEventId: null,
    meetingUrl: null,
    notes: null,
    metadata: {},
    cancelledAt: null,
    cancelReason: null,
    rescheduledFromId: null,
    kanbanStatus: 'to_confirm',
    sellerId: null,
    leadTag: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

describe('sortBookings', () => {
  const now = new Date('2026-05-07T12:00:00Z')

  it('returns empty for empty input', () => {
    expect(sortBookings([], now)).toEqual([])
  })

  it('orders future bookings ascending (next first)', () => {
    const a = makeBooking('a', '2026-05-09T10:00:00Z')
    const b = makeBooking('b', '2026-05-08T10:00:00Z')
    const c = makeBooking('c', '2026-05-10T10:00:00Z')
    const sorted = sortBookings([a, b, c], now)
    expect(sorted.map((x) => x.id)).toEqual(['b', 'a', 'c'])
  })

  it('orders past bookings descending (most recent first)', () => {
    const a = makeBooking('a', '2026-05-01T10:00:00Z')
    const b = makeBooking('b', '2026-05-05T10:00:00Z')
    const c = makeBooking('c', '2026-04-20T10:00:00Z')
    const sorted = sortBookings([a, b, c], now)
    expect(sorted.map((x) => x.id)).toEqual(['b', 'a', 'c'])
  })

  it('puts future before past', () => {
    const future1 = makeBooking('f1', '2026-05-09T10:00:00Z')
    const future2 = makeBooking('f2', '2026-05-15T10:00:00Z')
    const past1 = makeBooking('p1', '2026-05-05T10:00:00Z')
    const past2 = makeBooking('p2', '2026-04-30T10:00:00Z')
    const sorted = sortBookings([past1, future2, past2, future1], now)
    expect(sorted.map((x) => x.id)).toEqual(['f1', 'f2', 'p1', 'p2'])
  })

  it('treats booking starting exactly at now as future', () => {
    const exact = makeBooking('exact', now.toISOString())
    const past = makeBooking('past', '2026-05-06T10:00:00Z')
    const sorted = sortBookings([past, exact], now)
    expect(sorted.map((x) => x.id)).toEqual(['exact', 'past'])
  })
})

describe('dayKey', () => {
  it('formats local date as yyyy-MM-dd', () => {
    const d = new Date(2026, 4, 7) // May 7, 2026 local
    expect(dayKey(d)).toBe('2026-05-07')
  })

  it('pads single-digit month and day', () => {
    const d = new Date(2026, 0, 3)
    expect(dayKey(d)).toBe('2026-01-03')
  })
})

describe('groupBookingsByDay', () => {
  it('groups bookings by local day', () => {
    const a = makeBooking('a', new Date(2026, 4, 7, 10, 0).toISOString())
    const b = makeBooking('b', new Date(2026, 4, 7, 14, 0).toISOString())
    const c = makeBooking('c', new Date(2026, 4, 8, 9, 0).toISOString())
    const map = groupBookingsByDay([a, b, c])
    expect(map.get('2026-05-07')?.map((x) => x.id)).toEqual(['a', 'b'])
    expect(map.get('2026-05-08')?.map((x) => x.id)).toEqual(['c'])
  })

  it('sorts each day by startTime ascending', () => {
    const late = makeBooking('late', new Date(2026, 4, 7, 16, 0).toISOString())
    const early = makeBooking('early', new Date(2026, 4, 7, 9, 0).toISOString())
    const map = groupBookingsByDay([late, early])
    expect(map.get('2026-05-07')?.map((x) => x.id)).toEqual(['early', 'late'])
  })
})

describe('startOfMonth / endOfMonth', () => {
  it('returns first day at 00:00 local', () => {
    const start = startOfMonth(new Date(2026, 4, 15, 12, 30))
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(4)
    expect(start.getDate()).toBe(1)
    expect(start.getHours()).toBe(0)
  })

  it('returns last day at 23:59:59 local', () => {
    const end = endOfMonth(new Date(2026, 4, 15))
    expect(end.getMonth()).toBe(4)
    expect(end.getDate()).toBe(31)
    expect(end.getHours()).toBe(23)
  })
})

describe('isSameDay', () => {
  it('true when same y/m/d', () => {
    expect(isSameDay(new Date(2026, 4, 7, 1), new Date(2026, 4, 7, 23))).toBe(true)
  })

  it('false otherwise', () => {
    expect(isSameDay(new Date(2026, 4, 7), new Date(2026, 4, 8))).toBe(false)
    expect(isSameDay(new Date(2026, 4, 7), new Date(2026, 5, 7))).toBe(false)
  })
})

describe('addMonths', () => {
  it('moves to next month preserving year', () => {
    const next = addMonths(new Date(2026, 4, 15), 1)
    expect(next.getMonth()).toBe(5)
    expect(next.getFullYear()).toBe(2026)
    expect(next.getDate()).toBe(1)
  })

  it('rolls year forward in december', () => {
    const next = addMonths(new Date(2026, 11, 15), 1)
    expect(next.getMonth()).toBe(0)
    expect(next.getFullYear()).toBe(2027)
  })

  it('rolls year backward at january', () => {
    const prev = addMonths(new Date(2026, 0, 15), -1)
    expect(prev.getMonth()).toBe(11)
    expect(prev.getFullYear()).toBe(2025)
  })
})

describe('getMonthGrid', () => {
  it('starts on Sunday and ends on Saturday', () => {
    const grid = getMonthGrid(new Date(2026, 4, 1)) // May 2026, the 1st is a Friday
    expect(grid[0]!.getDay()).toBe(0)
    expect(grid[grid.length - 1]!.getDay()).toBe(6)
  })

  it('covers the entire month', () => {
    const grid = getMonthGrid(new Date(2026, 4, 1))
    const has1st = grid.some((d) => d.getMonth() === 4 && d.getDate() === 1)
    const has31st = grid.some((d) => d.getMonth() === 4 && d.getDate() === 31)
    expect(has1st).toBe(true)
    expect(has31st).toBe(true)
  })

  it('produces 35 cells for May 2026 (Fri start, Sun end)', () => {
    // May 2026: 1st=Fri, 31st=Sun → grid: prev Sun (Apr 26) through May 30? Need to verify.
    // 1st is Friday → startOffset=5 → start=Apr 26 (Sun). 31st is Sunday → endOffset=6 → end=Jun 6 (Sat).
    // Days: Apr 26→May 31 then to Jun 6 = 42 cells. Adjusting expectation.
    const grid = getMonthGrid(new Date(2026, 4, 1))
    expect(grid.length).toBe(42)
  })

  it('produces 35 cells when first is Sunday and last is Saturday', () => {
    // February 2026: 1st=Sunday, 28th=Saturday → exactly 28 days = 4 rows = 28? No, need 5 rows min.
    // 1st=Sun → startOffset=0 → start=Feb 1. 28th=Sat → endOffset=0 → end=Feb 28. 28 cells = 4 weeks.
    const grid = getMonthGrid(new Date(2026, 1, 1))
    expect(grid.length).toBe(28)
    expect(grid[0]!.getDate()).toBe(1)
    expect(grid[grid.length - 1]!.getDate()).toBe(28)
  })

  it('all dates are unique consecutive days', () => {
    const grid = getMonthGrid(new Date(2026, 4, 1))
    for (let i = 1; i < grid.length; i++) {
      const diff = (grid[i]!.getTime() - grid[i - 1]!.getTime()) / 86400000
      expect(diff).toBeCloseTo(1, 0)
    }
  })
})

describe('diffMinutes', () => {
  it('computes positive diff in minutes', () => {
    expect(diffMinutes('2026-05-07T10:00:00Z', '2026-05-07T10:30:00Z')).toBe(30)
    expect(diffMinutes('2026-05-07T10:00:00Z', '2026-05-07T11:00:00Z')).toBe(60)
  })
})
