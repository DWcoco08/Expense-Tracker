import { useState } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router'
import { useCurrentUser, useLogout } from '@/features/auth/use-auth'
import { NotificationBell } from '@/features/notifications/notification-bell'
import { applyTheme } from '@/lib/theme'

const NAV_ITEMS = [
  { to: '/', label: 'Tổng quan' },
  { to: '/transactions', label: 'Giao dịch' },
  { to: '/recurring', label: 'Định kỳ' },
  { to: '/wallets', label: 'Ví' },
  { to: '/categories', label: 'Danh mục' },
  { to: '/budgets', label: 'Ngân sách' },
  { to: '/stats', label: 'Thống kê' },
]

// Chuyển hướng khi chưa đăng nhập chỉ là trải nghiệm người dùng — bảo mật thật
// nằm ở API (architecture.md mục 10).
export function ProtectedLayout() {
  const { data: user, isLoading, isError } = useCurrentUser()
  const logout = useLogout()
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggleTheme() {
    const next = !isDark
    applyTheme(next ? 'dark' : 'light')
    setIsDark(next)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        Đang tải…
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <span className="shrink-0 font-semibold text-neutral-900 dark:text-neutral-100">
            Expense Tracker
          </span>
          <div className="flex items-center gap-2 text-sm sm:gap-3">
            <span className="hidden max-w-[8rem] truncate text-neutral-600 sm:inline dark:text-neutral-400">
              {user.name}
            </span>
            <NotificationBell />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
            >
              {isDark ? 'Sáng' : 'Tối'}
            </button>
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
            >
              Đăng xuất
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
