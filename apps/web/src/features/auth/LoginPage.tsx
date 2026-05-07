import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useLoginMutation } from '@/hooks/useAuth'
import { GoogleSigninButton } from './components/GoogleSigninButton'

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

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  function onSubmit(data: LoginForm) {
    loginMutation.mutate(data, {
      onSuccess: () => navigate('/'),
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Entrar no TypeCall</CardTitle>
          <CardDescription>Entre com seu email e senha</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {oauthError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {oauthError}
              </div>
            )}
            {loginMutation.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {loginMutation.error.message}
              </div>
            )}
            <GoogleSigninButton disabled={loginMutation.isPending} />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Nao tem conta?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Criar conta
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

function googleErrorMessage(code: string): string {
  switch (code) {
    case 'oauth_denied': return 'Autorizacao Google cancelada.'
    case 'invalid_state': return 'Sessao OAuth expirou. Tente novamente.'
    case 'missing_params': return 'Resposta do Google incompleta.'
    case 'account_disabled': return 'Conta desativada. Contate o admin.'
    case 'callback_failed': return 'Falha ao concluir login com Google.'
    default: return `Erro ao entrar com Google (${code}).`
  }
}
