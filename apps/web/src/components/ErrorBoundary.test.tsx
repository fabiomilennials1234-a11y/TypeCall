import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error')
  return <div>All good</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
    expect(screen.getByText(/Ocorreu um erro inesperado/)).toBeInTheDocument()
    expect(screen.getByText('Recarregar página')).toBeInTheDocument()
    expect(screen.getByText('Voltar ao início')).toBeInTheDocument()
  })

  it('has working home link', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )

    const homeLink = screen.getByText('Voltar ao início').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')
  })
})
