# Đặc tả yêu cầu — Expense Tracker

Phiên bản 1.0 · Chưa triển khai

Mỗi yêu cầu chức năng kèm tiêu chí chấp nhận. Yêu cầu được coi là hoàn thành khi toàn bộ tiêu chí tương ứng được thoả mãn.

---

## 1. Phạm vi

Ứng dụng web quản lý thu chi cá nhân: ghi nhận tiền vào và tiền ra theo ví và danh mục, theo dõi số dư, thống kê theo thời gian.

**Trong phạm vi 1.0:** tài khoản, ví, danh mục, giao dịch, dashboard, thống kê.

**Ngoài phạm vi 1.0:** thanh toán trực tuyến, đồng bộ ngân hàng, đa tiền tệ, ví dùng chung, ngân sách, giao dịch định kỳ, xuất Excel/PDF, đăng nhập Google.

**Vai trò:** Khách (đăng ký, đăng nhập) và Người dùng (toàn bộ chức năng, giới hạn trên dữ liệu của chính tài khoản). Không có vai trò quản trị.

**Ràng buộc:** chỉ hỗ trợ VND, không có phần thập phân. Múi giờ mặc định `Asia/Ho_Chi_Minh`, người dùng thay đổi được.

---

## 2. Quyết định thiết kế

Các quyết định dưới đây chi phối lược đồ dữ liệu và hợp đồng API.

| # | Quyết định | Lý do |
|---|---|---|
| 2.1 | Bảng `wallets` chỉ lưu `initial_balance`. Số dư hiện tại tính khi truy vấn: `initial_balance + tổng thu − tổng chi` | Lưu đồng thời cột số dư và bảng giao dịch tạo hai nguồn dữ liệu cho cùng một sự kiện; sai lệch phát sinh khi sửa hoặc xoá giao dịch là vĩnh viễn và khó phát hiện |
| 2.2 | Giá trị tiền tệ kiểu `INTEGER`, đơn vị đồng | Số dấu phẩy động tích luỹ sai số khi cộng dồn; SQLite không hỗ trợ `DECIMAL` |
| 2.3 | Bảng `transactions` không có cột `type`; loại thu chi xác định qua danh mục. Trường `type` của danh mục không sửa được sau khi tạo | Lưu loại ở hai nơi cho phép tồn tại trạng thái mâu thuẫn. Cho phép đổi `type` sẽ đảo dấu toàn bộ giao dịch lịch sử |
| 2.4 | Ngày giao dịch lưu dạng `YYYY-MM-DD` theo múi giờ người dùng, không lưu dấu thời gian | Giao dịch gắn với ngày lịch, không phải thời điểm. Lưu dấu thời gian gây xếp sai tháng ở các giao dịch gần ranh giới ngày |
| 2.5 | `initial_balance` ≥ 0; số dư hiện tại không ràng buộc dấu | Hệ thống ghi nhận thực tế, không kiểm soát hạn mức. Chặn số dư âm khiến việc nhập bù giao dịch quá khứ phụ thuộc thứ tự nhập liệu |
| 2.6 | Ví và danh mục còn giao dịch tham chiếu không được xoá; thay bằng thao tác lưu trữ | Xoá vật lý phá vỡ tính toàn vẹn của giao dịch lịch sử |
| 2.7 | Định danh người dùng chỉ lấy từ phiên đã xác thực, không nhận từ body, query, path hay header | Nhận từ máy khách cho phép truy cập dữ liệu tài khoản khác bằng cách thay một giá trị trong yêu cầu |

---

## 3. Yêu cầu chức năng

Mức ưu tiên: `P0` bắt buộc · `P1` nên có.

### FR-01 Đăng ký `P0`

Tạo tài khoản bằng tên, email, mật khẩu. Email chuẩn hoá về chữ thường. Mật khẩu băm PBKDF2-HMAC-SHA256 210.000 vòng, salt riêng mỗi tài khoản, kết hợp pepper từ kho bí mật. Hoàn tất đăng ký sinh danh mục mặc định theo BR-14 và cấp phiên.

- Email chưa tồn tại, mật khẩu hợp lệ → `201`, phản hồi không chứa trường mật khẩu
- Đăng ký lại cùng email → `409 EMAIL_TAKEN`
- `"A@Gmail.com "` và `"a@gmail.com"` được xử lý như cùng một email
- Mật khẩu 7 ký tự → `400 VALIDATION`
- Sau đăng ký, `GET /v1/categories` trả về tối thiểu 8 danh mục
- Cột `password_hash` không chứa mật khẩu nguyên bản

