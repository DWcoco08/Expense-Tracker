# Expense Tracker

Ứng dụng web quản lý thu chi cá nhân: ghi nhận tiền vào và tiền ra theo ví và danh mục, theo dõi số dư, thống kê theo thời gian.

**Stack:** React + Vite · Hono · Cloudflare Workers · D1 (SQLite) · Drizzle · Zod · Tailwind CSS · Recharts

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

Yêu cầu: [Bun](https://bun.sh) ≥ 1.1, **Node.js ≥ 18** (Wrangler không chạy `dev` được dưới Bun), tài khoản Cloudflare, đã chạy `bunx wrangler login`. Chi tiết: [docs/deploy-local.md](docs/deploy-local.md) mục 1.

```bash
bun install

bunx wrangler d1 create expense-tracker-dev   # lần đầu; chép database_id vào wrangler.toml
bun run db:migrate:local

cp apps/api/.dev.vars.example apps/api/.dev.vars   # điền giá trị
bun run dev
```

Giao diện tại `http://localhost:5173` (proxy `/v1` sang API ở `:8787`). Kiểm tra API độc lập: `curl http://localhost:8787/v1/health`

Biến môi trường và các bước triển khai: [docs/deploy-local.md](docs/deploy-local.md)

---

## Trạng thái

Đã cài đặt đầy đủ FR-01 đến FR-15 (backend + giao diện), qua Giai đoạn 0–5. Chưa chạy thử end-to-end qua trình duyệt thật và chưa triển khai lên Cloudflare thật — cần máy có Node để `bun run dev`. Giai đoạn 6 (viết test) chưa bắt đầu. Tiến độ chi tiết tại [docs/roadmap.md](docs/roadmap.md).
