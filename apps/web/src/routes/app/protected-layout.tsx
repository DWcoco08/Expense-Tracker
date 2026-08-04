import { useState } from 'react'
import { Navigate, Outlet } from 'react-router'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useCurrentUser, useLogout } from '@/features/auth/use-auth'
import { applyTheme } from '@/lib/theme'

// Chuyển hướng khi chưa đăng nhập chỉ là trải nghiệm người dùng — bảo mật thật
// nằm ở API (architecture.md mục 10).
export function ProtectedLayout() {
  const { data: user, isLoading, isError } = useCurrentUser()
  const logout = useLogout()
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  function toggleTheme() {
    const next = !isDark
    applyTheme(next ? 'dark' : 'light')
    setIsDark(next)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Đang tải…
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted">
      <AppSidebar
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        userName={user.name}
        onLogout={() => logout.mutate()}
        logoutPending={logout.isPending}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenMobileSidebar={() => setMobileNavOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
