import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as authApi from '@/api/endpoints/auth'

export function useMeQuery() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLoginMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data)
    },
  })
}

export function useRegisterMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data)
    },
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