### FR-02 Đăng nhập `P0`

Cấp access token 15 phút và refresh token 30 ngày trong cookie `HttpOnly`.

- Thông tin đúng → `200`, phản hồi có `Set-Cookie` cho cả hai token, đều mang `HttpOnly`
- Sai mật khẩu → `401 INVALID_CREDENTIALS`
- Email không tồn tại → `401 INVALID_CREDENTIALS`, nội dung trùng khớp trường hợp trên
- Lần thất bại thứ 7 trong vòng 15 phút → `429 RATE_LIMITED`

### FR-03 Duy trì phiên và đăng xuất `P0`

- Refresh token hợp lệ → `200` kèm cặp token mới
- Dùng lại refresh token đã xoay vòng → `401`
- Sau đăng xuất, refresh bằng token đó → `401`
- Sau đăng xuất, gọi endpoint yêu cầu xác thực → `401 UNAUTHENTICATED`

### FR-04 Hồ sơ `P0`

Xem và cập nhật tên hiển thị, múi giờ. Email không thay đổi được ở phiên bản 1.0.

- `GET /v1/me` → `200`, chứa `id`, `email`, `name`, `timezone`, không chứa `password_hash`
- `PATCH /v1/me` với `name` mới → `200`, tên được cập nhật
- `PATCH /v1/me` kèm `email` → email không thay đổi
- Gọi khi chưa xác thực → `401`

### FR-05 Đổi mật khẩu `P0`

Yêu cầu mật khẩu hiện tại. Thành công thu hồi mọi phiên khác, giữ phiên đang thao tác.

- Mật khẩu hiện tại đúng, mật khẩu mới hợp lệ → `200`, đăng nhập bằng mật khẩu mới thành công
- Mật khẩu hiện tại sai → `401 INVALID_CREDENTIALS`, mật khẩu không đổi
- Refresh token của thiết bị khác sau khi đổi → `401`

### FR-06 Quản lý ví `P0`

Tạo, sửa, xoá, lưu trữ, bỏ lưu trữ.

- Tạo ví tên chưa tồn tại → `201`; trùng tên → `409 DUPLICATE_NAME`
- `initialBalance` bằng −1 → `400 VALIDATION`
- Xoá ví chưa có giao dịch → `204`
- Xoá ví đã có giao dịch → `409 WALLET_HAS_TRANSACTIONS`, ví giữ nguyên
- Lưu trữ ví có giao dịch → `200`, ví biến khỏi danh sách chọn, giao dịch lịch sử vẫn truy cập được
- Tài khoản B thao tác trên ví của tài khoản A → `404`

### FR-07 Số dư ví `P0`

Mỗi ví trả về số dư ban đầu, số dư hiện tại, tổng thu, tổng chi.

- Ví `initialBalance` 1.000.000, thêm thu 500.000 → số dư hiện tại 1.500.000
- Thêm tiếp chi 200.000 → 1.300.000
- Xoá giao dịch chi nói trên → 1.500.000
- Sửa giao dịch thu từ 500.000 thành 300.000 → 1.300.000
- Ví không có giao dịch → số dư hiện tại bằng số dư ban đầu

### FR-08 Quản lý danh mục `P0`

Tạo, đổi tên, đổi biểu tượng và màu, xoá, lưu trữ.

- Tạo `"Ăn uống"` loại chi → `201`; tạo lại cùng loại → `409 DUPLICATE_NAME`
- Tạo `"Ăn uống"` loại thu → `201`, khác loại không tính trùng
- Yêu cầu sửa `type` → `400 CATEGORY_TYPE_IMMUTABLE`
- Xoá danh mục còn giao dịch → `409 CATEGORY_HAS_TRANSACTIONS`
- Tài khoản B thao tác trên danh mục của tài khoản A → `404`

### FR-09 Thêm giao dịch `P0`

Đầu vào: số tiền, danh mục, ví, ngày, ghi chú tuỳ chọn.

- Dữ liệu hợp lệ → `201`, số dư ví cập nhật tương ứng
- `amount` bằng 0 hoặc âm → `400 VALIDATION`
- `amount` bằng 1 → `201` (biên dưới hợp lệ)
- `amount` có phần thập phân → `400 VALIDATION`
- `occurredOn` là ngày hiện tại → `201`; ngày kế tiếp → `400 FUTURE_DATE`
- `walletId` hoặc `categoryId` thuộc tài khoản khác → `404`
- Ví đã lưu trữ → `400 WALLET_ARCHIVED`
- Danh mục đã lưu trữ → `400 CATEGORY_ARCHIVED`

