import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import type { Booking } from '@/api/endpoints/bookings'
import * as bookingsApi from '@/api/endpoints/bookings'
import { cn } from '@/lib/cn'

import { BookingDetailDialog } from './components/BookingDetailDialog'
import { BookingsCalendarView } from './components/BookingsCalendarView'
import { BookingsListView } from './components/BookingsListView'
import { dayKey, endOfMonth, startOfMonth } from './lib/bookings'

type View = 'list' | 'calendar'

export function BookingsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('list')
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()))
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
    queryFn: () => bookingsApi.listBookings({ limit: 200, from: calendarRange.from, to: calendarRange.to }),
    enabled: view === 'calendar',
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['bookings', 'calendar'] })
      setSelectedBooking(null)
    },
  })

  const activeData = view === 'list' ? listQuery.data : calendarQuery.data
  const totalLabel = activeData
    ? `${activeData.bookings.length} reuniao${activeData.bookings.length !== 1 ? 'es' : ''}`
    : 'Carregando...'

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reunioes</h1>
          <p className="mt-1 text-sm text-muted-foreground">{totalLabel}</p>
        </div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {view === 'list' ? (
        <BookingsListView
          bookings={listQuery.data?.bookings}
          isLoading={listQuery.isLoading}
          isError={listQuery.isError}
          isCancelling={cancelMutation.isPending}
          onCancel={(id) => cancelMutation.mutate(id)}
          onSelect={setSelectedBooking}
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
    { key: 'calendar', label: 'Agenda' },
  ]
  return (
    <div className="flex rounded-lg border border-border">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-colors',
            value === opt.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
