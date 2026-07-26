import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as budgetsApi from './api'

const BUDGETS_KEY = ['budgets']

export function useBudgets(month: string) {
  return useQuery({
    queryKey: [...BUDGETS_KEY, { month }],
    queryFn: () => budgetsApi.listBudgets(month),
  })
}

function useInvalidateBudgets() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: BUDGETS_KEY })
}

export function useCreateBudget() {
  const invalidate = useInvalidateBudgets()
  return useMutation({ mutationFn: budgetsApi.createBudget, onSuccess: invalidate })
}

export function useUpdateBudget() {
  const invalidate = useInvalidateBudgets()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: budgetsApi.UpdateBudgetInput }) =>
      budgetsApi.updateBudget(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteBudget() {
  const invalidate = useInvalidateBudgets()
  return useMutation({ mutationFn: budgetsApi.deleteBudget, onSuccess: invalidate })
}
