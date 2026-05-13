import { Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  FileText,
  LogOut,
  Calendar,
  BarChart3,
  Settings,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/contexts/auth'
import { useLogoutMutation } from '@/hooks/useAuth'
import { DUR, EASE } from '@/lib/motion'

type Role = 'admin' | 'member' | 'master' | 'seller'

interface NavItem {
  label: string
  icon: typeof FileText
  path: string
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', icon: BarChart3, path: '/' },
  { label: 'Funis', icon: FileText, path: '/forms' },
  { label: 'Reunioes', icon: Calendar, path: '/bookings' },
  { label: 'Vendedores', icon: Users, path: '/sellers' },
  { label: 'Configuracoes', icon: Settings, path: '/settings' },
]

const sellerNav: NavItem[] = [
  { label: 'Minhas reunioes', icon: Calendar, path: '/bookings' },
]

function navForRole(role: Role): NavItem[] {
  if (role === 'seller') return sellerNav
  return adminNav
}

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
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-line bg-paper-2">
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-4">
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-sm border border-ink bg-paper">
          <span className="font-display text-[15px] font-semibold leading-none text-ink">
            T
          </span>
        </div>
        <span className="font-display text-[17px] tracking-tight text-ink">
          TypeCall
        </span>
      </div>

      <div className="px-4 pt-5">
        <span className="font-mono-tc">Workspace</span>
      </div>

      <nav className="mt-2 flex-1 space-y-0.5 px-2 py-2">
        {navForRole(user.role).map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'relative flex items-center gap-3 rounded-sm py-2 pl-4 pr-3 text-[13px] transition-colors',
                isActive
                  ? 'bg-paper-3/60 font-semibold text-ink'
                  : 'text-ink-soft hover:bg-paper-3/40 hover:text-ink',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-bar"
                  className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r-sm bg-ink"
                  transition={{ duration: DUR.micro, ease: EASE.outExpo }}
                />
              )}
              <item.icon
                className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-ink' : 'text-ink-mid')}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-line-soft p-3">
        <span className="font-mono-tc px-1">Org</span>
        <div className="mt-2 flex items-center gap-2.5 rounded-sm border border-line bg-paper p-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-ink bg-paper-2 text-[11px] font-semibold text-ink">
            {(organization.name || 'O').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-ink">
              {organization.name}
            </p>
            <p className="truncate font-mono text-[10px] uppercase tracking-wider text-ink-low">
              {user.name}
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="rounded-sm p-1.5 text-ink-low transition-colors hover:bg-paper-3 hover:text-ink disabled:opacity-50"
            title="Sair"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
