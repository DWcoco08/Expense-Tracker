import { Hono } from 'hono'
import { createDb } from './lib/db'
import { requireAuth } from './middleware/auth'
import { notFound, onError } from './middleware/error'
import { auth } from './modules/auth'
import { users } from './modules/users'
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

v1.route('/auth', auth)

// Mọi route ngoài /v1/auth/* và /v1/health yêu cầu phiên hợp lệ (architecture.md mục 5).
// Các module sau (users, wallets, categories, transactions, stats) mount vào đây.
const protectedRoutes = new Hono<AppEnv>()
protectedRoutes.use('*', requireAuth)
protectedRoutes.route('/me', users)

v1.route('/', protectedRoutes)

app.route('/v1', v1)

app.onError(onError)
app.notFound(notFound)

export default app
