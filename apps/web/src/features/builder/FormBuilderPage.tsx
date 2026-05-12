import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Globe, Eye, Save, AlertCircle } from 'lucide-react'
import type { FlowDefinition } from '@typecall/flow-engine'

import { Button } from '@/components/ui/button'
import { useFormQuery, usePublishFormMutation } from '@/hooks/useForms'
import { FormStatusBadge } from '@/features/forms/components/FormStatusBadge'
import { useBuilder } from '@/features/builder/useBuilder'
import { useAutoSave } from '@/features/builder/useAutoSave'
import { useThemeAutoSave } from '@/features/builder/useThemeAutoSave'
import { defaultTheme, readTheme, type FormTheme } from '@/features/builder/lib/theme'
import { DUR, EASE } from '@/lib/motion'
import { BlockPalette } from '@/features/builder/components/BlockPalette'
import { BuilderCanvas } from '@/features/builder/components/BuilderCanvas'
import { PropertyPanel } from '@/features/builder/components/PropertyPanel'
import { DevicePreview } from '@/features/builder/components/DevicePreview'

export function FormBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: form, isLoading, isError } = useFormQuery(id!)
  const publishMutation = usePublishFormMutation(id!)
  const [showPreview, setShowPreview] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [theme, setTheme] = useState<FormTheme>(defaultTheme())
  const [themeDirty, setThemeDirty] = useState(false)

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

  useEffect(() => {
    if (form?.theme) {
      setTheme(readTheme(form.theme))
      setThemeDirty(false)
    }
  }, [form])

  useAutoSave(id!, flow, isDirty, () => {
    markClean()
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  })

  useThemeAutoSave(id!, theme, themeDirty, () => {
    setThemeDirty(false)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setShowPreview((s) => !s)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const selectedStepIndex = useMemo(() => {
    if (!selectedNodeId) return 0
    const idx = nodes.findIndex((n) => n.id === selectedNodeId)
    return idx >= 0 ? idx : 0
  }, [selectedNodeId, nodes])

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
          <SaveIndicator status={saveStatus} isDirty={isDirty || themeDirty} />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(true)}
            title="Preview (Ctrl+P)"
          >
            <Eye className="h-4 w-4" />
            Preview
            <kbd className="ml-1 hidden rounded border border-border bg-muted/40 px-1 text-[10px] font-mono text-muted-foreground md:inline">
              Ctrl+P
            </kbd>
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

        <PropertyPanel
          node={selectedNode}
          onUpdate={updateNode}
          onClose={() => selectNode(null)}
          formId={id!}
          theme={theme}
          onThemeChange={(next) => {
            setTheme(next)
            setThemeDirty(true)
          }}
        />
      </div>

      <DevicePreview
        open={showPreview}
        flow={flow}
        theme={theme}
        initialStepIndex={selectedStepIndex}
        onClose={() => setShowPreview(false)}
      />
    </div>
  )
}

function SaveIndicator({ status, isDirty }: { status: 'idle' | 'saving' | 'saved'; isDirty: boolean }) {
  const key = status === 'idle' && isDirty ? 'dirty' : status
  const transition = { duration: DUR.tap, ease: EASE.outExpo }
  const common = {
    initial: { opacity: 0, y: -4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 4 },
    transition,
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {key === 'saving' && (
        <motion.span key="saving" {...common} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Save className="h-3 w-3 animate-pulse" />
          Salvando...
        </motion.span>
      )}
      {key === 'saved' && (
        <motion.span key="saved" {...common} className="flex items-center gap-1.5 text-xs text-primary/70">
          <Save className="h-3 w-3" />
          Salvo
        </motion.span>
      )}
      {key === 'dirty' && (
        <motion.span key="dirty" {...common} className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-amber-500"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          Nao salvo
        </motion.span>
      )}
    </AnimatePresence>
  )
}
