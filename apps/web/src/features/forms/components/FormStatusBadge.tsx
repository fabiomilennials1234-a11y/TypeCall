import { cn } from '@/lib/cn'

const statusConfig = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  published: { label: 'Publicado', className: 'bg-primary/10 text-primary' },
  archived: { label: 'Arquivado', className: 'bg-muted text-muted-foreground' },
  closed: { label: 'Fechado', className: 'bg-destructive/10 text-destructive' },
} as const

interface FormStatusBadgeProps {
  status: keyof typeof statusConfig
}

export function FormStatusBadge({ status }: FormStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}
