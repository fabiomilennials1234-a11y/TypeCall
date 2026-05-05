import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
