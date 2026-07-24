# Lộ trình

`[ ]` chưa làm · `[~]` đang làm · `[x]` hoàn thành

---

## Giai đoạn 0 — Nền tảng

Điều kiện chuyển giai đoạn: `bun run dev` chạy được và `/v1/health` trả `200`.

- [x] Tài liệu: srs, architecture, api, standards, roadmap
- [x] Khung monorepo: `apps/api`, `apps/web`, `packages/db`, `packages/shared`, tsconfig strict
- [x] Biome, Lefthook, commitlint
- [x] `AppError`, middleware lỗi, tập mã lỗi trong `packages/shared`
- [x] D1, `wrangler.toml`, migration `0000_init.sql` với 6 bảng và chỉ mục
- [x] Worker: Hono, static assets, `/v1/health`
- [ ] Triển khai thử lên Cloudflare

## Giai đoạn 1 — Tài khoản `FR-01…FR-05`

- [x] Băm mật khẩu PBKDF2 kết hợp pepper
- [x] `register`, `login`, `refresh` có xoay vòng token, `logout`
- [x] Middleware auth, giới hạn số lần đăng nhập thất bại
- [ ] Sinh danh mục mặc định lúc đăng ký (nối ở Bước 9 — module categories)
- [x] `GET/PATCH /me`, `POST /me/password`
- [ ] Giao diện: đăng ký, đăng nhập, chuyển hướng khi chưa xác thực

## Giai đoạn 2 — Ví và danh mục `FR-06…FR-08`

- [x] Module `wallets`: CRUD, lưu trữ, truy vấn số dư
- [x] Module `categories`: CRUD, lưu trữ, chặn sửa `type`, sinh danh mục mặc định
- [x] Chặn xoá khi còn giao dịch tham chiếu
- [ ] Giao diện: quản lý ví, quản lý danh mục

## Giai đoạn 3 — Giao dịch `FR-09…FR-12`

- [x] CRUD giao dịch với đầy đủ ràng buộc quyền sở hữu, số tiền, ngày
- [x] Danh sách có lọc, tìm kiếm, phân trang cursor
- [ ] Giao diện: biểu mẫu thêm/sửa, danh sách có bộ lọc

## Giai đoạn 4 — Dashboard và thống kê `FR-13, FR-14`

- [ ] `GET /stats/dashboard`, `GET /stats/overview`
- [ ] Giao diện: thẻ tổng quan, biểu đồ tròn theo danh mục, biểu đồ cột theo tháng

## Giai đoạn 5 — Hoàn thiện

- [ ] Rà soát trạng thái đang tải, rỗng, lỗi trên mọi màn hình
- [ ] Bố cục đáp ứng từ 360 px
- [ ] Kiểm chứng toàn bộ tiêu chí chấp nhận trong `srs.md`
- [ ] Kiểm tra cách ly dữ liệu bằng hai tài khoản
- [ ] Dữ liệu mẫu phục vụ trình bày

## Giai đoạn 6 — Kiểm thử

- [ ] Thiết lập Vitest
- [ ] Unit test cho logic thuần: tính số dư, kiểm tra dữ liệu, ràng buộc ngày
- [ ] Integration test cho API trên D1 cục bộ
- [ ] Test ca phủ định quyền truy cập
- [ ] Tài liệu thiết kế test case và bảng truy vết yêu cầu ↔ test case
- [ ] E2E cho luồng chính bằng Playwright

---

## Sau phiên bản 1.0

Ngân sách theo danh mục → giao dịch định kỳ → xuất CSV/PDF → dark mode → đa tiền tệ → đăng nhập Google → thông báo.
