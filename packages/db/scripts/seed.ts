#!/usr/bin/env bun
// Sinh dữ liệu mẫu để trình bày: 2 ví + ~60 giao dịch trải 6 tháng, dùng lại
// đúng 10 danh mục mặc định (BR-14) của một tài khoản đã đăng ký sẵn.
//
// Cách dùng:
//   1. Đăng ký một tài khoản qua giao diện/API như bình thường.
//   2. Lấy user id: bunx wrangler d1 execute expense-tracker-dev --local \
//        --command "SELECT id, email FROM users"
//   3. bun run --cwd packages/db seed -- --user-id=<id> > /tmp/seed.sql
//   4. bunx wrangler d1 execute expense-tracker-dev --local --file=/tmp/seed.sql
//
// Chỉ sinh ra câu SQL (in ra stdout), không tự kết nối D1 — script này chạy
// bằng Bun thuần, không cần wrangler dev.
import { DEFAULT_CATEGORIES, generateId } from '@expense/shared'

const userIdArg = process.argv.find((arg) => arg.startsWith('--user-id='))
const userId = userIdArg?.slice('--user-id='.length)

if (!userId) {
  console.error('Thiếu tham số. Cách dùng: bun run seed -- --user-id=<uuid tài khoản>')
  process.exit(1)
}

// process.exit(1) không dừng type-checker — ép kiểu string tường minh cho các hàm bên dưới.
const ownerId: string = userId

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(items: T[]): T {
  const item = items[randomInt(0, items.length - 1)]
  if (item === undefined) throw new Error('empty_list')
  return item
}

function escapeSql(value: string): string {
  return value.replaceAll("'", "''")
}

function monthsAgoDate(monthsAgo: number, day: number): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() - monthsAgo
  const date = new Date(Date.UTC(year, month, 1))
  date.setUTCDate(day)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const now = Date.now()
const statements: string[] = []

const wallets = [
  { id: generateId(), name: 'Tiền mặt', initialBalance: 2_000_000 },
  { id: generateId(), name: 'Ngân hàng', initialBalance: 15_000_000 },
]

for (const wallet of wallets) {
  statements.push(
    `INSERT INTO wallets (id, user_id, name, initial_balance, currency, note, archived_at, created_at, updated_at) VALUES ('${wallet.id}', '${escapeSql(ownerId)}', '${escapeSql(wallet.name)}', ${wallet.initialBalance}, 'VND', NULL, NULL, ${now}, ${now});`,
  )
}

const expenseNames = DEFAULT_CATEGORIES.filter((c) => c.type === 'expense').map((c) => c.name)
const incomeNames = DEFAULT_CATEGORIES.filter((c) => c.type === 'income').map((c) => c.name)

function insertTransaction(type: 'income' | 'expense', occurredOn: string, amount: number) {
  const wallet = pick(wallets)
  const categoryName = pick(type === 'income' ? incomeNames : expenseNames)
  const id = generateId()
  const categorySubquery = `(SELECT id FROM categories WHERE user_id = '${escapeSql(ownerId)}' AND type = '${type}' AND name = '${escapeSql(categoryName)}' AND archived_at IS NULL LIMIT 1)`
  statements.push(
    `INSERT INTO transactions (id, user_id, wallet_id, category_id, amount, note, occurred_on, created_at, updated_at) VALUES ('${id}', '${escapeSql(ownerId)}', '${wallet.id}', ${categorySubquery}, ${amount}, NULL, '${occurredOn}', ${now}, ${now});`,
  )
}

for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
  const incomeCount = randomInt(1, 2)
  for (let i = 0; i < incomeCount; i++) {
    insertTransaction(
      'income',
      monthsAgoDate(monthsAgo, randomInt(1, 28)),
      randomInt(5, 20) * 1_000_000,
    )
  }

  const expenseCount = randomInt(6, 10)
  for (let i = 0; i < expenseCount; i++) {
    insertTransaction(
      'expense',
      monthsAgoDate(monthsAgo, randomInt(1, 28)),
      randomInt(20, 800) * 1_000,
    )
  }
}

console.log(statements.join('\n'))
console.error(`Đã sinh ${statements.length} câu SQL (2 ví + ${statements.length - 2} giao dịch).`)
