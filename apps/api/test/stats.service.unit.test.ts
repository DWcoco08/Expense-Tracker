import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  repo: {
    totalsInRange: vi.fn(),
    totalsForActiveWallets: vi.fn(),
    totalInitialBalance: vi.fn(),
    expenseByCategoryInRange: vi.fn(),
    monthlyTotalsInRange: vi.fn(),
    countTransactionsInRange: vi.fn(),
  },
  users: { getProfile: vi.fn() },
  transactions: { listTransactions: vi.fn() },
}))

vi.mock('../src/modules/stats/repo', () => mocks.repo)
vi.mock('../src/modules/users/service', () => mocks.users)
vi.mock('../src/modules/transactions/service', () => mocks.transactions)

import * as statsService from '../src/modules/stats/service'

describe('stats service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.users.getProfile.mockResolvedValue({ timezone: 'Asia/Ho_Chi_Minh' })
    mocks.repo.totalsInRange.mockResolvedValue({ income: 1000, expense: 250 })
    mocks.repo.totalsForActiveWallets.mockResolvedValue({ income: 5000, expense: 1000 })
    mocks.repo.totalInitialBalance.mockResolvedValue(2000)
    mocks.repo.expenseByCategoryInRange.mockResolvedValue([])
    mocks.transactions.listTransactions.mockResolvedValue({ items: [] })
    mocks.repo.monthlyTotalsInRange.mockResolvedValue([])
    mocks.repo.countTransactionsInRange.mockResolvedValue(0)
  })

  it('calculates dashboard totals and uses the requested month', async () => {
    const result = await statsService.getDashboard({} as never, 'user-1', '2026-08')

    expect(result).toMatchObject({
      month: '2026-08',
      totalIncome: 1000,
      totalExpense: 250,
      net: 750,
      totalBalance: 6000,
    })
    expect(mocks.repo.totalsInRange).toHaveBeenCalledWith({}, 'user-1', '2026-08-01', '2026-09-01')
  })

  it('rejects an overview longer than 24 months', async () => {
    await expect(
      statsService.getOverview({} as never, 'user-1', '2024-01', '2026-01'),
    ).rejects.toMatchObject({ code: 'VALIDATION' })

    expect(mocks.repo.monthlyTotalsInRange).not.toHaveBeenCalled()
  })
})
