import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/auth'

type Role = 'admin' | 'member' | 'master' | 'seller'

interface Props {
  allowed: Role[]
  fallback?: string
}

// useRequireRole — guarda de rota declarativa baseada em role do usuario.
// Uso: <Route element={<RequireRole allowed={['admin']} />}> ... </Route>
export function RequireRole({ allowed, fallback = '/' }: Props) {
  const auth = useAuth()
  if (!allowed.includes(auth.user.role)) {
    return <Navigate to={fallback} replace />
  }
  return <Outlet />
}

// hook auxiliar pra uso dentro de componentes (ex: hide CTA admin-only)
export function useHasRole(...roles: Role[]): boolean {
  const auth = useAuth()
  return roles.includes(auth.user.role)
}
