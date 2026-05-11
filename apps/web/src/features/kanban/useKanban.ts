import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as bookingsApi from '@/api/endpoints/bookings'
import type { Booking, KanbanBoard, KanbanStatus } from '@/api/endpoints/bookings'

const POLL_MS = 60_000

export function useKanban(sellerId?: string) {
  const queryClient = useQueryClient()
  const queryKey = ['kanban', sellerId ?? 'all']

  const query = useQuery({
    queryKey,
    queryFn: () => bookingsApi.getKanbanBoard(sellerId),
    refetchInterval: POLL_MS,
  })

  const moveMutation = useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: KanbanStatus }) =>
      bookingsApi.updateKanbanStatus(bookingId, status),
    onMutate: async ({ bookingId, status }) => {
      await queryClient.cancelQueries({ queryKey })
      const prev = queryClient.getQueryData<KanbanBoard>(queryKey)
      if (!prev) return { prev }

      const next: KanbanBoard = {
        toConfirm:    [...prev.toConfirm],
        preConfirmed: [...prev.preConfirmed],
        confirmed:    [...prev.confirmed],
        rescheduled:  [...prev.rescheduled],
        noShow:       [...prev.noShow],
        completed:    [...prev.completed],
      }

      let moved: Booking | undefined
      for (const col of ['toConfirm', 'preConfirmed', 'confirmed', 'rescheduled', 'noShow', 'completed'] as (keyof KanbanBoard)[]) {
        const idx = (next[col] as Booking[]).findIndex((b) => b.id === bookingId)
        if (idx >= 0) {
          moved = (next[col] as Booking[]).splice(idx, 1)[0]
          break
        }
      }
      if (moved) {
        moved.kanbanStatus = status
        const colKey = statusToColumn(status)
        ;(next[colKey] as Booking[]).unshift(moved)
        queryClient.setQueryData(queryKey, next)
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: ({ bookingId, newDatetime }: { bookingId: string; newDatetime: string }) =>
      bookingsApi.rescheduleBooking(bookingId, newDatetime),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return {
    board: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    moveCard: moveMutation.mutate,
    isMoving: moveMutation.isPending,
    reschedule: rescheduleMutation.mutate,
    isRescheduling: rescheduleMutation.isPending,
  }
}

function statusToColumn(s: KanbanStatus): keyof KanbanBoard {
  switch (s) {
    case 'to_confirm':    return 'toConfirm'
    case 'pre_confirmed': return 'preConfirmed'
    case 'confirmed':     return 'confirmed'
    case 'rescheduled':   return 'rescheduled'
    case 'no_show':       return 'noShow'
    case 'completed':     return 'completed'
  }
}

// Transicoes legais (espelha backend domain.AllowedKanbanTransitions)
const ALLOWED: Record<KanbanStatus, KanbanStatus[]> = {
  to_confirm:    ['pre_confirmed', 'rescheduled', 'no_show'],
  pre_confirmed: ['confirmed', 'rescheduled', 'no_show'],
  confirmed:     ['completed', 'rescheduled', 'no_show'],
  rescheduled:   ['to_confirm', 'pre_confirmed', 'confirmed', 'no_show'],
  no_show:       ['rescheduled'],
  completed:     [],
}

export function isAllowedTransition(from: KanbanStatus, to: KanbanStatus): boolean {
  if (from === to) return true
  return ALLOWED[from]?.includes(to) ?? false
}
