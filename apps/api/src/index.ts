import { Hono } from 'hono'
import { createDb } from './lib/db'
import { requireAuth } from './middleware/auth'
import { notFound, onError } from './middleware/error'
import { auth } from './modules/auth'
import { budgets } from './modules/budgets'
import { categories } from './modules/categories'
import { recurring } from './modules/recurring'
import { stats } from './modules/stats'
import { transactions } from './modules/transactions'
import { users } from './modules/users'
import { wallets } from './modules/wallets'
import { scheduled } from './scheduled'
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
// requireAuth gắn theo TỪNG tiền tố cụ thể, không dùng '*' — nếu dùng '*' thì một
// route không tồn tại (vd /v1/khong-ton-tai) sẽ bị middleware này chặn trước và trả
// 401 thay vì 404, vì Hono chạy middleware '*' trước khi biết route có khớp hay không.
const protectedRoutes = new Hono<AppEnv>()
protectedRoutes.use('/me/*', requireAuth)
protectedRoutes.use('/wallets/*', requireAuth)
protectedRoutes.use('/categories/*', requireAuth)
protectedRoutes.use('/transactions/*', requireAuth)
protectedRoutes.use('/stats/*', requireAuth)
protectedRoutes.use('/budgets/*', requireAuth)
protectedRoutes.use('/recurring/*', requireAuth)
protectedRoutes.route('/me', users)
protectedRoutes.route('/wallets', wallets)
protectedRoutes.route('/categories', categories)
protectedRoutes.route('/transactions', transactions)
protectedRoutes.route('/stats', stats)
protectedRoutes.route('/budgets', budgets)
protectedRoutes.route('/recurring', recurring)

v1.route('/', protectedRoutes)

app.route('/v1', v1)

app.onError(onError)
app.notFound(notFound)

export default {
  fetch: app.fetch,
  scheduled,
}
