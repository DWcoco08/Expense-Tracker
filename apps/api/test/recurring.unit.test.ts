import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  repo: {
    findDue: vi.fn(),
    advance: vi.fn(),
  },
  users: { getProfile: vi.fn() },
  transactions: { createTransaction: vi.fn() },
  categories: { getCategory: vi.fn() },
  notifications: { create: vi.fn() },
}))

vi.mock('../src/modules/recurring/repo', () => mocks.repo)
vi.mock('../src/modules/users/service', () => mocks.users)
vi.mock('../src/modules/transactions/service', () => mocks.transactions)
vi.mock('../src/modules/categories/service', () => mocks.categories)
vi.mock('../src/modules/notifications/service', () => mocks.notifications)

import * as recurringService from '../src/modules/recurring/service'

describe('recurring service', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['daily', null, '2026-08-23'],
    ['weekly', null, '2026-08-29'],
    ['monthly', 15, '2026-09-15'],
  ] as const)('computes the next %s run', (frequency, anchorDay, expected) => {
    expect(recurringService.computeNextRunOn('2026-08-22', frequency, anchorDay)).toBe(expected)
  })

  it('materializes due transactions, notifies, and advances the schedule', async () => {
    mocks.repo.findDue.mockResolvedValue([
      {
        id: 'recurring-1',
        userId: 'user-1',
        walletId: 'wallet-1',
        categoryId: 'category-1',
        amount: 250000,
        note: 'Internet',
        frequency: 'monthly',
        anchorDay: 15,
        nextRunOn: '2026-08-15',
      },
    ])
    mocks.users.getProfile.mockResolvedValue({ timezone: 'Asia/Ho_Chi_Minh' })
    mocks.categories.getCategory.mockResolvedValue({ name: 'Hoá đơn' })

    await recurringService.runDue({} as never, '2026-08-22')

    expect(mocks.transactions.createTransaction).toHaveBeenCalledWith(
      {},
      'user-1',
      expect.objectContaining({
        amount: 250000,
        walletId: 'wallet-1',
        categoryId: 'category-1',
        note: 'Internet',
        occurredOn: expect.any(String),
      }),
    )
    expect(mocks.notifications.create).toHaveBeenCalledWith(
      {},
      'user-1',
      'recurring_materialized',
      expect.stringContaining('Hoá đơn'),
    )
    expect(mocks.repo.advance).toHaveBeenCalledWith({}, 'recurring-1', '2026-09-15')
  })
})
