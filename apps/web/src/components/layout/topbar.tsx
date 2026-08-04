import { Menu, Moon, Sun } from 'lucide-react'
import { NotificationBell } from '@/features/notifications/notification-bell'

interface TopbarProps {
  onOpenMobileSidebar: () => void
  isDark: boolean
  onToggleTheme: () => void
}

export function Topbar({ onOpenMobileSidebar, isDark, onToggleTheme }: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        aria-label="Mở menu"
        className="text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2 md:ml-auto md:gap-4">
        <NotificationBell />
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          className="rounded-md border border-input p-2 text-foreground hover:bg-muted"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  )
}
