Feature('Frontend End-to-End User Flow')

const API_BASE_URL = 'http://localhost:8787'
const TEST_USER = { name: 'E2E Test User', email: 'user1@example.com', password: 'matkhau123' }

Before(async () => {
  // Đảm bảo tài khoản test tồn tại trước khi chạy, gọi thẳng API bằng fetch của
  // Node (không qua trình duyệt) — register tự đăng nhập, nếu làm qua UI sẽ để
  // lại session sẵn trong trình duyệt và phá bước Login của Scenario bên dưới.
  const res = await fetch(`${API_BASE_URL}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER),
  })
  // 2xx = vừa tạo mới; 4xx (EMAIL_TAKEN) = đã có sẵn từ lần chạy trước — cả hai đều ổn.
  if (res.status >= 500) {
    throw new Error(`Setup: server error while ensuring test user exists (${res.status})`)
  }
})

Scenario(
  'Luồng người dùng hoàn chỉnh: Login -> Dashboard -> Wallet -> Category -> Transaction -> Statistics',
  ({ I }) => {
    // 1. LOGIN
    I.amOnPage('/login')
    I.see('Đăng nhập')
    I.fillField('Email', 'user1@example.com')
    I.fillField('Mật khẩu', 'matkhau123')
    I.click('Đăng nhập')

    // Đợi đăng nhập xong bằng cách tìm nút Đăng xuất
    I.waitForText('Đăng xuất', 10)
    I.see('Tổng quan')

    // 2. WALLET
    I.click('Ví')
    I.waitInUrl('/wallets', 5)
    I.see('Thêm ví') // Chữ này chỉ xuất hiện ở màn hình Ví

    // 3. CATEGORY
    I.click('Danh mục')
    I.waitInUrl('/categories', 5)

    // 4. TRANSACTION
    I.click('Giao dịch')
    I.waitInUrl('/transactions', 5)

    // 5. STATISTICS
    I.click('Thống kê')
    I.waitInUrl('/stats', 5)
  },
)
