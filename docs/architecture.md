# Kiến trúc hệ thống

Thành phần công nghệ, tổ chức mã nguồn, luồng xử lý và lược đồ cơ sở dữ liệu.

---

## 1. Công nghệ

| Lớp | Công nghệ |
|---|---|
| Runtime | Cloudflare Workers |
| API | Hono |
| Cơ sở dữ liệu | Cloudflare D1 (SQLite) + Drizzle ORM |
| Kiểm tra dữ liệu | Zod |
| Frontend | React + Vite + TypeScript, TanStack Query |
| Giao diện | Tailwind CSS, Recharts, component tự viết trong `components/ui/` |
| Monorepo | Bun workspace + Turborepo, Biome |

D1 dựa trên SQLite, không có các kiểu `DECIMAL`, `BOOLEAN`, `TIMESTAMP`. Quy ước ánh xạ:

| Loại dữ liệu | Kiểu lưu trữ |
|---|---|
| Giá trị tiền tệ | `INTEGER`, đơn vị đồng |
| Giá trị luận lý | `INTEGER` 0/1 |
| Thời điểm | `INTEGER`, Unix ms, UTC |
| Ngày lịch | `TEXT`, `YYYY-MM-DD` |

---

## 2. Sơ đồ triển khai

```
Trình duyệt — React SPA
        │
        │  HTTPS · cookie phiên HttpOnly
        ▼
Cloudflare Worker
        │
        ├──  /        →  Static assets (bản build của SPA)
        ├──  /v1/*    →  Hono API
        │
        │  D1 binding
        ▼
Cloudflare D1 — SQLite
```

Một Worker phục vụ cả giao diện lẫn API, do đó frontend và backend cùng origin: cookie phiên hoạt động không cần cấu hình CORS và không chịu giới hạn cookie cross-site của trình duyệt.

---

## 3. Tổ chức mã nguồn

```
apps/
├── api/
│   ├── src/
│   │   ├── index.ts           điểm vào Worker: middleware, mount module, static assets
│   │   ├── middleware/        auth, error, rate-limit
│   │   ├── modules/           auth, users, wallets, categories, transactions, stats
│   │   └── lib/               password, jwt, clock, money
│   └── wrangler.toml
└── web/
    └── src/
        ├── routes/            (public) và (app)
        ├── components/
        ├── features/          hook và lời gọi API theo chức năng
        └── lib/api.ts         lớp bọc fetch + parseApiError()
packages/
├── db/                        lược đồ Drizzle + migration SQL
└── shared/                    kiểu dữ liệu, mã lỗi, hằng số, schema Zod dùng chung
docs/
```

Chiều phụ thuộc: `web → shared`, `api → db, shared`, `db → shared`, `shared` không phụ thuộc package nào. Phụ thuộc vòng là lỗi kiến trúc.

Khuôn của một module backend: xem `standards.md` mục 3.

---

## 4. Luồng xử lý yêu cầu

| Bước | Thành phần | Xử lý | Sai lệch |
|---|---|---|---|
| 1 | Middleware error | Bao toàn bộ chuỗi xử lý | Ngoại lệ không xác định → `500 INTERNAL` |
| 2 | Middleware auth | Xác thực cookie, gắn `userId` vào context | Không có phiên hợp lệ → `401 UNAUTHENTICATED` |
| 3 | Route | Kiểm tra body và query bằng Zod | Dữ liệu không hợp lệ → `400 VALIDATION` |
| 4 | Service | Thực thi quy tắc nghiệp vụ | Vi phạm → `AppError` |
| 5 | Repository | Truy vấn D1 kèm điều kiện `user_id` | Không có bản ghi → `404 NOT_FOUND` |

Thứ tự bước 2 trước bước 3 là bắt buộc. Yêu cầu đã xác thực nhưng tham chiếu tài nguyên của tài khoản khác trả `404` thay vì `403`, do `403` gián tiếp xác nhận tài nguyên tồn tại.

---

## 5. Kiểm soát quyền truy cập

Hai lớp độc lập:

1. **Middleware** — toàn bộ route ngoài `/v1/auth/*` và `/v1/health` yêu cầu phiên hợp lệ.
2. **Repository** — mọi truy vấn chứa điều kiện `user_id`, kể cả khi khoá chính đã duy nhất toàn hệ thống.

```ts
// Đúng
async function findById(db: DB, userId: string, id: string) {
  const rows = await db.select().from(wallets)
    .where(and(eq(wallets.id, id), eq(wallets.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

// Sai — thiếu điều kiện quyền sở hữu
async function findById(db: DB, id: string) {}
```

Giá trị `userId` luôn lấy từ context sau xác thực.

---

## 6. Lược đồ cơ sở dữ liệu

Khoá chính dùng UUIDv7: sắp xếp được theo thời gian tạo, không để lộ số lượng bản ghi như khoá tự tăng.

### users

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | TEXT | PRIMARY KEY |
| `email` | TEXT | NOT NULL, UNIQUE, chuẩn hoá chữ thường |
| `password_hash` | TEXT | NOT NULL, định dạng `pbkdf2$sha256$210000$<salt>$<hash>` |
| `name` | TEXT | NOT NULL, 1–80 ký tự |
| `timezone` | TEXT | NOT NULL, mặc định `Asia/Ho_Chi_Minh` |
| `base_currency` | TEXT | NOT NULL, mặc định `VND` |
| `created_at`, `updated_at` | INTEGER | NOT NULL, Unix ms |

### sessions

