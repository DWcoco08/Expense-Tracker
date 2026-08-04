import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { useCurrentUser, useRegister } from '@/features/auth/use-auth'
import { parseApiError } from '@/lib/api'

export function RegisterPage() {
  const navigate = useNavigate()
  const { data: user, isLoading: isCheckingSession } = useCurrentUser()
  const register = useRegister()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (isCheckingSession) return null
  if (user) return <Navigate to="/" replace />

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    register.mutate(
      { name, email, password },
      { onSuccess: () => navigate('/', { replace: true }) },
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Đăng ký</h1>
          <p className="text-sm text-muted-foreground">Expense Tracker — quản lý thu chi cá nhân</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Tên hiển thị" htmlFor="name">
            <Input
              id="name"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Field label="Mật khẩu" htmlFor="password">
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Tối thiểu 8 ký tự, gồm ít nhất một chữ và một số.
            </p>
          </Field>

          {register.isError && (
            <p className="text-sm text-status-danger-text" role="alert">
              {parseApiError(register.error)}
            </p>
          )}

          <Button type="submit" disabled={register.isPending} className="w-full">
            {register.isPending ? 'Đang tạo tài khoản…' : 'Đăng ký'}
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">hoặc</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Điều hướng cả trang, không phải fetch — luồng OAuth cần trình duyệt chuyển tới Google */}
        <a
          href="/v1/auth/google/start"
          className="block w-full rounded-md border border-input px-3 py-2 text-center text-sm font-medium text-foreground hover:bg-muted"
        >
          Đăng ký bằng Google
        </a>

        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-medium text-foreground underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  )
}
