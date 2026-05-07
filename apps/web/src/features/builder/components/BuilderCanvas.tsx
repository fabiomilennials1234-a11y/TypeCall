import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Type, Mail, List, AlignLeft, CheckSquare } from 'lucide-react'
import type { FlowNode, StepType } from '@typecall/flow-engine'
import { cn } from '@/lib/cn'

const stepIcons: Partial<Record<StepType, React.ReactNode>> = {
  short_text: <Type className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  multiple_choice: <List className="h-4 w-4" />,
  statement: <AlignLeft className="h-4 w-4" />,
  ending: <CheckSquare className="h-4 w-4" />,
}

const stepLabels: Partial<Record<StepType, string>> = {
  welcome: 'Boas-vindas',
  short_text: 'Texto curto',
  long_text: 'Texto longo',
  email: 'Email',
  phone: 'Telefone',
  number: 'Numero',
  multiple_choice: 'Multipla escolha',
  checkboxes: 'Checkboxes',
  dropdown: 'Dropdown',
  rating: 'Avaliacao',
  nps: 'NPS',
  date: 'Data',
  statement: 'Informativo',
  ending: 'Encerramento',
}

interface SortableNodeProps {
  node: FlowNode
  index: number
  isSelected: boolean
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

function SortableNode({ node, index, isSelected, onSelect, onRemove }: SortableNodeProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(node.id)}
      className={cn(
        'group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-all',
        isSelected ? 'border-primary ring-1 ring-primary/20' : 'border-border hover:border-primary/30',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-medium text-primary">
        {index + 1}
      </span>

      <span className="text-primary/60">{stepIcons[node.type] ?? <Type className="h-4 w-4" />}</span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {node.data.props.label || 'Sem titulo'}
        </p>
        <p className="text-xs text-muted-foreground">
          {stepLabels[node.type] ?? node.type}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(node.id)
        }}
        className="rounded-md p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface BuilderCanvasProps {
  nodes: FlowNode[]
  selectedNodeId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

export function BuilderCanvas({ nodes, selectedNodeId, onSelect, onRemove, onReorder }: BuilderCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromIndex = nodes.findIndex((n) => n.id === active.id)
    const toIndex = nodes.findIndex((n) => n.id === over.id)

    if (fromIndex !== -1 && toIndex !== -1) {
      onReorder(fromIndex, toIndex)
    }
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-border">
            <Type className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Nenhum bloco adicionado</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Clique nos blocos ao lado para construir seu formulario
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-xl space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            {nodes.map((node, index) => (
              <SortableNode
                key={node.id}
                node={node}
                index={index}
                isSelected={node.id === selectedNodeId}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
