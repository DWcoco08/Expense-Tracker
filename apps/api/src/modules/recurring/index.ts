import { Hono } from 'hono'
import { zValidator } from '../../lib/validate'
import type { AppEnv } from '../../types'
import { createRecurringSchema, updateRecurringSchema } from './model'
import * as service from './service'

export const recurring = new Hono<AppEnv>()

recurring.get('/', async (c) => {
  const items = await service.listRecurring(c.get('db'), c.get('userId'))
  return c.json({ items })
})

recurring.post('/', zValidator('json', createRecurringSchema), async (c) => {
  const item = await service.createRecurring(c.get('db'), c.get('userId'), c.req.valid('json'))
  return c.json(item, 201)
})

recurring.patch('/:id', zValidator('json', updateRecurringSchema), async (c) => {
  const item = await service.updateRecurring(
    c.get('db'),
    c.get('userId'),
    c.req.param('id'),
    c.req.valid('json'),
  )
  return c.json(item)
})

recurring.delete('/:id', async (c) => {
  await service.deleteRecurring(c.get('db'), c.get('userId'), c.req.param('id'))
  return c.body(null, 204)
})

recurring.post('/:id/archive', async (c) => {
  const item = await service.archiveRecurring(c.get('db'), c.get('userId'), c.req.param('id'))
  return c.json(item)
})

recurring.post('/:id/unarchive', async (c) => {
  const item = await service.unarchiveRecurring(c.get('db'), c.get('userId'), c.req.param('id'))
  return c.json(item)
})
