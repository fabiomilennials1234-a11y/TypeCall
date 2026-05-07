import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useFormsQuery } from '@/hooks/useForms'
import { CreateFormDialog } from '@/features/forms/components/CreateFormDialog'
import { FormStatusBadge } from '@/features/forms/components/FormStatusBadge'

export function FormsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading, isError } = useFormsQuery()

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Formularios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie e gerencie seus formularios conversacionais
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Novo formulario
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-12">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h2 className="mt-4 text-lg font-medium">Erro ao carregar formulários</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tente recarregar a página.</p>
        </div>
      )}

      {data && data.forms.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-medium">Nenhum formulario</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie seu primeiro formulario conversacional
          </p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Criar formulario
          </Button>
        </div>
      )}

      {data && data.forms.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.forms.map((form) => (
            <Link
              key={form.id}
              to={`/forms/${form.id}`}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {form.title}
                </h3>
                <FormStatusBadge status={form.status} />
              </div>
              {form.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {form.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span>/{form.slug}</span>
                {form.version > 0 && <span>v{form.version}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && <CreateFormDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}
