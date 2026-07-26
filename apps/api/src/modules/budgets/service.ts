import { AppError, generateId } from '@expense/shared'
import type { Database } from '../../types'
import * as categoriesService from '../categories/service'
import type { CreateBudgetInput, UpdateBudgetInput } from './model'
import * as repo from './repo'

export async function listBudgets(db: Database, userId: string, month: string) {
  const [rows, spentByCategory] = await Promise.all([
    repo.listByMonth(db, userId, month),
    repo.spentByCategoryInMonth(db, userId, month),
  ])

  return rows.map((row) => ({
    ...row,
    spent: spentByCategory.get(row.categoryId) ?? 0,
  }))
}

export async function getBudget(db: Database, userId: string, id: string) {
  const budget = await repo.findById(db, userId, id)
  if (!budget) throw new AppError('NOT_FOUND', 'budget_not_found')
  return budget
}

export async function createBudget(db: Database, userId: string, input: CreateBudgetInput) {
  const category = await categoriesService.assertUsable(db, userId, input.categoryId)
  if (category.type !== 'expense') {
    throw new AppError('BUDGET_CATEGORY_TYPE_INVALID', 'budget_category_type_invalid')
  }

  const existing = await repo.findByCategoryMonth(db, userId, input.categoryId, input.month)
  if (existing) throw new AppError('BUDGET_EXISTS', 'budget_exists')

  return repo.insert(db, {
    id: generateId(),
    userId,
    categoryId: input.categoryId,
    month: input.month,
    amountLimit: input.amountLimit,
    createdAt: Date.now(),
  })
}

export async function updateBudget(
  db: Database,
  userId: string,
  id: string,
  input: UpdateBudgetInput,
) {
  await getBudget(db, userId, id)
  await repo.update(db, userId, id, input.amountLimit, Date.now())
  return getBudget(db, userId, id)
}

export async function deleteBudget(db: Database, userId: string, id: string) {
  await getBudget(db, userId, id)
  await repo.remove(db, userId, id)
}
