import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { BudgetsPage } from '@/routes/app/budgets'
import { CategoriesPage } from '@/routes/app/categories'
import { DashboardPage } from '@/routes/app/dashboard'
import { ProtectedLayout } from '@/routes/app/protected-layout'
import { RecurringPage } from '@/routes/app/recurring'
import { StatsPage } from '@/routes/app/stats'
import { TransactionsPage } from '@/routes/app/transactions'
import { WalletsPage } from '@/routes/app/wallets'
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
          <Route path="/wallets" element={<WalletsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
