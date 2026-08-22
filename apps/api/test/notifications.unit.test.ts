import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  repo: {
    insert: vi.fn(),
    list: vi.fn(),
    countUnread: vi.fn(),
    findById: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

vi.mock('../src/modules/notifications/repo', () => mocks.repo)

import * as notificationsService from '../src/modules/notifications/service'

describe('notifications service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a notification owned by the requested user', async () => {
    await notificationsService.create({} as never, 'user-1', 'budget_exceeded', 'Budget exceeded')

    expect(mocks.repo.insert).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: 'user-1',
        type: 'budget_exceeded',
        message: 'Budget exceeded',
        id: expect.any(String),
        createdAt: expect.any(Number),
      }),
    )
  })

  it('clamps list limits and returns the next cursor for another page', async () => {
    mocks.repo.list.mockResolvedValue(
      Array.from({ length: 101 }, (_, index) => ({
        id: `notification-${index}`,
        createdAt: index,
      })),
    )
    mocks.repo.countUnread.mockResolvedValue(101)

    const result = await notificationsService.listNotifications({} as never, 'user-1', {
      limit: 100,
    })

    expect(result.items).toHaveLength(100)
    expect(result.nextCursor).toEqual(expect.any(String))
    expect(result.unreadCount).toBe(101)
  })

  it('does not mark another user notification as read', async () => {
    mocks.repo.findById.mockResolvedValue(null)

    await expect(
      notificationsService.markRead({} as never, 'user-2', 'notification-1'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(mocks.repo.markRead).not.toHaveBeenCalled()
  })

  it('marks all notifications only for the requested user', async () => {
    await notificationsService.markAllRead({} as never, 'user-1')

    expect(mocks.repo.markAllRead).toHaveBeenCalledWith({}, 'user-1', expect.any(Number))
  })
})
