import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateFormMutation } from '@/hooks/useForms'

const schema = z.object({
  title: z.string().min(1, 'Titulo obrigatorio'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface CreateFormDialogProps {
  onClose: () => void
}

export function CreateFormDialog({ onClose }: CreateFormDialogProps) {
  const navigate = useNavigate()
  const createMutation = useCreateFormMutation()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function onSubmit(data: FormData) {
    createMutation.mutate(data, {
      onSuccess: (form) => {
        onClose()
        navigate(`/forms/${form.id}`)
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Novo formulario</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {createMutation.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {createMutation.error.message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titulo</Label>
            <Input id="title" placeholder="Qualificacao de leads" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descricao (opcional)</Label>
            <Input id="description" placeholder="Formulario para..." {...register('description')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
