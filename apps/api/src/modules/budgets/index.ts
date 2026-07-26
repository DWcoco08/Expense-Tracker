import { Hono } from 'hono'
import { zValidator } from '../../lib/validate'
import type { AppEnv } from '../../types'
import { createBudgetSchema, listBudgetsQuerySchema, updateBudgetSchema } from './model'
import * as service from './service'

export const budgets = new Hono<AppEnv>()

budgets.get('/', zValidator('query', listBudgetsQuerySchema), async (c) => {
  const { month } = c.req.valid('query')
  const items = await service.listBudgets(c.get('db'), c.get('userId'), month)
  return c.json({ items })
})

budgets.post('/', zValidator('json', createBudgetSchema), async (c) => {
  const budget = await service.createBudget(c.get('db'), c.get('userId'), c.req.valid('json'))
  return c.json(budget, 201)
})

budgets.patch('/:id', zValidator('json', updateBudgetSchema), async (c) => {
  const budget = await service.updateBudget(
    c.get('db'),
    c.get('userId'),
    c.req.param('id'),
    c.req.valid('json'),
  )
  return c.json(budget)
})

budgets.delete('/:id', async (c) => {
  await service.deleteBudget(c.get('db'), c.get('userId'), c.req.param('id'))
  return c.body(null, 204)
})