Lưu refresh token, phục vụ thu hồi phiên phía máy chủ.

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | TEXT | PRIMARY KEY |
| `user_id` | TEXT | NOT NULL, FK → `users.id`, ON DELETE CASCADE |
| `token_hash` | TEXT | NOT NULL, SHA-256 của refresh token; token nguyên bản không lưu |
| `expires_at` | INTEGER | NOT NULL |
| `revoked_at` | INTEGER | NULL, khác NULL nghĩa là đã thu hồi |
| `created_at` | INTEGER | NOT NULL |

### login_attempts

Ghi nhận mỗi lần đăng nhập thất bại, phục vụ giới hạn tần suất tại NFR-04. Không có khoá ngoại tới `users` vì tài khoản không tồn tại cũng phải tính vào giới hạn.

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | TEXT | PRIMARY KEY |
| `email` | TEXT | NOT NULL |
| `ip` | TEXT | NOT NULL |
| `attempted_at` | INTEGER | NOT NULL |

### wallets

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | TEXT | PRIMARY KEY |
| `user_id` | TEXT | NOT NULL, FK → `users.id`, ON DELETE CASCADE |
| `name` | TEXT | NOT NULL, 1–50 ký tự |
| `initial_balance` | INTEGER | NOT NULL, ≥ 0, đơn vị đồng |
| `currency` | TEXT | NOT NULL, mặc định `VND` |
| `note` | TEXT | NULL, tối đa 255 ký tự |
| `archived_at` | INTEGER | NULL |
| `created_at`, `updated_at` | INTEGER | NOT NULL |

Không có cột số dư hiện tại — xem `srs.md` mục 2.1.

### categories

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | TEXT | PRIMARY KEY |
| `user_id` | TEXT | NOT NULL, FK → `users.id`, ON DELETE CASCADE |
| `name` | TEXT | NOT NULL, 1–50 ký tự |
| `type` | TEXT | NOT NULL, `income` hoặc `expense`, không sửa sau khi tạo |
| `icon`, `color` | TEXT | NULL |
| `archived_at` | INTEGER | NULL |
| `created_at`, `updated_at` | INTEGER | NOT NULL |

### transactions

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | TEXT | PRIMARY KEY |
| `user_id` | TEXT | NOT NULL, FK → `users.id`, ON DELETE CASCADE |
| `wallet_id` | TEXT | NOT NULL, FK → `wallets.id`, ON DELETE RESTRICT |
| `category_id` | TEXT | NOT NULL, FK → `categories.id`, ON DELETE RESTRICT |
| `amount` | INTEGER | NOT NULL, > 0, đơn vị đồng |
| `note` | TEXT | NULL, tối đa 255 ký tự |
| `occurred_on` | TEXT | NOT NULL, `YYYY-MM-DD` theo múi giờ người dùng |
| `created_at`, `updated_at` | INTEGER | NOT NULL |

Cột `user_id` dư thừa về mặt quan hệ nhưng cần thiết để truy vấn kiểm soát quyền được phục vụ trực tiếp bởi chỉ mục, không phải thực hiện phép nối.

`ON DELETE RESTRICT` trên hai khoá ngoại thực thi BR-06 và BR-07 ở tầng cơ sở dữ liệu, độc lập với kiểm tra ở tầng ứng dụng.

### Chỉ mục

```sql
CREATE UNIQUE INDEX users_email_uq            ON users (email);
CREATE UNIQUE INDEX wallets_name_uq           ON wallets (user_id, name)          WHERE archived_at IS NULL;
CREATE UNIQUE INDEX categories_name_uq        ON categories (user_id, type, name) WHERE archived_at IS NULL;
CREATE        INDEX tx_user_date_idx          ON transactions (user_id, occurred_on, id);
CREATE        INDEX tx_wallet_idx             ON transactions (wallet_id);
CREATE        INDEX tx_category_idx           ON transactions (category_id);
CREATE        INDEX sessions_user_idx         ON sessions (user_id);
CREATE        INDEX login_attempts_lookup_idx ON login_attempts (email, ip, attempted_at);
```

`tx_user_date_idx` được tạo tăng dần; truy vấn `ORDER BY occurred_on DESC` vẫn dùng được chỉ mục này nhờ SQLite quét ngược, không cần khai báo hướng giảm dần.

`tx_user_date_idx` phục vụ truy vấn danh sách giao dịch kèm phân trang cursor. Chỉ mục duy nhất dạng partial cho phép tạo lại ví hoặc danh mục trùng tên với bản ghi đã lưu trữ.

### Migration

- Mỗi thay đổi lược đồ là một tệp mới, đánh số tăng dần: `0000_init.sql`, `0001_....sql`
- Tệp đã áp dụng không được sửa; điều chỉnh bằng migration mới
- Migration chạy trước khi triển khai mã nguồn mới
- Viết theo hướng mở rộng: thêm cột trước, triển khai mã nguồn, loại bỏ cột cũ ở migration sau
- Mọi khoá ngoại phải có chỉ mục

---

## 7. Truy vấn tính số dư

```sql
SELECT
  w.initial_balance
  + COALESCE(SUM(CASE WHEN c.type = 'income'  THEN t.amount ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END), 0) AS balance
FROM wallets w
LEFT JOIN transactions t ON t.wallet_id = w.id
LEFT JOIN categories   c ON c.id = t.category_id
WHERE w.user_id = ?1 AND w.id = ?2
GROUP BY w.id;
```

`LEFT JOIN` kết hợp `COALESCE` là bắt buộc để ví chưa có giao dịch trả về `initial_balance` thay vì `NULL`.
