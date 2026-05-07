import { useAuth } from '@/contexts/auth'

export function DashboardPage() {
  const { user, organization } = useAuth()

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bem-vindo, {user.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Forms ativos', value: '0' },
          { label: 'Respostas este mes', value: '0' },
          { label: 'Agendamentos', value: '0' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-6"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Organizacao: <span className="text-foreground">{organization.name}</span>
          {' '}&middot;{' '}
          Plano: <span className="capitalize text-foreground">{organization.plan}</span>
        </p>
      </div>
    </div>
  )
}
