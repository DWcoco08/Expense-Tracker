import type { CategoryType } from '@expense/shared'
import { AppError, DEFAULT_CATEGORIES } from '@expense/shared'
import { generateId } from '../../lib/id'
import type { Database } from '../../types'
import type { CreateCategoryInput, UpdateCategoryInput } from './model'
import * as repo from './repo'

// Gọi từ auth/service.ts lúc đăng ký — BR-14
export async function createDefaultCategories(db: Database, userId: string, now: number) {
  const rows = DEFAULT_CATEGORIES.map((category) => ({
    id: generateId(),
    userId,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
    createdAt: now,
  }))
  await repo.insertMany(db, rows)
}

export async function listCategories(db: Database, userId: string, type?: CategoryType) {
  return repo.list(db, userId, type)
}

export async function getCategory(db: Database, userId: string, id: string) {
  const category = await repo.findById(db, userId, id)
  if (!category) throw new AppError('NOT_FOUND', 'category_not_found')
  return category
}

export async function createCategory(db: Database, userId: string, input: CreateCategoryInput) {
  const existing = await repo.findActiveByTypeAndName(db, userId, input.type, input.name)
  if (existing) throw new AppError('DUPLICATE_NAME', 'category_name_taken')

  return repo.insert(db, {
    id: generateId(),
    userId,
    name: input.name,
    type: input.type,
    icon: input.icon ?? null,
    color: input.color ?? null,
    createdAt: Date.now(),
  })
}

export async function updateCategory(
  db: Database,
  userId: string,
  id: string,
  input: UpdateCategoryInput,
) {
  const existing = await getCategory(db, userId, id)

  if (input.type !== undefined && input.type !== existing.type) {
    throw new AppError('CATEGORY_TYPE_IMMUTABLE', 'category_type_immutable')
  }

  if (input.name && input.name !== existing.name) {
    const nameTaken = await repo.findActiveByTypeAndName(db, userId, existing.type, input.name)
    if (nameTaken) throw new AppError('DUPLICATE_NAME', 'category_name_taken')
  }

  await repo.update(
    db,
    userId,
    id,
    { name: input.name, icon: input.icon, color: input.color },
    Date.now(),
  )
  return getCategory(db, userId, id)
}

export async function deleteCategory(db: Database, userId: string, id: string) {
  await getCategory(db, userId, id)

  const count = await repo.countTransactions(db, id)
  if (count > 0) throw new AppError('CATEGORY_HAS_TRANSACTIONS', 'category_has_transactions')

  await repo.remove(db, userId, id)
}

export async function archiveCategory(db: Database, userId: string, id: string) {
  await getCategory(db, userId, id)
  await repo.setArchived(db, userId, id, Date.now())
  return getCategory(db, userId, id)
}
