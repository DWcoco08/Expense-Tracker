import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useCurrentUser, useLogin } from '@/features/auth/use-auth'
import { parseApiError } from '@/lib/api'

export function LoginPage() {
  const navigate = useNavigate()
  const { data: user, isLoading: isCheckingSession } = useCurrentUser()
  const login = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (isCheckingSession) return null
  if (user) return <Navigate to="/" replace />

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    login.mutate({ email, password }, { onSuccess: () => navigate('/', { replace: true }) })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Đăng nhập
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Expense Tracker — quản lý thu chi cá nhân
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>

          {login.isError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {parseApiError(login.error)}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          <span className="text-xs text-neutral-400">hoặc</span>
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        </div>

        {/* Điều hướng cả trang, không phải fetch — luồng OAuth cần trình duyệt chuyển tới Google */}
        <a
          href="/v1/auth/google/start"
          className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
        >
          Đăng nhập bằng Google
        </a>

        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            className="font-medium text-neutral-900 underline dark:text-neutral-100"
          >
            Đăng ký
          </Link>
        </p>
      </div>
    </main>
  )
}
