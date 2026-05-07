import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import type { FlowDefinition, FlowNode } from '@typecall/flow-engine'
import { Button } from '@/components/ui/button'

interface BuilderPreviewProps {
  flow: FlowDefinition
}

export function BuilderPreview({ flow }: BuilderPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    setCurrentIndex(0)
  }, [flow.nodes.length])

  if (flow.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">Adicione blocos para ver o preview</p>
      </div>
    )
  }

  const currentNode = flow.nodes[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex >= flow.nodes.length - 1

  if (!currentNode) {
    return null
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Preview</span>
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} / {flow.nodes.length}
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full rounded-full bg-muted">
          <div
            className="h-1 rounded-full bg-primary transition-all"
            style={{ width: `${((currentIndex + 1) / flow.nodes.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <PreviewStep node={currentNode} />
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={isFirst}
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => setCurrentIndex((i) => Math.min(flow.nodes.length - 1, i + 1))}
          disabled={isLast}
        >
          {currentNode.type === 'ending' ? 'Enviar' : 'Continuar'}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function PreviewStep({ node }: { node: FlowNode }) {
  const { data, type } = node

  return (
    <div className="w-full max-w-sm space-y-4 text-center">
      <h3 className="text-lg font-semibold text-foreground">{data.props.label}</h3>

      {'description' in data.props && data.props.description && (
        <p className="text-sm text-muted-foreground">{data.props.description as string}</p>
      )}

      {type === 'short_text' && (
        <input
          type="text"
          disabled
          placeholder={(data.props as { placeholder?: string }).placeholder ?? 'Digite aqui...'}
          className="w-full rounded-lg border border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50"
        />
      )}

      {type === 'email' && (
        <input
          type="email"
          disabled
          placeholder={(data.props as { placeholder?: string }).placeholder ?? 'email@exemplo.com'}
          className="w-full rounded-lg border border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50"
        />
      )}

      {type === 'multiple_choice' && (
        <div className="space-y-2">
          {((data.props as { choices: { id: string; label: string }[] }).choices ?? []).map(
            (choice) => (
              <div
                key={choice.id}
                className="rounded-lg border border-border px-4 py-2.5 text-left text-sm text-foreground hover:border-primary/50 transition-colors"
              >
                {choice.label}
              </div>
            )
          )}
        </div>
      )}

      {type === 'ending' && (
        <div className="flex items-center justify-center pt-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
