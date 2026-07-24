import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { DashboardPage } from '@/routes/app/dashboard'
import { ProtectedLayout } from '@/routes/app/protected-layout'
import { LoginPage } from '@/routes/public/login'
import { RegisterPage } from '@/routes/public/register'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
