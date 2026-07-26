# Hợp đồng API

Đường dẫn gốc `/v1`. Nguồn tham chiếu chung cho backend và frontend.

---

## 1. Quy ước

| Hạng mục | Quy ước |
|---|---|
| Định dạng | JSON |
| Xác thực | Cookie `HttpOnly`, không dùng header `Authorization` |
| Cookie `at` | Access token, 15 phút, `Path=/` |
| Cookie `rt` | Refresh token, 30 ngày, `Path=/v1/auth` |
| Giá trị tiền tệ | Số nguyên, đơn vị đồng. `50000` tương ứng 50.000 ₫ |
| Ngày lịch | `YYYY-MM-DD` |
| Thời điểm | Số nguyên Unix ms |
| Header phản hồi | Phản hồi chứa dữ liệu người dùng mang `Cache-Control: no-store` |

Token không đặt ở nơi mã JavaScript truy cập được, nhằm loại bỏ khả năng đánh cắp token qua XSS.

**Phân trang** dùng cursor, không dùng offset (offset gây trùng lặp hoặc bỏ sót bản ghi khi có dữ liệu chèn vào giữa quá trình duyệt). `limit` mặc định 20, tối đa 100; giá trị vượt ngưỡng được cắt về 100 và không phát sinh lỗi.

---

## 2. Cấu trúc phản hồi

```jsonc
// Thành công — trả trực tiếp đối tượng
{ "id": "0192a1b2-...", "name": "Tiền mặt", "currentBalance": 1300000 }

// Danh sách — nextCursor bằng null khi hết dữ liệu
{ "items": [], "nextCursor": "eyJkIjoiMjAyNi0wNy0xMCIsImkiOiIwMTkyLi4uIn0" }

// Lỗi
{
  "error": {
    "code": "VALIDATION",
    "message": "amount_must_be_positive",
    "details": { "field": "amount" }
  }
}
```

`code` thuộc tập cố định tại `srs.md` mục 6. `message` là mã định danh dạng máy đọc, do frontend ánh xạ sang chuỗi hiển thị; nội dung này không được hiển thị trực tiếp cho người dùng.

---

## 3. Endpoint

### Xác thực

| Method | Path | Xác thực | Chức năng |
|---|---|---|---|
| POST | `/v1/auth/register` | Không | Tạo tài khoản và cấp phiên |
| POST | `/v1/auth/login` | Không | Đăng nhập |
| POST | `/v1/auth/refresh` | Cookie `rt` | Cấp cặp token mới, vô hiệu token cũ |
| POST | `/v1/auth/logout` | Có | Thu hồi phiên hiện tại |
| GET | `/v1/auth/google/start` | Không | Chuyển hướng sang trang xác thực Google |
| GET | `/v1/auth/google/callback` | Không | Google gọi lại sau khi người dùng xác thực, cấp phiên |

```jsonc
// POST /v1/auth/register
{ "name": "Nguyễn Văn A", "email": "a@example.com", "password": "matkhau123" }

// 201
{ "user": { "id": "0192a1b2-...", "name": "Nguyễn Văn A", "email": "a@example.com" } }
// Set-Cookie: at=...; HttpOnly; Secure; SameSite=Lax; Path=/
// Set-Cookie: rt=...; HttpOnly; Secure; SameSite=Lax; Path=/v1/auth
```

`POST /v1/auth/login` trả cùng khuôn `{ "user": {...} }` kèm hai cookie như trên.

`POST /v1/auth/refresh` đặt lại cả hai cookie (xoay vòng), trả `200 {}`.

`POST /v1/auth/logout` xoá cả hai cookie, trả `204` không thân phản hồi.

