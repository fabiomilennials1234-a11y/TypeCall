import { Navigate, Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuth } from '@/contexts/auth'

export function AppLayout() {
  const { user, organization } = useAuth()

  // Gate de onboarding: admin/master sem onboarded_at vai pro wizard.
  const needsOnboarding =
    !organization.onboardedAt && (user.role === 'admin' || user.role === 'master')

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
