import { Type, Mail, List, AlignLeft, CheckSquare, GripVertical } from 'lucide-react'
import type { StepType } from '@typecall/flow-engine'
import { cn } from '@/lib/cn'

interface BlockDef {
  type: StepType
  label: string
  icon: React.ReactNode
}

const blockGroups: { category: string; blocks: BlockDef[] }[] = [
  {
    category: 'Texto',
    blocks: [
      { type: 'short_text', label: 'Texto curto', icon: <Type className="h-4 w-4" /> },
    ],
  },
  {
    category: 'Contato',
    blocks: [
      { type: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
    ],
  },
  {
    category: 'Escolha',
    blocks: [
      { type: 'multiple_choice', label: 'Multipla escolha', icon: <List className="h-4 w-4" /> },
    ],
  },
  {
    category: 'Estrutura',
    blocks: [
      { type: 'statement', label: 'Informativo', icon: <AlignLeft className="h-4 w-4" /> },
      { type: 'ending', label: 'Encerramento', icon: <CheckSquare className="h-4 w-4" /> },
    ],
  },
]

interface BlockPaletteProps {
  onAddBlock: (type: StepType) => void
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Blocos</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Arraste ou clique para adicionar</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {blockGroups.map((group) => (
          <div key={group.category} className="mb-4">
            <h3 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group.category}
            </h3>
            <div className="space-y-1">
              {group.blocks.map((block) => (
                <button
                  key={block.type}
                  onClick={() => onAddBlock(block.type)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm',
                    'text-foreground/80 transition-colors',
                    'hover:bg-accent hover:text-foreground',
                    'active:bg-accent/80',
                    'group cursor-grab active:cursor-grabbing'
                  )}
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-primary/70">{block.icon}</span>
                  <span>{block.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
