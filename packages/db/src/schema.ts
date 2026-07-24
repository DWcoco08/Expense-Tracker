import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    timezone: text('timezone').notNull(),
    baseCurrency: text('base_currency').notNull(),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => [uniqueIndex('users_email_uq').on(table.email)],
)

export const usersRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
  categories: many(categories),
  transactions: many(transactions),
  sessions: many(sessions),
}))

// Refresh token đã dùng bị xoay vòng ngay lập tức — xem BR-16
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: integer('expires_at', { mode: 'number' }).notNull(),
    revokedAt: integer('revoked_at', { mode: 'number' }),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (table) => [index('sessions_user_idx').on(table.userId)],
)

// Đếm lần đăng nhập thất bại phục vụ NFR-04. Không có cột user_id vì
// tài khoản có tồn tại hay không cũng phải tính vào giới hạn tần suất.
export const loginAttempts = sqliteTable(
  'login_attempts',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    ip: text('ip').notNull(),
    attemptedAt: integer('attempted_at', { mode: 'number' }).notNull(),
  },
  (table) => [index('login_attempts_lookup_idx').on(table.email, table.ip, table.attemptedAt)],
)

// Không có cột balance — số dư luôn tính từ giao dịch, xem srs.md mục 2.1
export const wallets = sqliteTable(
  'wallets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    initialBalance: integer('initial_balance', { mode: 'number' }).notNull(),
    currency: text('currency').notNull(),
    note: text('note'),
    archivedAt: integer('archived_at', { mode: 'number' }),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => [
    uniqueIndex('wallets_name_uq')
      .on(table.userId, table.name)
      .where(sql`${table.archivedAt} is null`),
  ],
)

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  transactions: many(transactions),
}))

// type không sửa được sau khi tạo — xem srs.md mục 2.3, BR-12
export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type', { enum: ['income', 'expense'] }).notNull(),
    icon: text('icon'),
    color: text('color'),
    archivedAt: integer('archived_at', { mode: 'number' }),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => [
    uniqueIndex('categories_name_uq')
      .on(table.userId, table.type, table.name)
      .where(sql`${table.archivedAt} is null`),
  ],
)

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
}))

// Không có cột type — thu/chi suy từ category, xem srs.md mục 2.3
export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    walletId: text('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'restrict' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    amount: integer('amount', { mode: 'number' }).notNull(),
    note: text('note'),
    occurredOn: text('occurred_on').notNull(),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => [
    index('tx_user_date_idx').on(table.userId, table.occurredOn, table.id),
    index('tx_wallet_idx').on(table.walletId),
    index('tx_category_idx').on(table.categoryId),
  ],
)

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  wallet: one(wallets, { fields: [transactions.walletId], references: [wallets.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
}))
