import { env } from 'cloudflare:workers'
import * as schema from '@expense/db/schema'
import { generateId } from '@expense/shared'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createDb } from '../src/lib/db'

// Test này không kiểm tra business logic — nó xác nhận hạ tầng test (D1 binding
// + migrations + drizzle) hoạt động đúng bên trong Workers runtime thật.
describe('vitest-pool-workers scaffold', () => {
  it('applies migrations and can read/write via the real D1 binding', async () => {
    const db = createDb(env)
    const id = generateId()
    const now = Date.now()

    await db.insert(schema.users).values({
      id,
      email: `${id}@example.test`,
      passwordHash: 'not-a-real-hash',
      name: 'Scaffold Smoke Test',
      timezone: 'Asia/Ho_Chi_Minh',
      baseCurrency: 'VND',
      createdAt: now,
      updatedAt: now,
    })

    const [row] = await db.select().from(schema.users).where(eq(schema.users.id, id))

    expect(row?.name).toBe('Scaffold Smoke Test')
  })
})
