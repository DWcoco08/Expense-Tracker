import { users } from '@expense/db/schema'
import { eq } from 'drizzle-orm'
import type { Database } from '../../types'

export async function findById(db: Database, id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return rows[0] ?? null
}

export async function updateProfile(
  db: Database,
  id: string,
  data: { name?: string; timezone?: string },
  updatedAt: number,
) {
  await db
    .update(users)
    .set({ ...data, updatedAt })
    .where(eq(users.id, id))
}
