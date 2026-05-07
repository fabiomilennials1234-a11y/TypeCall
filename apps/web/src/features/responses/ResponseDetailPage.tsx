import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, AlertCircle } from 'lucide-react'

import * as responsesApi from '@/api/endpoints/responses'

export function ResponseDetailPage() {
  const { id, responseId } = useParams<{ id: string; responseId: string }>()
  const navigate = useNavigate()

  const { data: resp, isLoading, isError } = useQuery({
    queryKey: ['response', id, responseId],
    queryFn: () => responsesApi.getResponse(id!, responseId!),
    enabled: !!id && !!responseId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !resp) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="mt-4 text-lg font-medium">Resposta não encontrada</h2>
        <p className="mt-1 text-sm text-muted-foreground">Esta resposta não existe ou foi removida.</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/forms/${id}/responses`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Respostas
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {resp.respondentEmail ?? resp.respondentName ?? 'Resposta anonima'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enviada em {new Date(resp.createdAt).toLocaleString('pt-BR')}
        </p>
      </div>

      <div className="space-y-3">
        {(resp.answers ?? []).map((answer) => (
          <div key={answer.id} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{answer.nodeId}</p>
            <p className="mt-1 text-sm text-foreground">
              {typeof answer.value === 'string' ? answer.value : JSON.stringify(answer.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
