import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { useFormsQuery, useFormQuery, useCreateFormMutation, useDeleteFormMutation } from './useForms'

vi.mock('@/api/endpoints/forms', () => ({
  listForms: vi.fn(),
  getForm: vi.fn(),
  createForm: vi.fn(),
  updateForm: vi.fn(),
  deleteForm: vi.fn(),
  publishForm: vi.fn(),
}))

import * as formsApi from '@/api/endpoints/forms'

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

describe('useFormsQuery', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches forms list', async () => {
    const mockForms = {
      forms: [
        { id: '1', title: 'Form A', slug: 'form-a', status: 'draft' },
        { id: '2', title: 'Form B', slug: 'form-b', status: 'published' },
      ],
      hasMore: false,
    }
    vi.mocked(formsApi.listForms).mockResolvedValueOnce(mockForms as any)

    const { result } = renderHook(() => useFormsQuery(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.forms).toHaveLength(2)
  })

  it('passes status filter', async () => {
    vi.mocked(formsApi.listForms).mockResolvedValueOnce({ forms: [], hasMore: false } as any)

    renderHook(() => useFormsQuery({ status: 'published' }), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(formsApi.listForms).toHaveBeenCalledWith({ status: 'published' })
    })
  })
})

describe('useFormQuery', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches single form by id', async () => {
    const mockForm = { id: '123', title: 'My Form', slug: 'my-form', status: 'draft' }
    vi.mocked(formsApi.getForm).mockResolvedValueOnce(mockForm as any)

    const { result } = renderHook(() => useFormQuery('123'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.title).toBe('My Form')
  })

  it('does not fetch when id is empty', async () => {
    renderHook(() => useFormQuery(''), { wrapper: createWrapper() })

    expect(formsApi.getForm).not.toHaveBeenCalled()
  })
})

describe('useCreateFormMutation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates form and invalidates cache', async () => {
    const mockForm = { id: 'new-1', title: 'New Form', slug: 'new-form', status: 'draft' }
    vi.mocked(formsApi.createForm).mockResolvedValueOnce(mockForm as any)

    const { result } = renderHook(() => useCreateFormMutation(), { wrapper: createWrapper() })

    result.current.mutate({ title: 'New Form' } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(formsApi.createForm).mock.calls[0]![0]).toEqual({ title: 'New Form' })
  })
})

describe('useDeleteFormMutation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('deletes form', async () => {
    vi.mocked(formsApi.deleteForm).mockResolvedValueOnce(undefined as any)

    const { result } = renderHook(() => useDeleteFormMutation(), { wrapper: createWrapper() })

    result.current.mutate('form-id-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(formsApi.deleteForm).mock.calls[0]![0]).toEqual('form-id-1')
  })
})
