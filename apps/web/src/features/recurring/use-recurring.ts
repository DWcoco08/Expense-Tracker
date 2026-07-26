import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as recurringApi from './api'

const RECURRING_KEY = ['recurring']

export function useRecurringList() {
  return useQuery({ queryKey: RECURRING_KEY, queryFn: recurringApi.listRecurring })
}

function useInvalidateRecurring() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: RECURRING_KEY })
}

export function useCreateRecurring() {
  const invalidate = useInvalidateRecurring()
  return useMutation({ mutationFn: recurringApi.createRecurring, onSuccess: invalidate })
}

export function useUpdateRecurring() {
  const invalidate = useInvalidateRecurring()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: recurringApi.UpdateRecurringInput }) =>
      recurringApi.updateRecurring(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteRecurring() {
  const invalidate = useInvalidateRecurring()
  return useMutation({ mutationFn: recurringApi.deleteRecurring, onSuccess: invalidate })
}

export function useArchiveRecurring() {
  const invalidate = useInvalidateRecurring()
  return useMutation({ mutationFn: recurringApi.archiveRecurring, onSuccess: invalidate })
}

export function useUnarchiveRecurring() {
  const invalidate = useInvalidateRecurring()
  return useMutation({ mutationFn: recurringApi.unarchiveRecurring, onSuccess: invalidate })
}