Mã lỗi: `VALIDATION`, `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `RATE_LIMITED`

`GET /v1/auth/google/start` chuyển hướng (`302`) sang trang xác thực Google, đặt cookie `oauth_state` ngắn hạn (`Path=/v1/auth/google`, 5 phút) chống giả mạo. `GET /v1/auth/google/callback` xác nhận `state` khớp cookie, đổi `code` lấy thông tin tài khoản Google, cấp phiên như đăng nhập thường rồi chuyển hướng về `/`.

Mã lỗi: `VALIDATION` (state sai/thiếu), `INTERNAL` (Google trả lỗi)

### Hồ sơ

| Method | Path | Chức năng |
|---|---|---|
| GET | `/v1/me` | Thông tin tài khoản hiện tại |
| PATCH | `/v1/me` | Cập nhật `name`, `timezone` |
| POST | `/v1/me/password` | Đổi mật khẩu: `currentPassword`, `newPassword` |

Đổi mật khẩu thành công thu hồi mọi phiên khác, giữ phiên đang thao tác, trả `200 {}`.

### Ví

| Method | Path | Chức năng |
|---|---|---|
| GET | `/v1/wallets` | Danh sách kèm số dư. `includeArchived=true` bao gồm ví đã lưu trữ |
| POST | `/v1/wallets` | Tạo ví |
| GET | `/v1/wallets/:id` | Chi tiết |
| PATCH | `/v1/wallets/:id` | Cập nhật `name`, `note`, `initialBalance` |
| DELETE | `/v1/wallets/:id` | Xoá; ví còn giao dịch trả `409` |
| POST | `/v1/wallets/:id/archive` | Lưu trữ |
| POST | `/v1/wallets/:id/unarchive` | Bỏ lưu trữ |

```jsonc
// GET /v1/wallets — 200
{
  "items": [{
    "id": "0192a1b2-...",
    "name": "Techcombank",
    "initialBalance": 5000000,
    "currentBalance": 4300000,
    "totalIncome": 0,
    "totalExpense": 700000,
    "currency": "VND",
    "note": null,
    "archivedAt": null
  }],
  "nextCursor": null
}
```

`currentBalance` là giá trị tính toán, không lưu trữ.

Mã lỗi: `VALIDATION`, `DUPLICATE_NAME`, `NOT_FOUND`, `WALLET_HAS_TRANSACTIONS`

### Danh mục

| Method | Path | Chức năng |
|---|---|---|
| GET | `/v1/categories` | Danh sách. `type=income\|expense` để lọc |
| POST | `/v1/categories` | Tạo |
| PATCH | `/v1/categories/:id` | Cập nhật `name`, `icon`, `color`. Trường `type` không sửa được |
| DELETE | `/v1/categories/:id` | Xoá; danh mục còn giao dịch trả `409` |
| POST | `/v1/categories/:id/archive` | Lưu trữ |

Mã lỗi: `VALIDATION`, `DUPLICATE_NAME`, `CATEGORY_TYPE_IMMUTABLE`, `CATEGORY_HAS_TRANSACTIONS`, `NOT_FOUND`

### Ngân sách

| Method | Path | Chức năng |
|---|---|---|
| GET | `/v1/budgets?month=YYYY-MM` | Danh sách ngân sách trong tháng, kèm `spent` tính từ giao dịch |
| POST | `/v1/budgets` | Tạo, chỉ nhận danh mục loại chi |
| PATCH | `/v1/budgets/:id` | Cập nhật `amountLimit`. `categoryId`, `month` không sửa được |
| DELETE | `/v1/budgets/:id` | Xoá |

```jsonc
// GET /v1/budgets?month=2026-07
{
  "items": [
    {
      "id": "0192...",
      "categoryId": "0192...",
      "categoryName": "Ăn uống",
      "categoryColor": "#f59e0b",
      "month": "2026-07",
      "amountLimit": 2000000,
      "spent": 1450000
    }
  ]
}
```

Mã lỗi: `VALIDATION`, `BUDGET_EXISTS`, `BUDGET_CATEGORY_TYPE_INVALID`, `NOT_FOUND`

### Giao dịch định kỳ

| Method | Path | Chức năng |
|---|---|---|
| GET | `/v1/recurring` | Danh sách |
| POST | `/v1/recurring` | Tạo |
| PATCH | `/v1/recurring/:id` | Cập nhật `amount`, `note`, `endOn` |
| DELETE | `/v1/recurring/:id` | Xoá |
| POST | `/v1/recurring/:id/archive` | Tạm dừng — không còn được quét tới hạn |
| POST | `/v1/recurring/:id/unarchive` | Tiếp tục |

```jsonc
// POST /v1/recurring
{
  "walletId": "0192...",
  "categoryId": "0192...",
  "amount": 250000,
  "frequency": "monthly",
  "anchorDay": 15,
  "startOn": "2026-08-15",
  "note": "Internet"
}
```

`walletId`, `categoryId`, `frequency`, `anchorDay`, `startOn` không sửa được sau khi tạo. `anchorDay` bắt buộc (1–28) khi `frequency` là `monthly`.

Mã lỗi: `VALIDATION`, `RECURRING_END_BEFORE_START`, `WALLET_ARCHIVED`, `CATEGORY_ARCHIVED`, `NOT_FOUND`

### Thông báo

| Method | Path | Chức năng |
|---|---|---|
| GET | `/v1/notifications` | Danh sách phân trang cursor, kèm `unreadCount` |
| POST | `/v1/notifications/:id/read` | Đánh dấu một thông báo đã đọc |
| POST | `/v1/notifications/read-all` | Đánh dấu toàn bộ đã đọc |

Không có endpoint tạo — thông báo chỉ do hệ thống sinh khi vượt ngân sách (FR-17) hoặc giao dịch định kỳ được tự động ghi nhận (FR-18).

Mã lỗi: `NOT_FOUND`

### Giao dịch

| Method | Path | Chức năng |
|---|---|---|
| GET | `/v1/transactions` | Danh sách có lọc và phân trang |
| POST | `/v1/transactions` | Tạo |
| GET | `/v1/transactions/:id` | Chi tiết |
| PATCH | `/v1/transactions/:id` | Cập nhật |
| DELETE | `/v1/transactions/:id` | Xoá |

Tham số truy vấn của `GET /v1/transactions`:

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `from`, `to` | `YYYY-MM-DD` | Khoảng ngày, bao gồm hai mút |
| `walletId`, `categoryId` | UUID | Lọc theo ví, danh mục |
| `type` | `income` \| `expense` | Lọc theo loại của danh mục |
| `minAmount`, `maxAmount` | integer | Khoảng số tiền |
| `q` | string | Tìm trong `note`, không phân biệt hoa thường |
| `limit`, `cursor` | | Xem mục 1 |

```jsonc
// POST /v1/transactions
{
  "amount": 45000,
  "walletId": "0192a1b2-...",
  "categoryId": "0192c3d4-...",
  "occurredOn": "2026-07-24",
  "note": "Cà phê"
}

