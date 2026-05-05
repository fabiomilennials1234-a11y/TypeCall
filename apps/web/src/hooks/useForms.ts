import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as formsApi from '@/api/endpoints/forms'

export function useFormsQuery(params?: { status?: string }) {
  return useQuery({
    queryKey: ['forms', params],
    queryFn: () => formsApi.listForms(params),
  })
}

export function useFormQuery(id: string) {
  return useQuery({
    queryKey: ['forms', id],
    queryFn: () => formsApi.getForm(id),
    enabled: !!id,
  })
}

export function useCreateFormMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: formsApi.createForm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
    },
  })
}

export function useUpdateFormMutation(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: formsApi.UpdateFormInput) => formsApi.updateForm(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(['forms', id], data)
      queryClient.invalidateQueries({ queryKey: ['forms'] })
    },
  })
}

export function useDeleteFormMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: formsApi.deleteForm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
    },
  })
}

export function usePublishFormMutation(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => formsApi.publishForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', id] })
      queryClient.invalidateQueries({ queryKey: ['forms'] })
    },
  })
}
