import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuth } from '@/contexts/auth'
import { DUR, EASE, useReducedMotion } from '@/lib/motion'

export function AppLayout() {
  const { user, organization } = useAuth()
  const location = useLocation()
  const reduced = useReducedMotion()

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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={reduced ? { duration: 0 } : { duration: DUR.route, ease: EASE.outExpo }}
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
