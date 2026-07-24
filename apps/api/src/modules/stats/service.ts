import { AppError, STATS_OVERVIEW_MAX_MONTHS } from '@expense/shared'
import { todayInTimezone } from '../../lib/clock'
import type { Database } from '../../types'
import * as transactionsService from '../transactions/service'
import * as usersService from '../users/service'
import { daysBetweenMonths, monthRange, monthsBetween } from './month'
import * as repo from './repo'

function currentMonth(timezone: string): string {
  return todayInTimezone(timezone).slice(0, 7)
}

export async function getDashboard(db: Database, userId: string, monthInput: string | undefined) {
  const profile = await usersService.getProfile(db, userId)
  const month = monthInput ?? currentMonth(profile.timezone)
  const { from, toExclusive } = monthRange(month)

  const [monthTotals, activeWalletTotals, initialBalance, expenseByCategory, recent] =
    await Promise.all([
      repo.totalsInRange(db, userId, from, toExclusive),
      repo.totalsForActiveWallets(db, userId),
      repo.totalInitialBalance(db, userId),
      repo.expenseByCategoryInRange(db, userId, from, toExclusive),
      transactionsService.listTransactions(db, userId, { limit: 5 }),
    ])

  const totalBalance = initialBalance + activeWalletTotals.income - activeWalletTotals.expense

  return {
    month,
    totalIncome: monthTotals.income,
    totalExpense: monthTotals.expense,
    net: monthTotals.income - monthTotals.expense,
    totalBalance,
    expenseByCategory,
    recentTransactions: recent.items,
  }
}

export async function getOverview(db: Database, userId: string, from: string, to: string) {
  if (from > to) throw new AppError('VALIDATION', 'from_after_to')

  const months = monthsBetween(from, to)
  if (months.length > STATS_OVERVIEW_MAX_MONTHS) {
    throw new AppError('VALIDATION', 'range_too_long')
  }

  const { from: rangeFrom } = monthRange(from)
  const { toExclusive: rangeToExclusive } = monthRange(to)

  const [monthly, topExpenseCategories, totalTransactions] = await Promise.all([
    repo.monthlyTotalsInRange(db, userId, rangeFrom, rangeToExclusive),
    repo.expenseByCategoryInRange(db, userId, rangeFrom, rangeToExclusive, 5),
    repo.countTransactionsInRange(db, userId, rangeFrom, rangeToExclusive),
  ])

  const byMonth = new Map(monthly.map((row) => [row.month, row]))
  const filledMonthly = months.map((month) => {
    const found = byMonth.get(month)
    return { month, income: found?.income ?? 0, expense: found?.expense ?? 0 }
  })

  const totalExpense = filledMonthly.reduce((sum, row) => sum + row.expense, 0)
  const days = daysBetweenMonths(from, to)
  const averageExpensePerDay = days > 0 ? Math.round(totalExpense / days) : 0

  return {
    from,
    to,
    monthly: filledMonthly,
    topExpenseCategories,
    totalTransactions,
    averageExpensePerDay,
  }
}
