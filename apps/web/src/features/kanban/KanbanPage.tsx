import { useMemo } from 'react'
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { Loader2, AlertCircle } from 'lucide-react'

import type { Booking, KanbanStatus } from '@/api/endpoints/bookings'
import { useAuth } from '@/contexts/auth'
import { cn } from '@/lib/cn'
import { useKanban, isAllowedTransition } from './useKanban'
import { KanbanCard } from './KanbanCard'

interface ColumnDef {
  status: KanbanStatus
  label: string
  filterToToday?: boolean
  accent: string
}

const COLUMNS: ColumnDef[] = [
  { status: 'to_confirm',    label: 'A confirmar',     accent: 'border-amber-500/40' },
  { status: 'pre_confirmed', label: 'Pre-confirmadas', accent: 'border-blue-500/40' },
  { status: 'confirmed',     label: 'Confirmadas',     accent: 'border-emerald-500/40', filterToToday: true },
]

export function KanbanPage() {
  const auth = useAuth()
  const sellerOnly = auth.user.role === 'seller' ? auth.user.id : undefined
  const { board, isLoading, isError, moveCard, reschedule, isRescheduling } = useKanban(sellerOnly)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const bookingId = String(active.id)
    const targetStatus = over.id as KanbanStatus
    const all = collectAll(board)
    const card = all.find((b) => b.id === bookingId)
    if (!card) return
    if (!isAllowedTransition(card.kanbanStatus, targetStatus)) return
    moveCard({ bookingId, status: targetStatus })
  }

  const columnsData = useMemo(() => {
    if (!board) return [] as { def: ColumnDef; bookings: Booking[] }[]
    const today = new Date()
    return COLUMNS.map((def) => {
      let list: Booking[] = []
      switch (def.status) {
        case 'to_confirm': list = board.toConfirm; break
        case 'pre_confirmed': list = board.preConfirmed; break
        case 'confirmed': list = board.confirmed; break
        default: list = []
      }
      if (def.filterToToday) {
        list = list.filter((b) => isSameDay(new Date(b.startTime), today))
      }
      list = [...list].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      return { def, bookings: list }
    })
  }, [board])

  return (
    <div className="flex h-full flex-col p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Kanban de confirmacao</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Arraste os cards entre colunas para atualizar status. Confirmadas filtram apenas hoje.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="mt-3 text-sm">Erro ao carregar kanban.</p>
        </div>
      )}

      {board && (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid flex-1 gap-4 lg:grid-cols-3">
            {columnsData.map(({ def, bookings }) => (
              <KanbanColumn
                key={def.status}
                def={def}
                bookings={bookings}
                onReschedule={(id, dt) => reschedule({ bookingId: id, newDatetime: dt })}
                isRescheduling={isRescheduling}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  )
}

function KanbanColumn({
  def,
  bookings,
  onReschedule,
  isRescheduling,
}: {
  def: ColumnDef
  bookings: Booking[]
  onReschedule: (id: string, dt: string) => void
  isRescheduling: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: def.status })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl border bg-muted/20 transition-colors',
        def.accent,
        isOver && 'bg-primary/5 ring-2 ring-primary/40',
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">{def.label}</h2>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {bookings.length}
        </span>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {bookings.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            Nenhuma reuniao
          </div>
        ) : (
          bookings.map((b) => (
            <KanbanCard
              key={b.id}
              booking={b}
              onReschedule={onReschedule}
              isRescheduling={isRescheduling}
            />
          ))
        )}
      </div>
    </div>
  )
}

function collectAll(board: ReturnType<typeof useKanban>['board']): Booking[] {
  if (!board) return []
  return [
    ...board.toConfirm,
    ...board.preConfirmed,
    ...board.confirmed,
    ...board.rescheduled,
    ...board.noShow,
    ...board.completed,
  ]
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
