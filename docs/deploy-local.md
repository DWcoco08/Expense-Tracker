---
noteId: "a68671119e1011f1acd17110d0996efc"
tags: []

---

# Chạy cục bộ và triển khai

---

## 1. Yêu cầu môi trường

- [Bun](https://bun.sh) ≥ 1.1
- **Node.js** ≥ 18 — Wrangler không chạy `wrangler dev` (local server) được dưới Bun, tự thoát với thông báo "Wrangler does not support the Bun runtime". Các lệnh Wrangler khác (`d1 execute`, `d1 migrations apply`, `deploy`) chạy được dưới Bun bình thường, chỉ riêng `dev` là cần Node
- Tài khoản Cloudflare
- Đã chạy `bunx wrangler login`

---

## 2. Chạy cục bộ

```bash
bun install

bunx wrangler d1 create expense-tracker-dev   # lần đầu; chép database_id vào apps/api/wrangler.toml
bun run db:migrate:local

cp apps/api/.dev.vars.example apps/api/.dev.vars   # điền giá trị
bun run dev
```

`bun run dev` chạy song song hai tiến trình qua Turborepo:

| Tiến trình | Cổng | Vai trò |
|---|---|---|
| `wrangler dev` (`apps/api`) | `:8787` | API thật, chạm D1 cục bộ |
| `vite` (`apps/web`) | `:5173` | Giao diện, hot reload |

Mở `http://localhost:5173` để dùng giao diện — Vite tự proxy mọi request `/v1/*` sang `:8787` (cấu hình trong `apps/web/vite.config.ts`), nên trình duyệt chỉ thấy một origin, cookie phiên hoạt động bình thường.

Kiểm tra API độc lập: `curl http://localhost:8787/v1/health` trả `{"status":"ok"}`. Endpoint health phải trả `200` trước khi kiểm tra các phần còn lại.

**Production khác với dev:** khi build và deploy, một Worker duy nhất phục vụ cả giao diện (static assets) lẫn API tại cùng một cổng — không có bước proxy. Xem mục 5.

**Kiểm thử Cron Trigger (giao dịch định kỳ, FR-18) cục bộ:** `wrangler dev` cấp sẵn endpoint gọi tay `scheduled()` mà không cần đợi tới giờ chạy thật:

```bash
curl "http://localhost:8787/cdn-cgi/handler/scheduled"
```

Sau khi deploy thật, Cloudflare tự gọi `scheduled()` theo lịch khai báo ở `[triggers]` trong `wrangler.toml` — không cần thao tác gì thêm.

---

## 3. Dữ liệu mẫu

Sau khi đăng ký một tài khoản qua giao diện (tự động có sẵn danh mục mặc định — BR-14), sinh thêm 2 ví và khoảng 60 giao dịch trải 6 tháng để có dữ liệu trình bày:

```bash
# 1. Lấy id tài khoản vừa đăng ký
bunx wrangler d1 execute expense-tracker-dev --local --config apps/api/wrangler.toml \
  --command "SELECT id, email FROM users"

# 2. Sinh SQL rồi áp vào D1 local
bun run --cwd packages/db seed -- --user-id=<id> > /tmp/seed.sql
bunx wrangler d1 execute expense-tracker-dev --local --config apps/api/wrangler.toml --file=/tmp/seed.sql
```

Script chỉ in ra câu SQL (chạy bằng Bun thuần, không cần `wrangler dev`), không tự kết nối D1. Số tiền và ngày là ngẫu nhiên, danh mục lấy đúng bộ mặc định của tài khoản đó — chạy sai `--user-id` sẽ báo lỗi ràng buộc khoá ngoại rõ ràng thay vì âm thầm ghi sai dữ liệu.

---

## 4. Biến môi trường

Bí mật, lưu trong Cloudflare Secrets, không commit:

| Tên | Mục đích | Cách tạo giá trị |
|---|---|---|
| `JWT_SECRET` | Ký access token | `openssl rand -base64 32` |
| `PASSWORD_PEPPER` | Trộn vào mật khẩu trước khi băm | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_SECRET` | Đăng nhập Google (FR-21) | Lấy từ Google Cloud Console, xem bên dưới |

Thay đổi `PASSWORD_PEPPER` làm toàn bộ mật khẩu hiện có không xác thực được. Việc thay đổi yêu cầu kế hoạch băm lại toàn bộ.

Cấu hình không bí mật, đặt trong `wrangler.toml`:

| Tên | Giá trị |
|---|---|
| `ENVIRONMENT` | `development` hoặc `production` |
| `APP_VERSION` | `1.0.0` |
| `GOOGLE_CLIENT_ID` | Lấy từ Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `http://localhost:8787/v1/auth/google/callback` (dev) hoặc `https://<domain>/v1/auth/google/callback` (production) |

Ở môi trường cục bộ, mọi giá trị bí mật nằm trong `apps/api/.dev.vars` (đã ignore) — cùng thư mục với `wrangler.toml`, đúng quy ước của Wrangler. Repo chỉ commit `apps/api/.dev.vars.example` chứa tên biến và cách tạo giá trị, không chứa giá trị thật.

**Tạo Google OAuth Client** (bước thủ công, không làm được từ VPS chỉ code + push):

1. Vào [Google Cloud Console](https://console.cloud.google.com/apis/credentials), tạo một OAuth Client ID loại "Web application".
2. Mục "Authorized redirect URIs", thêm đúng giá trị `GOOGLE_REDIRECT_URI` ở trên (dev và production là hai OAuth Client riêng nếu domain khác nhau).
3. Chép `Client ID` vào `GOOGLE_CLIENT_ID` trong `wrangler.toml`, chép `Client secret` vào `.dev.vars` (dev) hoặc `wrangler secret put GOOGLE_CLIENT_SECRET --env production` (production).

---

## 5. Triển khai lần đầu

```bash
bunx wrangler d1 create expense-tracker              # chép database_id vào [env.production]

bunx wrangler secret put JWT_SECRET --env production
bunx wrangler secret put PASSWORD_PEPPER --env production
bunx wrangler secret put GOOGLE_CLIENT_SECRET --env production   # điền GOOGLE_CLIENT_ID/GOOGLE_REDIRECT_URI vào wrangler.toml trước

bun run db:migrate:prod                             # chạy trước khi triển khai mã nguồn
bun run build
bunx wrangler deploy --env production
```

Migration luôn chạy trước khi triển khai mã nguồn mới. Thứ tự ngược lại khiến phiên bản mới tham chiếu cột chưa tồn tại.

---

## 6. Triển khai các lần sau

```bash
bun run lint && bun run typecheck
bun run db:migrate:prod                             # khi có migration mới
bun run build
bunx wrangler deploy --env production

curl https://<domain>/v1/health
```

---

## 7. Quay lui

```bash
bunx wrangler deployments list
bunx wrangler rollback <deployment-id>
```

Thao tác này chỉ hoàn tác mã nguồn, không hoàn tác cơ sở dữ liệu. Migration do đó phải viết theo hướng mở rộng: thêm cột mới, triển khai mã nguồn sử dụng cột mới, loại bỏ cột cũ ở một migration sau. Migration vừa xoá cột vừa triển khai cùng lúc khiến phiên bản cũ không hoạt động được sau khi quay lui.

---

## 8. Sao lưu

```bash
bunx wrangler d1 export expense-tracker --env production --output backup.sql
```

Thực hiện trước mỗi migration có tác động tới dữ liệu hiện có.

---
