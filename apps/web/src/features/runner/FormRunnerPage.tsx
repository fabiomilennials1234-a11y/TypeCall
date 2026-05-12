import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import type { AnswerValue, FlowDefinition, Answers, StepType } from '@typecall/flow-engine'

import * as publicApi from '@/api/endpoints/public'
import { useRunner } from '@/features/runner/useRunner'
import { RunnerStep } from '@/features/runner/RunnerStep'
import { deriveTagFromAnswers } from '@/features/runner/deriveTag'
import { cn } from '@/lib/cn'
import { DUR, EASE } from '@/lib/motion'
import * as tracker from '@/features/runner/tracker'
import { readTheme, themeToCss } from '@/features/builder/lib/theme'
import { useMetaPixel } from '@/features/runner/useMetaPixel'
import { useQualification } from '@/features/runner/useQualification'

const stepVariants: Variants = {
  enter: (dir: 'forward' | 'backward') => ({
    opacity: 0,
    y: dir === 'forward' ? 24 : -24,
  }),
  center: { opacity: 1, y: 0 },
  exit: (dir: 'forward' | 'backward') => ({
    opacity: 0,
    y: dir === 'forward' ? -24 : 24,
  }),
}

export function FormRunnerPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['public-form', slug],
    queryFn: () => publicApi.getPublicForm(slug!),
    enabled: !!slug,
  })

  const {
    currentNode,
    answers,
    errors,
    isComplete,
    progress,
    history,
    direction,
    flow,
    init,
    setAnswer,
    next,
    previous,
  } = useRunner()

  const [submitted, setSubmitted] = useState(false)
  const startedRef = useRef(false)
  const { trackLead, trackSchedule, getUTMs } = useMetaPixel(slug)
  const { score: scoreQualification } = useQualification(form?.settings)

  const submitMutation = useMutation({
    mutationFn: () => {
      const submitAnswers = Object.entries(answers)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([nodeId, value]) => ({
          nodeId,
          value: value as unknown,
        }))

      const emailAnswer = Object.entries(answers).find(([nodeId]) => {
        const node = flow.nodes.find((n) => n.id === nodeId)
        return node?.type === 'email'
      })

      return publicApi.submitResponse(slug!, {
        answers: submitAnswers,
        respondentEmail: emailAnswer ? String(emailAnswer[1]) : undefined,
      })
    },
    onSuccess: () => setSubmitted(true),
  })

  useEffect(() => {
    if (form?.flowDefinition) {
      init(form.flowDefinition)
      tracker.trackView(form.id)
    }
  }, [form, init])

  useEffect(() => {
    if (!form) return
    const handleBeforeUnload = () => {
      if (!submitted) tracker.trackAbandon(form.id)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [form, submitted])

  // Pixel: dispara Lead na primeira resposta + Schedule quando schedule node ganha resposta
  const leadFiredRef = useRef(false)
  const scheduleFiredRef = useRef(false)
  useEffect(() => {
    const hasAnyAnswer = Object.values(answers).some(
      (v) => v !== null && v !== undefined && v !== '',
    )
    if (hasAnyAnswer && !leadFiredRef.current) {
      leadFiredRef.current = true
      trackLead({ form_id: form?.id })
    }
    const scheduleNode = flow.nodes.find((n) => n.type === 'schedule')
    if (scheduleNode && answers[scheduleNode.id] && !scheduleFiredRef.current) {
      scheduleFiredRef.current = true
      trackSchedule({ form_id: form?.id })
    }
  }, [answers, flow.nodes, form, trackLead, trackSchedule])

  // Score qualification block on submit (best-effort; needs response_id which
  // only exists after submitMutation.success in current backend design).
  void scoreQualification
  void getUTMs

  useEffect(() => {
    if (currentNode && form) {
      tracker.trackQuestionSeen(form.id, currentNode.id)
      if (!startedRef.current) {
        startedRef.current = true
        tracker.trackStart(form.id)
      }
    }
  }, [currentNode, form])

  useEffect(() => {
    if (isComplete && !submitted && !submitMutation.isPending) {
      if (form) tracker.trackSubmit(form.id)
      submitMutation.mutate()
    }
  }, [isComplete, submitted, submitMutation, form])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      next()
    }
  }, [next])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-6">
        <h1 className="text-2xl font-bold text-foreground">Formulário não encontrado</h1>
        <p className="mt-2 text-muted-foreground">Este formulário não existe ou não está publicado.</p>
      </div>
    )
  }

  if (submitted) {
    const endingNode = flow.nodes.find((n) => n.type === 'ending')
    const submittedTheme = themeToCss(readTheme(form?.theme))
    const endingProps = endingNode?.data.props as { label?: string; description?: string } | undefined
    return (
      <div className="form-runner flex h-screen flex-col items-center justify-center px-6" style={submittedTheme.style}>
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'color-mix(in oklab, var(--form-primary) 30%, transparent)' }}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
          />
          <motion.div
            className="relative flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in oklab, var(--form-primary) 15%, transparent)' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.1, 1], opacity: 1 }}
            transition={{ duration: DUR.cinema, ease: EASE.outExpo, times: [0, 0.7, 1] }}
          >
            <svg
              className="h-10 w-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--form-primary)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
              />
            </svg>
          </motion.div>
        </div>
        <motion.h1
          className="mt-6 text-2xl font-bold"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.route, delay: 0.4, ease: EASE.outExpo }}
        >
          {endingProps?.label ?? 'Obrigado!'}
        </motion.h1>
        <motion.p
          className="mt-2 text-center opacity-70"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ duration: DUR.route, delay: 0.5, ease: EASE.outExpo }}
        >
          {endingProps?.description ?? 'Suas respostas foram enviadas com sucesso.'}
        </motion.p>
      </div>
    )
  }

  if (!currentNode) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  const themed = themeToCss(readTheme(form.theme))

  return (
    <div className="form-runner flex h-screen flex-col" style={themed.style}>
      <div className="h-1 w-full bg-black/20">
        <motion.div
          className="h-1"
          style={{ background: 'var(--form-primary)' }}
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: DUR.route, ease: EASE.outExpo }}
        />
      </div>

      <div className={cn(
        'flex flex-1 flex-col justify-center px-6',
        themed.alignment === 'center' ? 'items-center text-center' : 'items-start',
      )}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={currentNode.id}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: DUR.route, ease: EASE.outExpo }}
            className="w-full max-w-lg"
          >
            <RunnerStep
              node={currentNode}
              value={answers[currentNode.id] ?? null}
              error={errors[currentNode.id] ?? ''}
              onChange={(value: AnswerValue) => {
                setAnswer(currentNode.id, value)
                if (form && value !== null && value !== undefined && value !== '') {
                  tracker.trackQuestionAnswered(form.id, currentNode.id)
                }
              }}
              onSubmit={next}
              prefillName={getPrefillFromAnswers(flow, answers, 'short_text')}
              prefillEmail={getPrefillFromAnswers(flow, answers, 'email')}
              formSlug={slug}
              leadTag={deriveTagFromAnswers(flow, answers)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
        <motion.button
          onClick={previous}
          disabled={history.length < 2}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm opacity-60 transition-opacity hover:opacity-100 disabled:opacity-20"
        >
          <ChevronUp className="h-4 w-4" />
          Voltar
        </motion.button>

        {currentNode.type === 'schedule' && !answers[currentNode.id] ? (
          <span className="text-xs opacity-50">Confirme o agendamento acima pra avancar.</span>
        ) : (
          <motion.button
            onClick={next}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--form-primary)', borderRadius: 'var(--form-radius)' }}
          >
            {currentNode.type === 'ending' ? 'Enviar' : 'Continuar'}
            <ChevronDown className="h-4 w-4" />
          </motion.button>
        )}
      </div>

      <div className="py-3 text-center">
        <span className="text-xs opacity-40">
          Powered by <span className="font-medium opacity-60">TypeCall</span>
        </span>
      </div>
    </div>
  )
}

function getPrefillFromAnswers(flow: FlowDefinition, answers: Answers, targetType: StepType): string | undefined {
  const node = flow.nodes.find((n) => n.type === targetType)
  if (!node) return undefined
  const val = answers[node.id]
  return typeof val === 'string' && val ? val : undefined
}
