import { AppError, generateId } from '@expense/shared'
import type { Database } from '../../types'
import * as categoriesService from '../categories/service'
import * as notificationsService from '../notifications/service'
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

// Gọi sau khi transactions/service.ts tạo một giao dịch chi — chỉ báo đúng một lần
// lúc chi tiêu VƯỢT QUA hạn mức (trước ≤ hạn mức, sau > hạn mức), không báo lặp lại
// ở mỗi giao dịch tiếp theo. Không có budget cho danh mục/tháng đó thì bỏ qua.
export async function notifyIfExceeded(
  db: Database,
  userId: string,
  categoryId: string,
  occurredOn: string,
  amount: number,
) {
  const month = occurredOn.slice(0, 7)
  const budget = await repo.findByCategoryMonth(db, userId, categoryId, month)
  if (!budget) return

  const spentByCategory = await repo.spentByCategoryInMonth(db, userId, month)
  const spentAfter = spentByCategory.get(categoryId) ?? 0
  const spentBefore = spentAfter - amount

  if (spentBefore <= budget.amountLimit && spentAfter > budget.amountLimit) {
    const category = await categoriesService.getCategory(db, userId, categoryId)
    await notificationsService.create(
      db,
      userId,
      'budget_exceeded',
      `Ngân sách "${category.name}" tháng ${month} đã vượt hạn mức`,
    )
  }
}
