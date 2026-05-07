import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Globe, Trash2, Pencil, MessageSquare, ExternalLink, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useFormQuery, useDeleteFormMutation, usePublishFormMutation } from '@/hooks/useForms'
import { FormStatusBadge } from '@/features/forms/components/FormStatusBadge'

export function FormDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: form, isLoading, isError } = useFormQuery(id!)
  const deleteMutation = useDeleteFormMutation()
  const publishMutation = usePublishFormMutation(id!)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !form) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="mt-4 text-lg font-medium">Formulário não encontrado</h2>
        <p className="mt-1 text-sm text-muted-foreground">Este formulário não existe ou foi removido.</p>
      </div>
    )
  }

  function handleDelete() {
    if (!confirm('Tem certeza que deseja deletar este formulario?')) return
    deleteMutation.mutate(id!, {
      onSuccess: () => navigate('/forms'),
    })
  }

  function handlePublish() {
    publishMutation.mutate()
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/forms')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Formularios
        </button>
      </div>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{form.title}</h1>
            <FormStatusBadge status={form.status} />
          </div>
          {form.description && (
            <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            /{form.slug} &middot; v{form.version}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/forms/${id}/responses`)}>
            <MessageSquare className="h-4 w-4" />
            Respostas
          </Button>
          <Button variant="outline" onClick={() => navigate(`/forms/${id}/builder`)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          {(form.status === 'draft' || form.status === 'published') && (
            <Button
              onClick={handlePublish}
              disabled={publishMutation.isPending}
            >
              <Globe className="h-4 w-4" />
              {publishMutation.isPending ? 'Publicando...' : 'Publicar'}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Informacoes</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{form.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Versao</dt>
              <dd>{form.version || 'Nenhuma publicada'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Criado em</dt>
              <dd>{new Date(form.createdAt).toLocaleDateString('pt-BR')}</dd>
            </div>
            {form.publishedAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Publicado em</dt>
                <dd>{new Date(form.publishedAt).toLocaleDateString('pt-BR')}</dd>
              </div>
            )}
          </dl>

          {form.status === 'published' && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
              <a
                href={`/f/${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                /f/{form.slug}
              </a>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Draft</h2>
          <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-background p-4 text-xs text-muted-foreground">
            {JSON.stringify(form.draftDefinition, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
