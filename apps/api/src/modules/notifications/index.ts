import { Hono } from 'hono'
import { zValidator } from '../../lib/validate'
import type { AppEnv } from '../../types'
import { listNotificationsQuerySchema } from './model'
import * as service from './service'

export const notifications = new Hono<AppEnv>()

notifications.get('/', zValidator('query', listNotificationsQuerySchema), async (c) => {
  const result = await service.listNotifications(c.get('db'), c.get('userId'), c.req.valid('query'))
  return c.json(result)
})

notifications.post('/:id/read', async (c) => {
  await service.markRead(c.get('db'), c.get('userId'), c.req.param('id'))
  return c.body(null, 204)
})

notifications.post('/read-all', async (c) => {
  await service.markAllRead(c.get('db'), c.get('userId'))
  return c.body(null, 204)
})
