import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import type { Booking } from '@/api/endpoints/bookings'
import * as bookingsApi from '@/api/endpoints/bookings'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/layout/PageHeader'

import { BookingDetailDialog } from './components/BookingDetailDialog'
import { BookingsCalendarView } from './components/BookingsCalendarView'
import { BookingsListView } from './components/BookingsListView'
import { BookingsWeekView } from './components/BookingsWeekView'
import { dayKey, endOfMonth, startOfMonth } from './lib/bookings'
import { endOfWeek, startOfWeek } from './lib/week'

type View = 'list' | 'week' | 'calendar'

export function BookingsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('week')
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [currentWeek, setCurrentWeek] = useState<Date>(() => startOfWeek(new Date()))
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const listQuery = useQuery({
    queryKey: ['bookings', 'list'],
    queryFn: () => bookingsApi.listBookings({ limit: 100 }),
    enabled: view === 'list',
  })

  const calendarRange = useMemo(() => {
    const from = startOfMonth(currentMonth).toISOString()
    const to = endOfMonth(currentMonth).toISOString()
    return { from, to }
  }, [currentMonth])

  const calendarQuery = useQuery({
    queryKey: ['bookings', 'calendar', dayKey(startOfMonth(currentMonth))],
    queryFn: () =>
      bookingsApi.listBookings({ limit: 200, from: calendarRange.from, to: calendarRange.to }),
    enabled: view === 'calendar',
  })

  const weekRange = useMemo(() => {
    const start = startOfWeek(currentWeek)
    return {
      from: start.toISOString(),
      to: endOfWeek(currentWeek).toISOString(),
      key: dayKey(start),
    }
  }, [currentWeek])

  const weekQuery = useQuery({
    queryKey: ['bookings', 'week', weekRange.key],
    queryFn: () =>
      bookingsApi.listBookings({ limit: 200, from: weekRange.from, to: weekRange.to }),
    enabled: view === 'week',
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['bookings', 'calendar'] })
      queryClient.invalidateQueries({ queryKey: ['bookings', 'week'] })
      setSelectedBooking(null)
    },
  })

  const activeData =
    view === 'list' ? listQuery.data : view === 'calendar' ? calendarQuery.data : weekQuery.data
  const totalLabel = activeData
    ? `${activeData.bookings.length} reuniao${activeData.bookings.length !== 1 ? 'es' : ''}`
    : 'Carregando...'

  return (
    <div>
      <PageHeader
        title="Reunioes"
        eyebrow={totalLabel}
        subtitle="Visualize, confirme e remarque cada reuniao do funil."
        right={<ViewToggle value={view} onChange={setView} />}
      />

      <div className="px-6 py-6 lg:px-10 lg:py-8">
        {view === 'list' ? (
          <BookingsListView
            bookings={listQuery.data?.bookings}
            isLoading={listQuery.isLoading}
            isError={listQuery.isError}
            isCancelling={cancelMutation.isPending}
            onCancel={(id) => cancelMutation.mutate(id)}
            onSelect={setSelectedBooking}
          />
        ) : view === 'week' ? (
          <BookingsWeekView
            bookings={weekQuery.data?.bookings}
            isLoading={weekQuery.isLoading}
            isError={weekQuery.isError}
            currentWeek={currentWeek}
            onChangeWeek={setCurrentWeek}
            onSelectBooking={setSelectedBooking}
          />
        ) : (
          <BookingsCalendarView
            bookings={calendarQuery.data?.bookings}
            isLoading={calendarQuery.isLoading}
            isError={calendarQuery.isError}
            currentMonth={currentMonth}
            onChangeMonth={setCurrentMonth}
            onSelectBooking={setSelectedBooking}
          />
        )}
      </div>

      <BookingDetailDialog
        booking={selectedBooking}
        isCancelling={cancelMutation.isPending}
        onClose={() => setSelectedBooking(null)}
        onCancel={(id) => cancelMutation.mutate(id)}
      />
    </div>
  )
}

function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const options: Array<{ key: View; label: string }> = [
    { key: 'list', label: 'Lista' },
    { key: 'week', label: 'Semana' },
    { key: 'calendar', label: 'Mes' },
  ]
  return (
    <div className="flex overflow-hidden rounded-sm border border-line">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={cn(
            'px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors',
            value === opt.key ? 'bg-ink text-paper' : 'text-ink-mid hover:bg-paper-2 hover:text-ink',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
