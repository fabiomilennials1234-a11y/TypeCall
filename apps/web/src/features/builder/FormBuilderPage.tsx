import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Globe, Eye, EyeOff, Save, AlertCircle } from 'lucide-react'
import type { FlowDefinition } from '@typecall/flow-engine'

import { Button } from '@/components/ui/button'
import { useFormQuery, usePublishFormMutation } from '@/hooks/useForms'
import { FormStatusBadge } from '@/features/forms/components/FormStatusBadge'
import { useBuilder } from '@/features/builder/useBuilder'
import { useAutoSave } from '@/features/builder/useAutoSave'
import { BlockPalette } from '@/features/builder/components/BlockPalette'
import { BuilderCanvas } from '@/features/builder/components/BuilderCanvas'
import { PropertyPanel } from '@/features/builder/components/PropertyPanel'
import { BuilderPreview } from '@/features/builder/components/BuilderPreview'

export function FormBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: form, isLoading, isError } = useFormQuery(id!)
  const publishMutation = usePublishFormMutation(id!)
  const [showPreview, setShowPreview] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const {
    flow,
    nodes,
    selectedNodeId,
    selectedNode,
    isDirty,
    setFlow,
    addNode,
    removeNode,
    updateNode,
    reorderNodes,
    selectNode,
    markClean,
  } = useBuilder()

  useEffect(() => {
    if (form?.draftDefinition) {
      const draft = form.draftDefinition as unknown as FlowDefinition
      if (draft.nodes && draft.edges) {
        setFlow(draft)
      }
    }
  }, [form, setFlow])

  useAutoSave(id!, flow, isDirty, () => {
    markClean()
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  })

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !form) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="mt-4 text-lg font-medium">Formulário não encontrado</h2>
        <p className="mt-1 text-sm text-muted-foreground">Este formulário não existe ou foi removido.</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/forms/${id}`)}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground">{form.title}</h1>
            <FormStatusBadge status={form.status} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SaveIndicator status={saveStatus} isDirty={isDirty} />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? 'Fechar preview' : 'Preview'}
          </Button>

          <Button
            size="sm"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending || nodes.length === 0}
          >
            <Globe className="h-4 w-4" />
            {publishMutation.isPending ? 'Publicando...' : 'Publicar'}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <BlockPalette onAddBlock={addNode} />

        <BuilderCanvas
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onSelect={selectNode}
          onRemove={removeNode}
          onReorder={reorderNodes}
        />

        {showPreview ? (
          <div className="w-80 border-l border-border">
            <BuilderPreview flow={flow} />
          </div>
        ) : (
          <PropertyPanel
            node={selectedNode}
            onUpdate={updateNode}
            onClose={() => selectNode(null)}
          />
        )}
      </div>
    </div>
  )
}

function SaveIndicator({ status, isDirty }: { status: 'idle' | 'saving' | 'saved'; isDirty: boolean }) {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Save className="h-3 w-3 animate-pulse" />
        Salvando...
      </span>
    )
  }

  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-primary/70">
        <Save className="h-3 w-3" />
        Salvo
      </span>
    )
  }

  if (isDirty) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
        <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Nao salvo
      </span>
    )
  }

  return null
}
