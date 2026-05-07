import { Link, useLocation } from 'react-router-dom'
import { FileText, LayoutDashboard, LogOut, Zap, Calendar, Video, Webhook, Code2, BarChart3, Settings, Kanban, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/contexts/auth'
import { useLogoutMutation } from '@/hooks/useAuth'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Formularios', icon: FileText, path: '/forms' },
  { label: 'Agendamentos', icon: Calendar, path: '/scheduling' },
  { label: 'Reunioes', icon: Video, path: '/bookings' },
  { label: 'Kanban', icon: Kanban, path: '/kanban' },
  { label: 'Vendedores', icon: Users, path: '/sellers' },
  { label: 'Webhook', icon: Webhook, path: '/webhooks' },
  { label: 'Embed', icon: Code2, path: '/embed' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { label: 'Integracoes', icon: Settings, path: '/settings/integrations' },
]

export function Sidebar() {
  const location = useLocation()
  const { user, organization } = useAuth()
  const logoutMutation = useLogoutMutation()

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        window.location.href = '/login'
      },
    })
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          TypeCall
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-sidebar-foreground">
              {organization.name}
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="rounded-md p-1.5 text-sidebar-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
