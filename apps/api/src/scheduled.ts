import { DEFAULT_TIMEZONE } from '@expense/shared'
import { todayInTimezone } from './lib/clock'
import { createDb } from './lib/db'
import * as recurringService from './modules/recurring/service'
import type { Env } from './types'

// Cron chạy một giờ UTC cố định toàn hệ thống (xem wrangler.toml [triggers]), không
// theo múi giờ riêng từng người dùng — đây chỉ để chọn tập định kỳ "tới hạn ở mức
// toàn cục". Ngày giao dịch thực tế vẫn tính theo múi giờ chủ sở hữu, xem service.ts.
export async function scheduled(
  _controller: ScheduledController,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  const db = createDb(env)
  const globalToday = todayInTimezone(DEFAULT_TIMEZONE)
  await recurringService.runDue(db, globalToday)
}
