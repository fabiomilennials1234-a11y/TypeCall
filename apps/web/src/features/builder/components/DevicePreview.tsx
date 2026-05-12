import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Monitor, Smartphone, Tablet, X } from 'lucide-react'
import type { FlowDefinition } from '@typecall/flow-engine'

import { DUR, EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

import { themeToCss, type FormTheme } from '../lib/theme'
import { PreviewStep } from './PreviewStep'

type Viewport = 'mobile' | 'tablet' | 'desktop'

const VIEWPORTS: Record<Viewport, { w: number; h: number; radius: number; label: string }> = {
  mobile: { w: 390, h: 780, radius: 32, label: 'Mobile' },
  tablet: { w: 768, h: 1024, radius: 20, label: 'Tablet' },
  desktop: { w: 1280, h: 800, radius: 12, label: 'Desktop' },
}

interface DevicePreviewProps {
  open: boolean
  flow: FlowDefinition
  theme: FormTheme
  initialStepIndex?: number
  onClose: () => void
}

export function DevicePreview({ open, flow, theme, initialStepIndex = 0, onClose }: DevicePreviewProps) {
  return (
    <AnimatePresence>
      {open && (
        <DevicePreviewInner
          flow={flow}
          theme={theme}
          initialStepIndex={initialStepIndex}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  )
}

function DevicePreviewInner({
  flow,
  theme,
  initialStepIndex,
  onClose,
}: {
  flow: FlowDefinition
  theme: FormTheme
  initialStepIndex: number
  onClose: () => void
}) {
  const [viewport, setViewport] = useState<Viewport>('mobile')
  const [currentIndex, setCurrentIndex] = useState(() =>
    clamp(initialStepIndex, 0, Math.max(0, flow.nodes.length - 1)),
  )

  useEffect(() => {
    setCurrentIndex(clamp(initialStepIndex, 0, Math.max(0, flow.nodes.length - 1)))
  }, [initialStepIndex, flow.nodes.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentIndex((i) => Math.min(flow.nodes.length - 1, i + 1))
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentIndex((i) => Math.max(0, i - 1))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flow.nodes.length, onClose])

  const node = flow.nodes[currentIndex]
  const themeCss = themeToCss(theme)
  const dims = VIEWPORTS[viewport]
  const total = flow.nodes.length
  const isFirst = currentIndex === 0
  const isLast = currentIndex >= total - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preview do formulario"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <motion.div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DUR.micro }}
        onClick={onClose}
      />

      <motion.div
        className="relative flex flex-col items-center gap-4"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: DUR.route, ease: EASE.outExpo }}
      >
        <TopBar viewport={viewport} onChangeViewport={setViewport} onClose={onClose} />

        <motion.div
          layout
          transition={{ duration: DUR.route, ease: EASE.outExpo }}
          className="relative max-h-[80vh] max-w-[90vw] overflow-hidden border-[10px] border-card bg-card shadow-2xl"
          style={{
            width: dims.w,
            height: Math.min(dims.h, window.innerHeight * 0.8),
            borderRadius: dims.radius,
          }}
        >
          {viewport === 'mobile' && (
            <div className="pointer-events-none absolute left-1/2 top-2 z-10 h-1.5 w-24 -translate-x-1/2 rounded-full bg-black/60" />
          )}

          <div
            className="flex h-full w-full flex-col overflow-hidden"
            style={themeCss.style}
          >
            <ProgressBar value={total > 0 ? ((currentIndex + 1) / total) * 100 : 0} />

            <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">
              {node ? (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: DUR.micro, ease: EASE.outExpo }}
                    className={cn('w-full', themeCss.alignment === 'center' && 'text-center')}
                  >
                    <PreviewStep node={node} />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <p className="text-sm opacity-60">Adicione blocos para ver o preview</p>
              )}
            </div>

            {total > 0 && (
              <div className="flex items-center justify-between border-t border-current/10 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={isFirst}
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium opacity-70 disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Voltar
                </button>
                <span className="text-xs tabular-nums opacity-50">
                  {currentIndex + 1} / {total}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
                  disabled={isLast}
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-30"
                  style={{ background: 'var(--form-primary)', color: '#fff' }}
                >
                  {node?.type === 'ending' ? 'Enviar' : 'Continuar'}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

function TopBar({
  viewport,
  onChangeViewport,
  onClose,
}: {
  viewport: Viewport
  onChangeViewport: (v: Viewport) => void
  onClose: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-border bg-card/90 px-3 py-1.5 backdrop-blur">
      <span className="px-2 text-xs font-medium text-muted-foreground">Preview</span>
      <div className="h-4 w-px bg-border" />
      <ViewportButton active={viewport === 'mobile'} onClick={() => onChangeViewport('mobile')}>
        <Smartphone className="h-3.5 w-3.5" />
      </ViewportButton>
      <ViewportButton active={viewport === 'tablet'} onClick={() => onChangeViewport('tablet')}>
        <Tablet className="h-3.5 w-3.5" />
      </ViewportButton>
      <ViewportButton active={viewport === 'desktop'} onClick={() => onChangeViewport('desktop')}>
        <Monitor className="h-3.5 w-3.5" />
      </ViewportButton>
      <div className="h-4 w-px bg-border" />
      <button
        type="button"
        onClick={onClose}
        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
        aria-label="Fechar preview"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function ViewportButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md p-1.5 transition-colors',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-0.5 w-full bg-current/10">
      <motion.div
        className="h-full"
        style={{ background: 'var(--form-primary)' }}
        initial={false}
        animate={{ width: `${value}%` }}
        transition={{ duration: DUR.micro, ease: EASE.outExpo }}
      />
    </div>
  )
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}
