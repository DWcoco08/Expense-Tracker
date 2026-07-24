import { Hono } from 'hono'
import { zValidator } from '../../lib/validate'
import type { AppEnv } from '../../types'
import { createCategorySchema, listCategoriesQuerySchema, updateCategorySchema } from './model'
import * as service from './service'

export const categories = new Hono<AppEnv>()

categories.get('/', zValidator('query', listCategoriesQuerySchema), async (c) => {
  const { type } = c.req.valid('query')
  const items = await service.listCategories(c.get('db'), c.get('userId'), type)
  return c.json({ items, nextCursor: null })
})

categories.post('/', zValidator('json', createCategorySchema), async (c) => {
  const category = await service.createCategory(c.get('db'), c.get('userId'), c.req.valid('json'))
  return c.json(category, 201)
})

categories.patch('/:id', zValidator('json', updateCategorySchema), async (c) => {
  const category = await service.updateCategory(
    c.get('db'),
    c.get('userId'),
    c.req.param('id'),
    c.req.valid('json'),
  )
  return c.json(category)
})

categories.delete('/:id', async (c) => {
  await service.deleteCategory(c.get('db'), c.get('userId'), c.req.param('id'))
  return c.body(null, 204)
})

categories.post('/:id/archive', async (c) => {
  const category = await service.archiveCategory(c.get('db'), c.get('userId'), c.req.param('id'))
  return c.json(category)
})
