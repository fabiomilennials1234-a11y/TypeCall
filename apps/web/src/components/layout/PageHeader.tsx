import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PageHeaderProps {
  crumbs?: string[]
  eyebrow?: string
  title: string
  subtitle?: string
  right?: ReactNode
  className?: string
  serif?: boolean
}

export function PageHeader({
  crumbs,
  eyebrow,
  title,
  subtitle,
  right,
  className,
  serif = true,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-line bg-paper px-6 py-5 lg:px-10 lg:py-7',
        'sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <nav className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-low">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className={i === crumbs.length - 1 ? 'text-ink-mid' : ''}>
                  {c}
                </span>
                {i < crumbs.length - 1 && <span>/</span>}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && !crumbs && (
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mid">
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            'truncate text-2xl text-ink sm:text-3xl',
            serif ? 'font-display tracking-tight' : 'font-semibold tracking-tight',
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-prose font-serif text-[15px] leading-snug text-ink-soft">
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  )
}
