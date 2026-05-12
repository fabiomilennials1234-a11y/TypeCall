import { useEffect, useState, useCallback, useRef } from 'react'
import type { AnswerValue, FlowDefinition, Answers, StepType } from '@typecall/flow-engine'

import { useRunner } from '@/useRunner'
import { RunnerStep } from '@/components/RunnerStep'
import { getPublicForm, submitResponse, trackView, trackStart, trackQuestionSeen, trackQuestionAnswered, trackSubmit, trackAbandon } from '@/api'
import { initBridge, notifyReady, notifyStepChanged, notifyAnswer, notifyCompleted, notifyResize } from '@/bridge'
import { themeToCss } from '@/theme'

export function EmbedApp() {
  const slug = getSlugFromUrl()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [formTheme, setFormTheme] = useState<unknown>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const formIdRef = useRef<string | null>(null)

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

  useEffect(() => {
    initBridge()
  }, [])

  useEffect(() => {
    if (!slug) {
      setError('Formulario nao encontrado')
      setLoading(false)
      return
    }

    getPublicForm(slug)
      .then((form) => {
        formIdRef.current = form.id
        setFormTheme((form as { theme?: unknown }).theme ?? null)
        init(form.flowDefinition as unknown as FlowDefinition)
        notifyReady(form.title, form.flowDefinition.nodes.length)
        trackView(form.id)
        setLoading(false)
      })
      .catch(() => {
        setError('Formulario nao encontrado')
        setLoading(false)
      })
  }, [slug, init])

  useEffect(() => {
    if (currentNode) {
      const idx = history.indexOf(currentNode.id)
      notifyStepChanged(currentNode.id, currentNode.type, idx, flow.nodes.length)
      if (formIdRef.current) {
        trackQuestionSeen(formIdRef.current, currentNode.id)
        if (!startedRef.current) {
          startedRef.current = true
          trackStart(formIdRef.current)
        }
      }
    }
  }, [currentNode, history, flow.nodes.length])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!submitted && formIdRef.current) trackAbandon(formIdRef.current)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [submitted])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        notifyResize(entry.contentRect.height)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (isComplete && !submitted) {
      setSubmitted(true)
      if (formIdRef.current) trackSubmit(formIdRef.current)
      const submitAnswers = Object.entries(answers)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([nodeId, value]) => ({ nodeId, value: value as unknown }))

      const emailNode = flow.nodes.find((n) => n.type === 'email')
      const respondentEmail = emailNode ? String(answers[emailNode.id] ?? '') : undefined

      submitResponse(slug!, submitAnswers, respondentEmail)
        .then((res) => notifyCompleted(res.id))
        .catch(() => {})
    }
  }, [isComplete, submitted, answers, flow.nodes, slug])

  const handleAnswer = useCallback((nodeId: string, value: AnswerValue) => {
    setAnswer(nodeId, value)
    notifyAnswer(nodeId, value)
    if (formIdRef.current && value !== null && value !== undefined && value !== '') {
      trackQuestionAnswered(formIdRef.current, nodeId)
    }
  }, [setAnswer])

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center px-6">
        <p className="text-lg font-medium text-foreground">{error}</p>
      </div>
    )
  }

  const themed = themeToCss(formTheme)

  if (submitted) {
    const endingNode = flow.nodes.find((n) => n.type === 'ending')
    return (
      <div className="form-runner flex h-screen flex-col items-center justify-center px-6" style={themed.style}>
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'color-mix(in oklab, var(--form-primary) 30%, transparent)',
              animation: 'tc-success-sonar 1s ease-out 0.2s both',
            }}
          />
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: 'color-mix(in oklab, var(--form-primary) 15%, transparent)',
              animation: 'tc-success-ring var(--dur-cinema) var(--ease-out-expo) both',
            }}
          >
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="var(--form-primary)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M5 13l4 4L19 7"
                strokeDasharray="30"
                style={{ animation: 'tc-success-check 0.5s ease-out 0.25s both' }}
              />
            </svg>
          </div>
        </div>
        <h1
          className="mt-5 text-xl font-bold"
          style={{ opacity: 0, animation: 'tc-success-text var(--dur-route) var(--ease-out-expo) 0.4s both' }}
        >
          {(endingNode?.data.props.label as string) ?? 'Obrigado!'}
        </h1>
        <p
          className="mt-2 text-center text-sm"
          style={{ opacity: 0, animation: 'tc-success-text var(--dur-route) var(--ease-out-expo) 0.5s both' }}
        >
          {(endingNode?.data.props.description as string) ?? 'Suas respostas foram enviadas com sucesso.'}
        </p>
      </div>
    )
  }

  if (!currentNode) return null

  return (
    <div ref={containerRef} className="form-runner flex h-screen flex-col" style={themed.style}>
      <div className="h-1 w-full bg-black/20">
        <div
          className="h-1"
          style={{
            width: `${progress}%`,
            background: 'var(--form-primary)',
            transition: 'width var(--dur-route) var(--ease-out-expo)',
          }}
        />
      </div>

      <div className={`flex flex-1 flex-col justify-center px-6 ${themed.alignment === 'center' ? 'items-center text-center' : 'items-start'}`}>
        <div
          key={currentNode.id}
          className="w-full max-w-lg"
          style={{
            animation: `${direction === 'backward' ? 'tc-step-enter-backward' : 'tc-step-enter-forward'} var(--dur-route) var(--ease-out-expo) both`,
          }}
        >
          <RunnerStep
            node={currentNode}
            value={answers[currentNode.id] ?? null}
            error={errors[currentNode.id] ?? ''}
            onChange={(value: AnswerValue) => handleAnswer(currentNode.id, value)}
            onSubmit={next}
            prefillName={getPrefillFromAnswers(flow.nodes, answers, 'short_text')}
            prefillEmail={getPrefillFromAnswers(flow.nodes, answers, 'email')}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-6 py-3">
        <button
          onClick={previous}
          disabled={history.length < 2}
          className="rounded-lg px-3 py-2 text-sm opacity-60 transition-all duration-150 hover:opacity-100 active:scale-[0.96] disabled:opacity-20"
        >
          ← Voltar
        </button>
        <button
          onClick={next}
          className="px-5 py-2 text-sm font-medium text-white transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.96]"
          style={{ background: 'var(--form-primary)', borderRadius: 'var(--form-radius)' }}
        >
          {currentNode.type === 'ending' ? 'Enviar' : 'Continuar →'}
        </button>
      </div>
    </div>
  )
}

function getSlugFromUrl(): string | null {
  const path = window.location.pathname
  const match = path.match(/\/f\/([^/]+)/)
  if (match) return match[1] ?? null

  const params = new URLSearchParams(window.location.search)
  return params.get('form') ?? params.get('slug')
}

function getPrefillFromAnswers(nodes: FlowDefinition['nodes'], answers: Answers, targetType: StepType): string | undefined {
  const node = nodes.find((n) => n.type === targetType)
  if (!node) return undefined
  const val = answers[node.id]
  return typeof val === 'string' && val ? val : undefined
}
