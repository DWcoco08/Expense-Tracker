import type { RecurringFrequency } from '@expense/shared'
import { AppError, generateId } from '@expense/shared'
import { todayInTimezone } from '../../lib/clock'
import type { Database } from '../../types'
import * as categoriesService from '../categories/service'
import * as notificationsService from '../notifications/service'
import * as transactionsService from '../transactions/service'
import * as usersService from '../users/service'
import * as walletsService from '../wallets/service'
import type { CreateRecurringInput, UpdateRecurringInput } from './model'
import * as repo from './repo'

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// anchorDay giới hạn 1-28 ở tầng service nên luôn là ngày hợp lệ của tháng kế tiếp,
// không cần logic dồn ngày (clamp) khi tháng đích ngắn hơn.
function addMonthKeepingDay(date: string, day: number): string {
  const [yearStr, monthStr] = date.split('-')
  const totalMonths = Number(yearStr) * 12 + (Number(monthStr) - 1) + 1
  const year = Math.floor(totalMonths / 12)
  const month = (totalMonths % 12) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Hàm thuần, không I/O — dễ kiểm thử độc lập với đồng hồ hệ thống.
export function computeNextRunOn(
  current: string,
  frequency: RecurringFrequency,
  anchorDay: number | null,
): string {
  if (frequency === 'daily') return addDays(current, 1)
  if (frequency === 'weekly') return addDays(current, 7)
  return addMonthKeepingDay(current, anchorDay ?? 1)
}

export async function listRecurring(db: Database, userId: string) {
  return repo.listByUser(db, userId)
}

export async function getRecurring(db: Database, userId: string, id: string) {
  const row = await repo.findById(db, userId, id)
  if (!row) throw new AppError('NOT_FOUND', 'recurring_not_found')
  return row
}

export async function createRecurring(db: Database, userId: string, input: CreateRecurringInput) {
  await walletsService.assertUsable(db, userId, input.walletId)
  await categoriesService.assertUsable(db, userId, input.categoryId)

  if (input.endOn && input.endOn < input.startOn) {
    throw new AppError('RECURRING_END_BEFORE_START', 'recurring_end_before_start')
  }
  if (
    input.frequency === 'monthly' &&
    (!input.anchorDay || input.anchorDay < 1 || input.anchorDay > 28)
  ) {
    throw new AppError('VALIDATION', 'anchor_day_required_for_monthly')
  }

  const id = generateId()
  const now = Date.now()
  return repo.insert(db, {
    id,
    userId,
    walletId: input.walletId,
    categoryId: input.categoryId,
    amount: input.amount,
    note: input.note ?? null,
    frequency: input.frequency,
    anchorDay: input.anchorDay ?? null,
    startOn: input.startOn,
    endOn: input.endOn ?? null,
    nextRunOn: input.startOn,
    createdAt: now,
  })
}

export async function updateRecurring(
  db: Database,
  userId: string,
  id: string,
  input: UpdateRecurringInput,
) {
  const existing = await getRecurring(db, userId, id)
  const endOn = input.endOn === undefined ? existing.endOn : input.endOn

  if (endOn && endOn < existing.startOn) {
    throw new AppError('RECURRING_END_BEFORE_START', 'recurring_end_before_start')
  }

  await repo.update(db, userId, id, { amount: input.amount, note: input.note, endOn }, Date.now())
  return getRecurring(db, userId, id)
}

export async function deleteRecurring(db: Database, userId: string, id: string) {
  await getRecurring(db, userId, id)
  await repo.remove(db, userId, id)
}

export async function archiveRecurring(db: Database, userId: string, id: string) {
  await getRecurring(db, userId, id)
  await repo.setArchived(db, userId, id, Date.now())
  return getRecurring(db, userId, id)
}

export async function unarchiveRecurring(db: Database, userId: string, id: string) {
  await getRecurring(db, userId, id)
  await repo.setArchived(db, userId, id, null)
  return getRecurring(db, userId, id)
}

// Được gọi bởi scheduled() — xem apps/api/src/scheduled.ts. Ngày giao dịch tính theo
// múi giờ của CHỦ SỞ HỮU định kỳ đó (không theo giờ chạy cron) để không lệch với
// kiểm tra FUTURE_DATE của chính transactions/service.ts.
export async function runDue(db: Database, globalToday: string) {
  const due = await repo.findDue(db, globalToday)

  const results = await Promise.allSettled(due.map((item) => processDueItem(db, item)))
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error({ event: 'recurring.run_failed', id: due[index]?.id })
    }
  })
}

async function processDueItem(
  db: Database,
  item: Awaited<ReturnType<typeof repo.findDue>>[number],
) {
  try {
    const profile = await usersService.getProfile(db, item.userId)
    const occurredOn = todayInTimezone(profile.timezone)

    await transactionsService.createTransaction(db, item.userId, {
      amount: item.amount,
      walletId: item.walletId,
      categoryId: item.categoryId,
      occurredOn,
      note: item.note,
    })

    const category = await categoriesService.getCategory(db, item.userId, item.categoryId)
    await notificationsService.create(
      db,
      item.userId,
      'recurring_materialized',
      `Đã tự động ghi nhận giao dịch định kỳ "${category.name}" — ${item.amount.toLocaleString('vi-VN')}đ`,
    )
  } catch (err) {
    if (
      err instanceof AppError &&
      (err.code === 'WALLET_ARCHIVED' || err.code === 'CATEGORY_ARCHIVED')
    ) {
      console.error({ event: 'recurring.skipped', id: item.id, code: err.code })
    } else {
      throw err
    }
  }

  await repo.advance(db, item.id, computeNextRunOn(item.nextRunOn, item.frequency, item.anchorDay))
}
