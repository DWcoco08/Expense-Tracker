import { Hono } from 'hono'
import { zValidator } from '../../lib/validate'
import type { AppEnv } from '../../types'
import { createWalletSchema, listWalletsQuerySchema, updateWalletSchema } from './model'
import * as service from './service'

export const wallets = new Hono<AppEnv>()

wallets.get('/', zValidator('query', listWalletsQuerySchema), async (c) => {
  const { includeArchived } = c.req.valid('query')
  const items = await service.listWallets(c.get('db'), c.get('userId'), includeArchived)
  return c.json({ items, nextCursor: null })
})

wallets.post('/', zValidator('json', createWalletSchema), async (c) => {
  const wallet = await service.createWallet(c.get('db'), c.get('userId'), c.req.valid('json'))
  return c.json(wallet, 201)
})

wallets.get('/:id', async (c) => {
  const wallet = await service.getWallet(c.get('db'), c.get('userId'), c.req.param('id'))
  return c.json(wallet)
})

wallets.patch('/:id', zValidator('json', updateWalletSchema), async (c) => {
  const wallet = await service.updateWallet(
    c.get('db'),
    c.get('userId'),
    c.req.param('id'),
    c.req.valid('json'),
  )
  return c.json(wallet)
})

wallets.delete('/:id', async (c) => {
  await service.deleteWallet(c.get('db'), c.get('userId'), c.req.param('id'))
  return c.body(null, 204)
})

wallets.post('/:id/archive', async (c) => {
  const wallet = await service.archiveWallet(c.get('db'), c.get('userId'), c.req.param('id'))
  return c.json(wallet)
})

wallets.post('/:id/unarchive', async (c) => {
  const wallet = await service.unarchiveWallet(c.get('db'), c.get('userId'), c.req.param('id'))
  return c.json(wallet)
})
