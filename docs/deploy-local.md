# Chạy cục bộ và triển khai

---

## 1. Yêu cầu môi trường

- [Bun](https://bun.sh) ≥ 1.1
- Tài khoản Cloudflare
- Đã chạy `bunx wrangler login`

---

## 2. Chạy cục bộ

```bash
bun install

bunx wrangler d1 create expense-tracker-dev   # lần đầu; chép database_id vào apps/api/wrangler.toml
bun run db:migrate:local

cp .dev.vars.example .dev.vars                # điền giá trị
bun run dev
```

Giao diện và API tại `http://localhost:8787`. Kiểm tra: `curl http://localhost:8787/v1/health` trả `{"status":"ok"}`.

Endpoint health phải trả `200` trước khi kiểm tra các phần còn lại.

---

## 3. Biến môi trường

Bí mật, lưu trong Cloudflare Secrets, không commit:

| Tên | Mục đích | Cách tạo giá trị |
|---|---|---|
| `JWT_SECRET` | Ký access token | `openssl rand -base64 32` |
| `PASSWORD_PEPPER` | Trộn vào mật khẩu trước khi băm | `openssl rand -base64 32` |

Thay đổi `PASSWORD_PEPPER` làm toàn bộ mật khẩu hiện có không xác thực được. Việc thay đổi yêu cầu kế hoạch băm lại toàn bộ.

Cấu hình không bí mật, đặt trong `wrangler.toml`:

| Tên | Giá trị |
|---|---|
| `ENVIRONMENT` | `development` hoặc `production` |
| `APP_VERSION` | `1.0.0` |

Ở môi trường cục bộ, mọi giá trị nằm trong `.dev.vars` (đã ignore). Repo chỉ commit `.dev.vars.example` chứa tên biến và cách tạo giá trị, không chứa giá trị thật.

---

## 4. Triển khai lần đầu

```bash
bunx wrangler d1 create expense-tracker              # chép database_id vào [env.production]

bunx wrangler secret put JWT_SECRET --env production
bunx wrangler secret put PASSWORD_PEPPER --env production

bun run db:migrate:prod                             # chạy trước khi triển khai mã nguồn
bun run build
bunx wrangler deploy --env production
```

Migration luôn chạy trước khi triển khai mã nguồn mới. Thứ tự ngược lại khiến phiên bản mới tham chiếu cột chưa tồn tại.

---

## 5. Triển khai các lần sau

```bash
bun run lint && bun run typecheck
bun run db:migrate:prod                             # khi có migration mới
bun run build
bunx wrangler deploy --env production

curl https://<domain>/v1/health
```

---

## 6. Quay lui

```bash
bunx wrangler deployments list
bunx wrangler rollback <deployment-id>
```

Thao tác này chỉ hoàn tác mã nguồn, không hoàn tác cơ sở dữ liệu. Migration do đó phải viết theo hướng mở rộng: thêm cột mới, triển khai mã nguồn sử dụng cột mới, loại bỏ cột cũ ở một migration sau. Migration vừa xoá cột vừa triển khai cùng lúc khiến phiên bản cũ không hoạt động được sau khi quay lui.

---

## 7. Sao lưu

```bash
bunx wrangler d1 export expense-tracker --env production --output backup.sql
```

Thực hiện trước mỗi migration có tác động tới dữ liệu hiện có.

---

## 8. Hạn mức gói miễn phí

| Hạng mục | Hạn mức |
|---|---|
| Worker requests | 100.000 / ngày |
| D1 đọc | 5.000.000 dòng / ngày |
| D1 ghi | 100.000 dòng / ngày |
| D1 dung lượng | 5 GB |

Endpoint trả danh sách không giới hạn là nguyên nhân chính làm cạn hạn mức đọc.
