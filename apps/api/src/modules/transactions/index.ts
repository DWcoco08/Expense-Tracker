import { Hono } from 'hono'
import { zValidator } from '../../lib/validate'
import type { AppEnv } from '../../types'
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from './model'
import * as service from './service'

export const transactions = new Hono<AppEnv>()

transactions.get('/', zValidator('query', listTransactionsQuerySchema), async (c) => {
  const result = await service.listTransactions(c.get('db'), c.get('userId'), c.req.valid('query'))
  return c.json(result)
})

transactions.post('/', zValidator('json', createTransactionSchema), async (c) => {
  const transaction = await service.createTransaction(
    c.get('db'),
    c.get('userId'),
    c.req.valid('json'),
  )
  return c.json(transaction, 201)
})

transactions.get('/:id', async (c) => {
  const transaction = await service.getTransaction(c.get('db'), c.get('userId'), c.req.param('id'))
  return c.json(transaction)
})

transactions.patch('/:id', zValidator('json', updateTransactionSchema), async (c) => {
  const transaction = await service.updateTransaction(
    c.get('db'),
    c.get('userId'),
    c.req.param('id'),
    c.req.valid('json'),
  )
  return c.json(transaction)
})

transactions.delete('/:id', async (c) => {
  await service.deleteTransaction(c.get('db'), c.get('userId'), c.req.param('id'))
  return c.body(null, 204)
})
