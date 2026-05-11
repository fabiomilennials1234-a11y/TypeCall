import { ArrowRight, Calendar, FileText, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-8 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Bem-vindo ao TypeCall
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Em 4 passos voce configura agenda, tracking, e cria seu primeiro funil de qualificacao + agendamento.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-left">
        <FeatureCard
          icon={<Calendar className="h-4 w-4" />}
          title="Agenda"
          desc="Dias, horarios, duracao e tipo de reuniao."
        />
        <FeatureCard
          icon={<Target className="h-4 w-4" />}
          title="Pixel Meta"
          desc="Trackear inicio do quiz e agendamentos."
        />
        <FeatureCard
          icon={<FileText className="h-4 w-4" />}
          title="Funil"
          desc="Quiz com 7 etapas pronto pra editar."
        />
      </div>

      <Button onClick={onNext} className="gap-2" size="lg">
        Comecar
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  )
}
