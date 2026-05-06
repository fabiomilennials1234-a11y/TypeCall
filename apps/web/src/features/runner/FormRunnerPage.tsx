import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ChevronUp, ChevronDown, Check, Loader2 } from 'lucide-react'
import type { AnswerValue } from '@typecall/flow-engine'

import * as publicApi from '@/api/endpoints/public'
import { useRunner } from '@/features/runner/useRunner'
import { RunnerStep } from '@/features/runner/RunnerStep'
import { cn } from '@/lib/cn'

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
    }
  }, [form, init])

  useEffect(() => {
    if (isComplete && !submitted && !submitMutation.isPending) {
      submitMutation.mutate()
    }
  }, [isComplete, submitted, submitMutation])

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
        <h1 className="text-2xl font-bold text-foreground">Formulario nao encontrado</h1>
        <p className="mt-2 text-muted-foreground">Este formulario nao existe ou nao esta publicado.</p>
      </div>
    )
  }

  if (submitted) {
    const endingNode = flow.nodes.find((n) => n.type === 'ending')
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-foreground">
          {endingNode?.data.props.label ?? 'Obrigado!'}
        </h1>
        <p className="mt-2 text-center text-muted-foreground">
          {(endingNode?.data.props as { description?: string })?.description ?? 'Suas respostas foram enviadas com sucesso.'}
        </p>
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

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="h-1 w-full bg-muted">
        <div
          className="h-1 bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div
          key={currentNode.id}
          className={cn(
            'w-full max-w-lg',
            'animate-in fade-in duration-300',
            direction === 'forward' ? 'slide-in-from-bottom-4' : 'slide-in-from-top-4'
          )}
        >
          <RunnerStep
            node={currentNode}
            value={answers[currentNode.id] ?? null}
            error={errors[currentNode.id] ?? ''}
            onChange={(value: AnswerValue) => setAnswer(currentNode.id, value)}
            onSubmit={next}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        <button
          onClick={previous}
          disabled={history.length < 2}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        >
          <ChevronUp className="h-4 w-4" />
          Voltar
        </button>

        <button
          onClick={next}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {currentNode.type === 'ending' ? 'Enviar' : 'Continuar'}
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="py-3 text-center">
        <span className="text-xs text-muted-foreground/40">
          Powered by <span className="font-medium text-muted-foreground/60">TypeCall</span>
        </span>
      </div>
    </div>
  )
}
