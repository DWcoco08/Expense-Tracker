import { Navigate, NavLink, Outlet } from 'react-router'
import { useCurrentUser, useLogout } from '@/features/auth/use-auth'

const NAV_ITEMS = [
  { to: '/', label: 'Tổng quan' },
  { to: '/transactions', label: 'Giao dịch' },
  { to: '/wallets', label: 'Ví' },
  { to: '/categories', label: 'Danh mục' },
  { to: '/stats', label: 'Thống kê' },
]

// Chuyển hướng khi chưa đăng nhập chỉ là trải nghiệm người dùng — bảo mật thật
// nằm ở API (architecture.md mục 10).
export function ProtectedLayout() {
  const { data: user, isLoading, isError } = useCurrentUser()
  const logout = useLogout()

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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            Expense Tracker
          </span>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">{user.name}</span>
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
            >
              Đăng xuất
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `border-b-2 px-3 py-2 text-sm font-medium ${
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
