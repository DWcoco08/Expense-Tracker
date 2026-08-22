---
noteId: "a6864a009e1011f1acd17110d0996efc"
tags: []

---

# Hướng dẫn đóng góp

Dành cho thành viên mới tham gia repo. Mục tiêu: tránh những lỗi hay gặp nhất khi chưa quen codebase — không phải bản tóm tắt đầy đủ tài liệu, các file dưới đây mới là nguồn chính xác.

---

## 1. Đọc trước khi code

Theo đúng thứ tự:

1. [docs/srs.md](docs/srs.md) — yêu cầu chức năng, quy tắc nghiệp vụ, mã lỗi
2. [docs/architecture.md](docs/architecture.md) — kiến trúc, lược đồ dữ liệu
3. [docs/api.md](docs/api.md) — hợp đồng API
4. [docs/standards.md](docs/standards.md) — khuôn module, quy chuẩn đặt tên, Git

Tài liệu có thể lệch với code thực tế (đang cập nhật liên tục) — đọc xong vẫn nên `grep` mã nguồn để xác nhận trước khi dựa vào đó viết code mới.

---

## 2. Chạy dự án lần đầu

Tóm tắt — chi tiết đầy đủ ở [docs/deploy-local.md](docs/deploy-local.md):

```bash
bun install

bunx wrangler d1 create expense-tracker-dev   # lần đầu; chép database_id vào apps/api/wrangler.toml
bun run db:migrate:local

cp apps/api/.dev.vars.example apps/api/.dev.vars   # điền giá trị thật, xem mục 4 bên dưới
bun run dev
```

Cần **Node.js ≥ 18** cài song song với Bun — `wrangler dev` không chạy được dưới runtime Bun thuần.

---

## 3. 10 ràng buộc bắt buộc — vi phạm là code sai, không phải style

Áp dụng cho mọi thay đổi chạm tới `apps/api`:

1. Mọi truy vấn cơ sở dữ liệu lọc theo `user_id`. Giá trị `userId` lấy từ context sau xác thực (`c.get('userId')`), **không** lấy từ body/query/path/header do client gửi lên.
2. Tiền tệ là số nguyên đơn vị đồng. Không dùng số dấu phẩy động.
3. Bảng `wallets` không có cột số dư — số dư luôn tính từ tổng giao dịch, không lưu cache.
4. Bảng `transactions` không có cột `type` — loại thu/chi suy ra từ danh mục liên kết.
5. Ngày giao dịch lưu dạng `YYYY-MM-DD`, không lưu timestamp.
6. Truy cập tài nguyên của tài khoản khác trả **404**, không trả 403 — tránh lộ thông tin tài nguyên đó có tồn tại hay không.
7. Mọi route kiểm tra body và query bằng Zod (`zValidator`).
8. Lỗi ném `AppError` với mã thuộc tập cố định ở `srs.md` mục 6 — không tự dựng response lỗi trong route.
9. Endpoint trả danh sách có khả năng tăng trưởng không giới hạn phải phân trang, `limit` tối đa 100.
10. Không log mật khẩu, token, email, ghi chú người dùng.

---

## 4. Lỗi môi trường hay gặp — đã từng xảy ra thật trong dự án này

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Failed to resolve import "..."` khi chạy `bun run dev` sau khi pull code mới | `package.json` vừa được thêm dependency mới nhưng chưa `bun install` lại | Chạy `bun install` ở thư mục gốc sau **mỗi lần pull** nếu thấy `package.json`/`bun.lock` đổi |
| Đăng ký/đăng nhập trả `500`, log báo `Imported HMAC key length (0) must be a non-zero value` | `apps/api/.dev.vars` còn để trống `JWT_SECRET`/`PASSWORD_PEPPER` (chưa điền sau khi copy từ `.dev.vars.example`) | Sinh giá trị thật: `openssl rand -base64 32`, điền vào 2 biến đó, khởi động lại `bun run dev` |
| Bấm "Đăng nhập bằng Google" ra lỗi `401: invalid_client` | `GOOGLE_CLIENT_ID` trong `apps/api/wrangler.toml` còn để placeholder `REPLACE_WITH_DEV_GOOGLE_CLIENT_ID` | Tự tạo OAuth Client thật trên Google Cloud Console — xem [docs/deploy-local.md](docs/deploy-local.md) mục 4 |
| `bun run format` đột nhiên viết lại hàng trăm file không liên quan | `biome.json` bị xoá/thiếu (kiểm tra `git status`) — Biome rơi về style mặc định thay vì config của dự án | **Không bao giờ xoá `biome.json`.** Nếu thấy `D biome.json` trong `git status`, khôi phục ngay (`git checkout HEAD -- biome.json`) trước khi chạy `format`/`lint`/`build` |

---

## 5. Quy ước code — tóm tắt, xem đầy đủ ở [docs/standards.md](docs/standards.md)

- Tên file `kebab-case`, biến/hàm `camelCase`, type/component React `PascalCase`, cột DB `snake_case`, trường JSON API `camelCase`.
- Mỗi module backend (`apps/api/src/modules/<tên>/`) gồm đúng 4 file: `index.ts` (route, mỏng), `model.ts` (schema Zod), `repo.ts` (truy vấn DB, không chứa quy tắc nghiệp vụ), `service.ts` (quy tắc nghiệp vụ, không import Hono).
- Không dùng `any`, không dùng `as` để bỏ qua lỗi kiểu.
- Chú thích giải thích **lý do**, không mô tả **thao tác**.

---

## 6. Git

- Nhánh: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/` — ví dụ `feat/wallet-archive`.
- Commit theo [Conventional Commits](https://www.conventionalcommits.org/), **viết bằng tiếng Anh**, **ngắn gọn 1 dòng** (`<type>(<scope>): <mô tả>`) — không viết thêm phần thân (body) nhiều dòng trừ khi thật sự cần giải thích lý do phức tạp:
  ```
  feat(wallets): add wallet archive endpoint
  fix(transactions): correct balance when moving transaction between wallets
  ```
- Type hợp lệ: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `style`, `chore`.
- Scope hợp lệ: `api`, `auth`, `users`, `wallets`, `categories`, `transactions`, `stats`, `budgets`, `recurring`, `notifications`, `web`, `db`, `shared`, `config`, `ci`.
- Một commit tương ứng một thay đổi có phạm vi xác định — không gộp nhiều việc không liên quan vào một commit.
- Thay đổi API/lược đồ/quy tắc nghiệp vụ phải cập nhật tài liệu tương ứng (`api.md`/`architecture.md`/`srs.md`) **trong cùng commit**.
- Không thêm dòng đồng tác giả sinh bởi công cụ AI vào commit message.

---

## 7. Trước khi mở Pull Request

- [ ] `bun run lint && bun run typecheck` sạch, không cảnh báo
- [ ] Route mới đã kiểm tra body/query bằng Zod
- [ ] Đã thử với tài khoản thứ hai: xác nhận không truy cập được dữ liệu của tài khoản thứ nhất
- [ ] Giao diện có đủ trạng thái đang tải / rỗng / lỗi
- [ ] Tài liệu liên quan đã cập nhật trong cùng commit
