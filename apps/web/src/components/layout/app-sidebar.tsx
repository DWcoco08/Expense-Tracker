import {
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Repeat,
  Tags,
  Wallet,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router'

const NAV_ITEMS = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/transactions', label: 'Giao dịch', icon: ArrowLeftRight },
  { to: '/recurring', label: 'Định kỳ', icon: Repeat },
  { to: '/wallets', label: 'Ví', icon: Wallet },
  { to: '/categories', label: 'Danh mục', icon: Tags },
  { to: '/budgets', label: 'Ngân sách', icon: PiggyBank },
  { to: '/stats', label: 'Thống kê', icon: BarChart3 },
]

interface AppSidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
  userName: string
  onLogout: () => void
  logoutPending: boolean
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
              isActive
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            }`
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarFooter({
  userName,
  onLogout,
  logoutPending,
}: Pick<AppSidebarProps, 'userName' | 'onLogout' | 'logoutPending'>) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <p className="truncate px-3 text-sm text-sidebar-foreground">{userName}</p>
      <button
        type="button"
        onClick={onLogout}
        disabled={logoutPending}
        className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent disabled:opacity-50"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Đăng xuất
      </button>
    </div>
  )
}

export function AppSidebar({
  mobileOpen,
  onCloseMobile,
  userName,
  onLogout,
  logoutPending,
}: AppSidebarProps) {
  return (
    <>
      <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4 font-semibold text-sidebar-foreground">
          Expense Tracker
        </div>
        <NavList />
        <SidebarFooter userName={userName} onLogout={onLogout} logoutPending={logoutPending} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative flex h-full w-64 flex-col bg-sidebar">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
              <span className="font-semibold text-sidebar-foreground">Expense Tracker</span>
              <button
                type="button"
                aria-label="Đóng"
                onClick={onCloseMobile}
                className="text-sidebar-foreground/70"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList onNavigate={onCloseMobile} />
            <SidebarFooter userName={userName} onLogout={onLogout} logoutPending={logoutPending} />
          </div>
        </div>
      )}
    </>
  )
}