// 201
{
  "id": "0192e5f6-...",
  "amount": 45000,
  "type": "expense",
  "wallet": { "id": "0192a1b2-...", "name": "Tiền mặt" },
  "category": { "id": "0192c3d4-...", "name": "Ăn uống", "type": "expense", "icon": "coffee" },
  "occurredOn": "2026-07-24",
  "note": "Cà phê"
}
```

Trường `type` suy ra từ danh mục, không nhận từ máy khách. Tham chiếu `walletId` hoặc `categoryId` thuộc tài khoản khác trả `404`; mã `403` không dùng ở đây do gián tiếp xác nhận tài nguyên tồn tại.

Mã lỗi: `VALIDATION`, `FUTURE_DATE`, `WALLET_ARCHIVED`, `CATEGORY_ARCHIVED`, `NOT_FOUND`

**`GET /v1/transactions/export`** — cùng tham số lọc ở trên (trừ `limit`, `cursor`), trả `text/csv` thay vì JSON, header `Content-Disposition: attachment; filename="transactions.csv"`. Vượt `EXPORT_MAX_ROWS` (10.000) dòng → thêm header `X-Export-Truncated: true`, chỉ xuất 10.000 dòng đầu theo thứ tự `occurredOn` giảm dần.

### Thống kê

| Method | Path | Chức năng |
|---|---|---|
| GET | `/v1/stats/dashboard` | Số liệu theo tháng. `month=YYYY-MM`, mặc định tháng hiện tại |
| GET | `/v1/stats/overview` | Số liệu theo khoảng. `from`, `to` dạng `YYYY-MM`, tối đa 24 tháng |

```jsonc
// GET /v1/stats/dashboard?month=2026-07 — 200
{
  "month": "2026-07",
  "totalIncome": 15000000,
  "totalExpense": 8200000,
  "net": 6800000,
  "totalBalance": 12300000,
  "expenseByCategory": [
    { "categoryId": "0192c3d4-...", "name": "Ăn uống", "color": "#f59e0b", "amount": 3200000 }
  ],
  "recentTransactions": []
}
```

`totalBalance` tính trên toàn bộ lịch sử của các ví chưa lưu trữ, không giới hạn theo tháng đang chọn. `recentTransactions` là 5 giao dịch gần nhất trên toàn tài khoản, không giới hạn theo tháng đang chọn.

```jsonc
// GET /v1/stats/overview?from=2026-02&to=2026-07 — 200
{
  "from": "2026-02",
  "to": "2026-07",
  "monthly": [
    { "month": "2026-02", "income": 0, "expense": 0 },
    { "month": "2026-03", "income": 15000000, "expense": 6000000 }
  ],
  "topExpenseCategories": [
    { "categoryId": "0192c3d4-...", "name": "Ăn uống", "color": "#f59e0b", "amount": 3200000 }
  ],
  "totalTransactions": 42,
  "averageExpensePerDay": 65753
}
```

`monthly` luôn đủ số điểm dữ liệu từ `from` đến `to`, tháng không có giao dịch trả `0`. `topExpenseCategories` tối đa 5 danh mục.

`totalBalance` tính trên các ví chưa lưu trữ. Tài khoản chưa có dữ liệu nhận chỉ số bằng `0` và mảng rỗng, không phát sinh lỗi.

### Hệ thống

| Method | Path | Xác thực | Chức năng |
|---|---|---|---|
| GET | `/v1/health` | Không | `{ "status": "ok", "version": "1.0.0" }`, không truy cập cơ sở dữ liệu |

---

## 4. Quy định bổ sung endpoint

1. Khai báo schema Zod cho body, query và response
2. Thân xử lý trong `index.ts` giới hạn 1–3 dòng; logic đặt tại tầng service
3. Mọi truy vấn trong tầng repository chứa điều kiện `user_id`
4. Lỗi phát sinh bằng `AppError` với mã thuộc tập cố định; mã mới bổ sung vào `srs.md` mục 6 trong cùng lần thay đổi
5. Endpoint trả danh sách có khả năng tăng trưởng không giới hạn (giao dịch) phải hỗ trợ phân trang và giới hạn `limit`
6. Tài liệu này cập nhật trong cùng commit với thay đổi mã nguồn