### FR-10 Sửa giao dịch `P0`

Áp dụng đầy đủ ràng buộc của FR-09.

- Thay đổi số tiền → số dư ví cập nhật đúng
- Chuyển sang ví khác → số dư của cả ví nguồn và ví đích đều đúng
- Sửa giao dịch của tài khoản khác → `404`

### FR-11 Xoá giao dịch `P0`

- Xoá thành công → `204`, số dư ví hoàn lại
- Xoá lần thứ hai cùng định danh → `404`

### FR-12 Danh sách, tìm kiếm, lọc `P0`

Lọc theo khoảng ngày, ví, danh mục, loại, khoảng số tiền. Tìm kiếm trong ghi chú. Thứ tự mặc định theo ngày giảm dần. Phân trang cursor, mặc định 20, tối đa 100.

- Không truyền bộ lọc → 20 bản ghi mới nhất kèm cursor trang kế tiếp
- `limit=1000` → tối đa 100 bản ghi, không phát sinh lỗi
- `type=expense` → mọi bản ghi thuộc danh mục loại chi
- `from=2026-07-01&to=2026-07-31` → mọi bản ghi nằm trong khoảng, bao gồm hai mút
- Tìm `"cà phê"` → chỉ giao dịch có ghi chú chứa chuỗi này, không phân biệt hoa thường
- Duyệt hết các trang: không bản ghi lặp lại, không bản ghi bỏ sót
- Tài khoản B không nhận được bản ghi nào của tài khoản A

### FR-13 Dashboard `P0`

Phạm vi là tháng được chọn, mặc định tháng hiện tại: tổng thu, tổng chi, chênh lệch, tổng số dư ví chưa lưu trữ, phân bổ chi theo danh mục, 5 giao dịch gần nhất.

- Tài khoản chưa có giao dịch → mọi chỉ số bằng 0, danh sách rỗng, không phát sinh lỗi
- Tổng chi theo danh mục cộng lại bằng tổng chi hiển thị
- Giao dịch tháng trước không được tính vào số liệu tháng hiện tại
- Ví đã lưu trữ không được tính vào tổng số dư

### FR-14 Thống kê `P1`

Phạm vi là khoảng thời gian do người dùng chọn: thu chi theo tháng, 5 danh mục chi nhiều nhất, tổng số giao dịch, chi tiêu trung bình mỗi ngày.

- Chọn khoảng 6 tháng → đúng 6 điểm dữ liệu, tháng không có giao dịch trả về 0
- `from` lớn hơn `to` → `400 VALIDATION`
- Khoảng vượt 24 tháng → `400 VALIDATION`

### FR-15 Kiểm tra tình trạng hệ thống `P0`

- `GET /v1/health` khi chưa xác thực → `200`, chứa `status` và `version`, không truy cập cơ sở dữ liệu

### FR-16 Giao diện tối `P1`

Người dùng chuyển đổi giao diện sáng/tối bằng một nút bấm. Lựa chọn lưu cục bộ trên trình duyệt, không đồng bộ giữa các thiết bị.

- Chọn "Tối" → toàn bộ giao diện chuyển sang bảng màu tối ngay lập tức
- Tải lại trang sau khi chọn "Tối" → giao diện vẫn ở chế độ tối
- Chưa từng chọn → giao diện theo cấu hình hệ điều hành

---

## 4. Quy tắc nghiệp vụ

