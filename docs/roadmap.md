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
- [x] Triển khai thử lên Cloudflare (cần tài khoản Cloudflare + D1 thật, xem `deploy-local.md` mục 5)

## Giai đoạn 1 — Tài khoản `FR-01…FR-05`

- [x] Băm mật khẩu PBKDF2 kết hợp pepper
- [x] `register`, `login`, `refresh` có xoay vòng token, `logout`
- [x] Middleware auth, giới hạn số lần đăng nhập thất bại
- [x] Sinh danh mục mặc định lúc đăng ký
- [x] `GET/PATCH /me`, `POST /me/password`
- [x] Giao diện: đăng ký, đăng nhập, chuyển hướng khi chưa xác thực

## Giai đoạn 2 — Ví và danh mục `FR-06…FR-08`

- [x] Module `wallets`: CRUD, lưu trữ, truy vấn số dư
- [x] Module `categories`: CRUD, lưu trữ, chặn sửa `type`, sinh danh mục mặc định
- [x] Chặn xoá khi còn giao dịch tham chiếu
- [x] Giao diện: quản lý ví, quản lý danh mục

## Giai đoạn 3 — Giao dịch `FR-09…FR-12`

- [x] CRUD giao dịch với đầy đủ ràng buộc quyền sở hữu, số tiền, ngày
- [x] Danh sách có lọc, tìm kiếm, phân trang cursor
- [x] Giao diện: biểu mẫu thêm/sửa, danh sách có bộ lọc

## Giai đoạn 4 — Dashboard và thống kê `FR-13, FR-14`

- [x] `GET /stats/dashboard`, `GET /stats/overview`
- [x] Giao diện: thẻ tổng quan, biểu đồ tròn theo danh mục, biểu đồ cột theo tháng

## Giai đoạn 5 — Hoàn thiện

- [x] Rà soát trạng thái đang tải, rỗng, lỗi trên mọi màn hình
- [x] Bố cục đáp ứng từ 360 px
- [x] Rà soát tĩnh toàn bộ tiêu chí chấp nhận trong `srs.md` (đọc code đối chiếu từng FR/BR — chưa chạy thử end-to-end vì máy này không cài Node/chưa có D1 thật)
- [x] Rà soát tĩnh cách ly dữ liệu: mọi truy vấn ghi/đọc đều lọc theo `user_id`, riêng vài helper nội bộ (`revokeSession`, `countTransactions` theo `walletId`/`categoryId`) an toàn nhờ đã được xác thực quyền sở hữu ở lớp gọi trước đó
- [x] Script sinh dữ liệu mẫu (`packages/db/scripts/seed.ts`), đã thử áp lên D1 cục bộ thành công
- [x] Làm mới UI/UX: hệ token màu HSL, sidebar/topbar cố định + drawer mobile, `Table`/`Badge`/`ConfirmDialog`/`Toast` thay cho class Tailwind rời rạc và `window.confirm()`

## Giai đoạn 6 — Kiểm thử

- [ ] Thiết lập Vitest
- [ ] Unit test cho logic thuần: tính số dư, kiểm tra dữ liệu, ràng buộc ngày
- [ ] Integration test cho API trên D1 cục bộ
- [ ] Test ca phủ định quyền truy cập
- [ ] Tài liệu thiết kế test case và bảng truy vết yêu cầu ↔ test case
- [~] E2E cho luồng chính bằng CodeceptJS + Playwright — đã cài đặt, cấu hình và có 1 test case (`e2e/`)
- [~] Phân tích tĩnh chất lượng mã nguồn bằng SonarQube — chạy cục bộ qua Docker Compose (`sonarqube/`), chưa gắn vào CI

---

## Giai đoạn 7 — Giao diện tối `FR-16`

- [x] Custom dark variant theo class, toggle thủ công lưu `localStorage`
- [ ] Xác nhận trực quan trên trình duyệt thật (máy này không có trình duyệt)

## Giai đoạn 8 — Ngân sách theo danh mục `FR-17`

- [x] Bảng `budgets`, mã lỗi `BUDGET_EXISTS`/`BUDGET_CATEGORY_TYPE_INVALID`
- [x] Module `budgets`: CRUD, tính đã chi theo tháng
- [x] Giao diện quản lý ngân sách

## Giai đoạn 9 — Giao dịch định kỳ `FR-18`

- [x] Bảng `recurring_transactions`, module `recurring`: CRUD
- [x] Cron trigger + `scheduled()` sinh giao dịch tới hạn
- [x] Giao diện quản lý giao dịch định kỳ

## Giai đoạn 10 — Thông báo `FR-19`

- [x] Bảng `notifications`, module `notifications`
- [x] Nối sự kiện vượt ngân sách và giao dịch định kỳ đã sinh
- [x] Giao diện: chuông thông báo, đánh dấu đã đọc

## Giai đoạn 11 — Xuất CSV `FR-20`

- [x] `GET /v1/transactions/export`
- [x] Giao diện: nút xuất CSV theo bộ lọc hiện tại

## Giai đoạn 12 — Đăng nhập Google `FR-21`

- [x] Bảng `oauth_identities`, luồng OAuth trong `modules/auth`
- [x] Giao diện: nút đăng nhập Google
- [x] Hướng dẫn tạo Google OAuth Client trong `deploy-local.md`
- [ ] Xác nhận full flow thật (cần Google Cloud Console thật + trình duyệt, chưa làm được từ VPS này)
