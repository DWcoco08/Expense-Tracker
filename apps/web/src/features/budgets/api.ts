import { api } from '@/lib/api'

export interface Budget {
  id: string
  categoryId: string
  categoryName: string
  categoryColor: string | null
  month: string
  amountLimit: number
  spent: number
}

export interface CreateBudgetInput {
  categoryId: string
  month: string
  amountLimit: number
}

export interface UpdateBudgetInput {
  amountLimit: number
}

export function listBudgets(month: string) {
  return api.get<{ items: Budget[] }>('/budgets', { month })
}

export function createBudget(input: CreateBudgetInput) {
  return api.post<Budget>('/budgets', input)
}

export function updateBudget(id: string, input: UpdateBudgetInput) {
  return api.patch<Budget>(`/budgets/${id}`, input)
}

export function deleteBudget(id: string) {
  return api.delete<undefined>(`/budgets/${id}`)
}
