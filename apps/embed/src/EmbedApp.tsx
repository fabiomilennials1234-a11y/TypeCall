import { useEffect, useState, useCallback, useRef } from 'react'
import type { AnswerValue, FlowDefinition, Answers, StepType } from '@typecall/flow-engine'

import { useRunner } from '@/useRunner'
import { RunnerStep } from '@/components/RunnerStep'
import { getPublicForm, submitResponse, trackView, trackStart, trackQuestionSeen, trackQuestionAnswered, trackSubmit, trackAbandon } from '@/api'
import { initBridge, notifyReady, notifyStepChanged, notifyAnswer, notifyCompleted, notifyResize } from '@/bridge'

export function EmbedApp() {
  const slug = getSlugFromUrl()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
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

  if (submitted) {
    const endingNode = flow.nodes.find((n) => n.type === 'ending')
    return (
      <div className="flex h-screen flex-col items-center justify-center px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-5 text-xl font-bold text-foreground">
          {(endingNode?.data.props.label as string) ?? 'Obrigado!'}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {(endingNode?.data.props.description as string) ?? 'Suas respostas foram enviadas com sucesso.'}
        </p>
      </div>
    )
  }

  if (!currentNode) return null

  return (
    <div ref={containerRef} className="flex h-screen flex-col">
      <div className="h-1 w-full bg-muted">
        <div className="h-1 bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div
          key={currentNode.id}
          className="w-full max-w-lg animate-[fadeSlideIn_0.3s_ease-out]"
          style={{ animationDirection: direction === 'backward' ? 'reverse' : 'normal' }}
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

      <div className="flex items-center justify-between border-t border-border px-6 py-3">
        <button
          onClick={previous}
          disabled={history.length < 2}
          className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        >
          ← Voltar
        </button>
        <button
          onClick={next}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
