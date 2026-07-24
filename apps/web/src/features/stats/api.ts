import type { Transaction } from '@/features/transactions/api'
import { api } from '@/lib/api'

export interface ExpenseByCategory {
  categoryId: string
  name: string
  color: string | null
  amount: number
}

export interface Dashboard {
  month: string
  totalIncome: number
  totalExpense: number
  net: number
  totalBalance: number
  expenseByCategory: ExpenseByCategory[]
  recentTransactions: Transaction[]
}

export interface MonthlyPoint {
  month: string
  income: number
  expense: number
}

export interface Overview {
  from: string
  to: string
  monthly: MonthlyPoint[]
  topExpenseCategories: ExpenseByCategory[]
  totalTransactions: number
  averageExpensePerDay: number
}

export function getDashboard(month?: string) {
  return api.get<Dashboard>('/stats/dashboard', month ? { month } : undefined)
}

export function getOverview(from: string, to: string) {
  return api.get<Overview>('/stats/overview', { from, to })
}
