import type * as schema from '@expense/db/schema'
import type { drizzle } from 'drizzle-orm/d1'

export interface Env {
  DB: D1Database
  JWT_SECRET: string
  PASSWORD_PEPPER: string
  ENVIRONMENT: string
  APP_VERSION: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REDIRECT_URI: string
}

export type Database = ReturnType<typeof drizzle<typeof schema>>

export interface Variables {
  db: Database
  userId: string
  sessionId: string
}

export type AppEnv = {
  Bindings: Env
  Variables: Variables
}
