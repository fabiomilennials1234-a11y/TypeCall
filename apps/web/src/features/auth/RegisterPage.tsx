import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useRegisterMutation } from '@/hooks/useAuth'
import { GoogleSigninButton } from './components/GoogleSigninButton'

const registerSchema = z.object({
  orgName: z.string().min(2, 'Minimo 2 caracteres'),
  orgSlug: z.string().min(3, 'Minimo 3 caracteres').regex(/^[a-z0-9-]+$/, 'Apenas letras minusculas, numeros e hifen'),
  name: z.string().min(2, 'Minimo 2 caracteres'),
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
})

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const registerMutation = useRegisterMutation()

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  function onSubmit(data: RegisterForm) {
    registerMutation.mutate(data, {
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
          <CardTitle className="text-2xl">Criar conta</CardTitle>
          <CardDescription>Comece a qualificar e agendar</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {registerMutation.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {registerMutation.error.message}
              </div>
            )}

            <GoogleSigninButton disabled={registerMutation.isPending} />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou cadastre-se com email</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Seu nome</Label>
              <Input id="name" placeholder="Maria Silva" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="maria@empresa.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="orgName">Nome da empresa</Label>
              <Input id="orgName" placeholder="Minha Empresa" {...register('orgName')} />
              {errors.orgName && <p className="text-xs text-destructive">{errors.orgName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgSlug">URL da empresa</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">typecall.com.br/</span>
                <Input id="orgSlug" placeholder="minha-empresa" {...register('orgSlug')} />
              </div>
              {errors.orgSlug && <p className="text-xs text-destructive">{errors.orgSlug.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? 'Criando...' : 'Criar conta'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Ja tem conta?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
