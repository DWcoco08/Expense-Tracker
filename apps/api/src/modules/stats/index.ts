import { Hono } from 'hono'
import { zValidator } from '../../lib/validate'
import type { AppEnv } from '../../types'
import { dashboardQuerySchema, overviewQuerySchema } from './model'
import * as service from './service'

export const stats = new Hono<AppEnv>()

stats.get('/dashboard', zValidator('query', dashboardQuerySchema), async (c) => {
  const { month } = c.req.valid('query')
  const result = await service.getDashboard(c.get('db'), c.get('userId'), month)
  return c.json(result)
})

stats.get('/overview', zValidator('query', overviewQuerySchema), async (c) => {
  const { from, to } = c.req.valid('query')
  const result = await service.getOverview(c.get('db'), c.get('userId'), from, to)
  return c.json(result)
})