| Mã | Quy tắc |
|---|---|
| BR-01 | Email duy nhất toàn hệ thống, so sánh sau khi chuẩn hoá về chữ thường |
| BR-02 | Mật khẩu 8–128 ký tự, tối thiểu một chữ cái và một chữ số |
| BR-03 | Số tiền giao dịch là số nguyên trong khoảng 1 đến 999.999.999.999 |
| BR-04 | Ví và danh mục dùng trong giao dịch phải thuộc tài khoản đang thao tác |
| BR-05 | Loại thu chi xác định theo danh mục, không nhận từ đầu vào |
| BR-06 | Ví còn giao dịch tham chiếu không được xoá |
| BR-07 | Danh mục còn giao dịch tham chiếu không được xoá |
| BR-08 | Tài nguyên không thuộc tài khoản đang thao tác trả về `404` |
| BR-09 | Ngày giao dịch không vượt ngày hiện tại theo múi giờ người dùng |
| BR-10 | Tên ví duy nhất trong phạm vi tài khoản, không tính ví đã lưu trữ |
| BR-11 | Tên danh mục duy nhất trong phạm vi tài khoản và loại |
| BR-12 | Trường `type` của danh mục không thay đổi được sau khi tạo |
| BR-13 | Số dư ban đầu ≥ 0; số dư hiện tại không ràng buộc dấu |
| BR-14 | Tài khoản mới được cấp danh mục mặc định — chi: Ăn uống, Di chuyển, Mua sắm, Hoá đơn, Giải trí, Sức khoẻ, Khác; thu: Lương, Thưởng, Khác |
| BR-15 | Không tạo giao dịch mới tham chiếu ví hoặc danh mục đã lưu trữ |
| BR-16 | Refresh token đã dùng bị vô hiệu ngay khi cấp cặp token mới |

---

## 5. Yêu cầu phi chức năng

| Mã | Yêu cầu |
|---|---|
| NFR-01 | Thời gian phản hồi API dưới 500 ms ở phân vị 95 với tập dữ liệu 10.000 giao dịch |
| NFR-02 | Mật khẩu băm PBKDF2-HMAC-SHA256 210.000 vòng kết hợp pepper. Không dùng bcrypt do môi trường Workers không hỗ trợ |
| NFR-03 | Cookie phiên mang `HttpOnly`, `Secure`, `SameSite=Lax`. Phản hồi chứa dữ liệu người dùng mang `Cache-Control: no-store` |
| NFR-04 | Tối đa 6 lần đăng nhập thất bại trong 15 phút cho mỗi cặp (email, IP); yêu cầu tiếp theo bị từ chối |
| NFR-05 | Mọi truy vấn cơ sở dữ liệu chứa điều kiện lọc theo `user_id` |
| NFR-06 | Backend phân tầng route → service → repository. Route không chứa logic nghiệp vụ, repository không chứa quy tắc nghiệp vụ |
| NFR-07 | Toàn bộ dữ liệu đầu vào kiểm tra bằng schema trước khi tới tầng service |
| NFR-08 | Log dạng có cấu trúc, không ghi mật khẩu, token, email, ghi chú người dùng |
| NFR-09 | Mọi màn hình có đủ trạng thái đang tải, rỗng và lỗi |
| NFR-10 | Tương thích Chrome, Edge, Firefox, Safari hai phiên bản gần nhất; bố cục đáp ứng từ 360 px |

---

## 6. Mã lỗi

Tập mã lỗi cố định. Bổ sung mã mới phải cập nhật bảng này trong cùng lần thay đổi mã nguồn.

| Mã | HTTP | Điều kiện phát sinh |
|---|---|---|
| `VALIDATION` | 400 | Dữ liệu đầu vào sai định dạng hoặc vi phạm ràng buộc giá trị |
| `UNAUTHENTICATED` | 401 | Chưa xác thực hoặc token hết hạn |
| `INVALID_CREDENTIALS` | 401 | Sai email hoặc sai mật khẩu |
| `FORBIDDEN` | 403 | Đã xác thực nhưng không đủ quyền |
| `NOT_FOUND` | 404 | Tài nguyên không tồn tại hoặc không thuộc tài khoản |
| `EMAIL_TAKEN` | 409 | Email đã được đăng ký |
| `DUPLICATE_NAME` | 409 | Trùng tên ví hoặc danh mục |
| `WALLET_HAS_TRANSACTIONS` | 409 | Xoá ví còn giao dịch tham chiếu |
| `CATEGORY_HAS_TRANSACTIONS` | 409 | Xoá danh mục còn giao dịch tham chiếu |
| `CATEGORY_TYPE_IMMUTABLE` | 400 | Yêu cầu thay đổi loại của danh mục |
| `FUTURE_DATE` | 400 | Ngày giao dịch vượt ngày hiện tại |
| `WALLET_ARCHIVED` | 400 | Tham chiếu ví đã lưu trữ |
| `CATEGORY_ARCHIVED` | 400 | Tham chiếu danh mục đã lưu trữ |
| `RATE_LIMITED` | 429 | Vượt ngưỡng tần suất yêu cầu |
| `INTERNAL` | 500 | Lỗi không xác định |
