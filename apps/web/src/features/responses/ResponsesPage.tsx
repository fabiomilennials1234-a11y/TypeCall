import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, User, Mail, Clock } from 'lucide-react'

import * as responsesApi from '@/api/endpoints/responses'
import { useFormQuery } from '@/hooks/useForms'
import { cn } from '@/lib/cn'

const statusConfig = {
  completed: { label: 'Completa', className: 'bg-primary/10 text-primary' },
  in_progress: { label: 'Em andamento', className: 'bg-amber-500/10 text-amber-500' },
  abandoned: { label: 'Abandonada', className: 'bg-destructive/10 text-destructive' },
} as const

export function ResponsesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: form } = useFormQuery(id!)

  const { data, isLoading } = useQuery({
    queryKey: ['responses', id],
    queryFn: () => responsesApi.listResponses(id!),
    enabled: !!id,
  })

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/forms/${id}`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {form?.title ?? 'Formulario'}
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Respostas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.responses.length} resposta${data.responses.length !== 1 ? 's' : ''}` : 'Carregando...'}
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {data && data.responses.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Mail className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-medium">Nenhuma resposta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Publique seu formulario e compartilhe o link para receber respostas
          </p>
        </div>
      )}

      {data && data.responses.length > 0 && (
        <div className="space-y-2">
          {data.responses.map((resp) => {
            const config = statusConfig[resp.status] ?? statusConfig.completed
            return (
              <div
                key={resp.id}
                onClick={() => navigate(`/forms/${id}/responses/${resp.id}`)}
                className="flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {resp.respondentEmail ?? resp.respondentName ?? 'Anonimo'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(resp.createdAt).toLocaleString('pt-BR')}
                  </div>
                </div>

                <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', config.className)}>
                  {config.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
