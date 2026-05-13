import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLoginMutation } from '@/hooks/useAuth'
import { GoogleSigninButton } from './components/GoogleSigninButton'
import { AuthShell } from './components/AuthShell'

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const loginMutation = useLoginMutation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [oauthError, setOauthError] = useState<string | null>(null)

  useEffect(() => {
    const err = searchParams.get('error')
    if (err) {
      setOauthError(googleErrorMessage(err))
      const next = new URLSearchParams(searchParams)
      next.delete('error')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  function onSubmit(data: LoginForm) {
    loginMutation.mutate(data, {
      onSuccess: () => navigate('/'),
    })
  }

  return (
    <AuthShell
      step="01 · entrar"
      title="Bem-vindo de volta."
      altText="Ainda nao tem conta?"
      altCta={{ label: 'Criar conta', to: '/register' }}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {oauthError && (
          <div className="rounded-sm border border-bad/30 bg-bad/5 p-3 text-xs text-bad">
            {oauthError}
          </div>
        )}
        {loginMutation.error && (
          <div className="rounded-sm border border-bad/30 bg-bad/5 p-3 text-xs text-bad">
            {loginMutation.error.message}
          </div>
        )}

        <GoogleSigninButton disabled={loginMutation.isPending} />

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-low">
            ou
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mid">
            email do trabalho
          </Label>
          <Input id="email" type="email" placeholder="voce@empresa.com" {...register('email')} />
          {errors.email && <p className="text-[11px] text-bad">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mid">
            senha
          </Label>
          <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="text-[11px] text-bad">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-mid">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded-sm border-line accent-ink"
            />
            lembrar de mim
          </label>
          <Link
            to="/forgot"
            className="font-mono text-[10px] uppercase tracking-wider text-ink underline underline-offset-2 hover:text-ink-soft"
          >
            esqueci a senha
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Entrando...' : 'Entrar →'}
        </Button>
      </form>
    </AuthShell>
  )
}

function googleErrorMessage(code: string): string {
  switch (code) {
    case 'oauth_denied':
      return 'Autorizacao Google cancelada.'
    case 'invalid_state':
      return 'Sessao OAuth expirou. Tente novamente.'
    case 'missing_params':
      return 'Resposta do Google incompleta.'
    case 'account_disabled':
      return 'Conta desativada. Contate o admin.'
    case 'callback_failed':
      return 'Falha ao concluir login com Google.'
    default:
      return `Erro ao entrar com Google (${code}).`
  }
}
