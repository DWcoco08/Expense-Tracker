import { Hono } from 'hono'
import { zValidator } from '../../lib/validate'
import type { AppEnv } from '../../types'
import { changePasswordSchema, updateProfileSchema } from './model'
import * as service from './service'

export const users = new Hono<AppEnv>()

users.get('/', async (c) => {
  const user = await service.getProfile(c.get('db'), c.get('userId'))
  c.header('Cache-Control', 'no-store')
  return c.json(user)
})

users.patch('/', zValidator('json', updateProfileSchema), async (c) => {
  const user = await service.updateProfile(c.get('db'), c.get('userId'), c.req.valid('json'))
  c.header('Cache-Control', 'no-store')
  return c.json(user)
})

users.post('/password', zValidator('json', changePasswordSchema), async (c) => {
  await service.changePassword(
    c.get('db'),
    c.get('userId'),
    c.get('sessionId'),
    c.req.valid('json'),
    c.env.PASSWORD_PEPPER,
  )
  c.header('Cache-Control', 'no-store')
  return c.json({})
})
