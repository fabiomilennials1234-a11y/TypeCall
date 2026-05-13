import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRegisterMutation } from '@/hooks/useAuth'
import { GoogleSigninButton } from './components/GoogleSigninButton'
import { AuthShell } from './components/AuthShell'

const registerSchema = z.object({
  orgName: z.string().min(2, 'Minimo 2 caracteres'),
  orgSlug: z
    .string()
    .min(3, 'Minimo 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minusculas, numeros e hifen'),
  name: z.string().min(2, 'Minimo 2 caracteres'),
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
})

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const registerMutation = useRegisterMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  function onSubmit(data: RegisterForm) {
    registerMutation.mutate(data, {
      onSuccess: () => navigate('/'),
    })
  }

  return (
    <AuthShell
      step="00 · criar conta"
      title="Comece em 1 dia."
      altText="Ja tem conta?"
      altCta={{ label: 'Entrar', to: '/login' }}
      pitchEyebrow="Setup em 1 dia"
      pitchTitle={
        <>
          Um funil. Um vendedor.
          <br />
          Uma <span className="tc-underline">agenda</span>.
        </>
      }
      pitchBody="TypeCall e o cerebro entre o anuncio e a venda: qualifica o lead, atribui o SDR certo, cola na agenda — sem Zapier, sem planilha."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {registerMutation.error && (
          <div className="rounded-sm border border-bad/30 bg-bad/5 p-3 text-xs text-bad">
            {registerMutation.error.message}
          </div>
        )}

        <GoogleSigninButton disabled={registerMutation.isPending} />

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-low">
            ou com email
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <Field
          id="name"
          label="seu nome"
          placeholder="Maria Silva"
          error={errors.name?.message}
          {...register('name')}
        />

        <Field
          id="email"
          label="email do trabalho"
          type="email"
          placeholder="maria@empresa.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Field
          id="password"
          label="senha"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="my-2 h-px bg-line" />

        <Field
          id="orgName"
          label="nome da empresa"
          placeholder="Minha Empresa"
          error={errors.orgName?.message}
          {...register('orgName')}
        />

        <div className="space-y-1.5">
          <Label
            htmlFor="orgSlug"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mid"
          >
            url da empresa
          </Label>
          <div className="flex overflow-hidden rounded-sm border border-line bg-paper focus-within:border-ink">
            <span className="border-r border-line bg-paper-2 px-2.5 py-2 font-mono text-[12px] text-ink-mid">
              typecall.com.br/
            </span>
            <input
              id="orgSlug"
              placeholder="minha-empresa"
              className="flex-1 bg-transparent px-2.5 py-2 text-[13px] text-ink outline-none placeholder:text-ink-low"
              {...register('orgSlug')}
            />
          </div>
          {errors.orgSlug && (
            <p className="text-[11px] text-bad">{errors.orgSlug.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? 'Criando...' : 'Criar conta →'}
        </Button>
      </form>
    </AuthShell>
  )
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
}

const Field = (props: FieldProps) => {
  const { id, label, error, ...rest } = props
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mid"
      >
        {label}
      </Label>
      <Input id={id} {...rest} />
      {error && <p className="text-[11px] text-bad">{error}</p>}
    </div>
  )
}
