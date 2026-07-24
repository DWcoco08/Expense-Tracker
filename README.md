# Expense Tracker

Ứng dụng web quản lý thu chi cá nhân: ghi nhận tiền vào và tiền ra theo ví và danh mục, theo dõi số dư, thống kê theo thời gian.

**Stack:** React + Vite · Hono · Cloudflare Workers · D1 (SQLite) · Drizzle · Zod · Tailwind + shadcn/ui

Một Worker phục vụ cả giao diện lẫn API nên hai bên cùng origin: cookie phiên hoạt động không cần cấu hình CORS.

---

## Tài liệu

| Tệp | Nội dung |
|---|---|
| [docs/srs.md](docs/srs.md) | Yêu cầu chức năng kèm tiêu chí chấp nhận, quy tắc nghiệp vụ, mã lỗi |
| [docs/architecture.md](docs/architecture.md) | Kiến trúc, tổ chức mã nguồn, lược đồ cơ sở dữ liệu |
| [docs/api.md](docs/api.md) | Endpoint, cấu trúc yêu cầu và phản hồi |
| [docs/standards.md](docs/standards.md) | Quy chuẩn mã nguồn, khuôn module, quy trình Git |
| [docs/deploy-local.md](docs/deploy-local.md) | Chạy cục bộ, biến môi trường, triển khai, quay lui |
| [docs/roadmap.md](docs/roadmap.md) | Lộ trình và tiến độ |

---

## Chạy cục bộ

Yêu cầu: [Bun](https://bun.sh) ≥ 1.1, tài khoản Cloudflare, đã chạy `bunx wrangler login`.

```bash
bun install

bunx wrangler d1 create expense-tracker-dev   # lần đầu; chép database_id vào wrangler.toml
bun run db:migrate:local

cp .dev.vars.example .dev.vars                # điền giá trị
bun run dev
```

Giao diện và API tại `http://localhost:8787`. Kiểm tra: `curl http://localhost:8787/v1/health`

Biến môi trường và các bước triển khai: [docs/deploy-local.md](docs/deploy-local.md)

---

## Trạng thái

Giai đoạn 0 — nền tảng. Tài liệu hoàn tất, mã nguồn chưa bắt đầu. Tiến độ tại [docs/roadmap.md](docs/roadmap.md).
