import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  repo: {
    findById: vi.fn(),
    findDetailById: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    list: vi.fn(),
    listAllForExport: vi.fn(),
  },
  users: { getProfile: vi.fn() },
  wallets: { assertUsable: vi.fn() },
  categories: { assertUsable: vi.fn() },
  budgets: { notifyIfExceeded: vi.fn() },
}))

vi.mock('../src/modules/transactions/repo', () => mocks.repo)
vi.mock('../src/modules/users/service', () => mocks.users)
vi.mock('../src/modules/wallets/service', () => mocks.wallets)
vi.mock('../src/modules/categories/service', () => mocks.categories)
vi.mock('../src/modules/budgets/service', () => mocks.budgets)

import * as transactionsService from '../src/modules/transactions/service'

const detail = {
  id: 'transaction-1',
  amount: 500,
  note: 'Lunch',
  occurredOn: '2026-08-22',
  walletId: 'wallet-1',
  walletName: 'Cash',
  categoryId: 'category-1',
  categoryName: 'Food',
  categoryType: 'expense' as const,
  categoryIcon: 'utensils',
  categoryColor: '#f59e0b',
}

describe('transactions service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.users.getProfile.mockResolvedValue({ timezone: 'Asia/Ho_Chi_Minh' })
    mocks.budgets.notifyIfExceeded.mockResolvedValue(undefined)
    mocks.repo.findDetailById.mockResolvedValue(detail)
    mocks.repo.findById.mockResolvedValue(detail)
  })

  it('creates a transaction after validating ownership and derives its response type from category', async () => {
    const result = await transactionsService.createTransaction({} as never, 'user-1', {
      amount: 500,
      walletId: 'wallet-1',
      categoryId: 'category-1',
      occurredOn: '2026-08-22',
    })

    expect(mocks.wallets.assertUsable).toHaveBeenCalledWith({}, 'user-1', 'wallet-1')
    expect(mocks.categories.assertUsable).toHaveBeenCalledWith({}, 'user-1', 'category-1')
    expect(mocks.repo.insert).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ userId: 'user-1', amount: 500 }),
    )
    expect(result.type).toBe('expense')
  })

  it('clamps list results to the maximum page size and returns a cursor', async () => {
    mocks.repo.list.mockResolvedValue(
      Array.from({ length: 101 }, (_, index) => ({ ...detail, id: `transaction-${index}` })),
    )

    const result = await transactionsService.listTransactions({} as never, 'user-1', {
      limit: 101,
    })

    expect(mocks.repo.list).toHaveBeenCalledWith(
      {},
      'user-1',
      expect.objectContaining({ limit: 100 }),
    )
    expect(result.items).toHaveLength(100)
    expect(result.nextCursor).toEqual(expect.any(String))
  })

  it('returns not found when another user addresses the transaction', async () => {
    mocks.repo.findDetailById.mockResolvedValue(null)

    await expect(
      transactionsService.getTransaction({} as never, 'user-2', 'transaction-1'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
