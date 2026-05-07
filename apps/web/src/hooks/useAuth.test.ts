import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { useMeQuery, useLoginMutation, useLogoutMutation } from './useAuth'

vi.mock('@/api/endpoints/auth', () => ({
  getMe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))

import * as authApi from '@/api/endpoints/auth'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useMeQuery', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns user data on success', async () => {
    const mockUser = {
      user: { id: '1', email: 'test@test.com', name: 'Test', role: 'admin' as const },
      organization: { id: '1', name: 'Org', slug: 'org' },
    }
    vi.mocked(authApi.getMe).mockResolvedValueOnce(mockUser as any)

    const { result } = renderHook(() => useMeQuery(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockUser)
  })

  it('returns error when API fails', async () => {
    vi.mocked(authApi.getMe).mockRejectedValueOnce(new Error('unauthorized'))

    const { result } = renderHook(() => useMeQuery(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
})

describe('useLoginMutation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls login API and caches result', async () => {
    const mockUser = {
      user: { id: '1', email: 'test@test.com', name: 'Test' },
      organization: { id: '1', name: 'Org', slug: 'org' },
    }
    vi.mocked(authApi.login).mockResolvedValueOnce(mockUser as any)

    const { result } = renderHook(() => useLoginMutation(), { wrapper: createWrapper() })

    result.current.mutate({ email: 'test@test.com', password: 'pass' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(authApi.login).mock.calls[0]![0]).toEqual({ email: 'test@test.com', password: 'pass' })
  })

  it('handles login failure', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new Error('invalid credentials'))

    const { result } = renderHook(() => useLoginMutation(), { wrapper: createWrapper() })

    result.current.mutate({ email: 'wrong@test.com', password: 'bad' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useLogoutMutation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('clears query cache on logout', async () => {
    vi.mocked(authApi.logout).mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useLogoutMutation(), { wrapper: createWrapper() })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(authApi.logout).toHaveBeenCalled()
  })
})
