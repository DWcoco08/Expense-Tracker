import { Hono } from 'hono'
import { createDb } from './lib/db'
import { notFound, onError } from './middleware/error'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

app.use('/v1/*', async (c, next) => {
  c.set('db', createDb(c.env))
  await next()
})

const v1 = new Hono<AppEnv>()

v1.get('/health', (c) => {
  return c.json({ status: 'ok', version: c.env.APP_VERSION })
})

app.route('/v1', v1)

app.onError(onError)
app.notFound(notFound)

export default app
