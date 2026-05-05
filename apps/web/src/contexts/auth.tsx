import { createContext, useContext } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import type { AuthUser } from '@/api/endpoints/auth'
import { useMeQuery } from '@/hooks/useAuth'

const AuthContext = createContext<AuthUser | null>(null)

export function useAuth(): AuthUser {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within ProtectedRoute')
  return ctx
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

export function ProtectedRoute() {
  const { data, isLoading, isError } = useMeQuery()

  if (isLoading) return <LoadingScreen />
  if (isError || !data) return <Navigate to="/login" replace />

  return (
    <AuthContext.Provider value={data}>
      <Outlet />
    </AuthContext.Provider>
  )
}

export function PublicRoute() {
  const { data, isLoading } = useMeQuery()

  if (isLoading) return <LoadingScreen />
  if (data) return <Navigate to="/" replace />

  return <Outlet />
}
