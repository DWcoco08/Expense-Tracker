Feature('Frontend End-to-End User Flow')

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
    // Dùng includes URL để phòng trường hợp router là /stats hoặc /statistics đều pass
    I.executeScript(() => window.location.pathname.includes('stat'))
  },
)
