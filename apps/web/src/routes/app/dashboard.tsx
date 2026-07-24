import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { useDashboard } from '@/features/stats/use-stats'
import { formatCurrency, formatDate, formatMonth } from '@/lib/format'

const DEFAULT_COLOR = '#6b7280'

export function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboard()

  if (isLoading) return <LoadingState />
  if (isError) return <ErrorState error={error} />
  if (!data) return null

  const hasExpenseData = data.expenseByCategory.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Tổng quan tháng {formatMonth(data.month)}
        </h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng thu" value={formatCurrency(data.totalIncome)} tone="positive" />
        <StatCard label="Tổng chi" value={formatCurrency(data.totalExpense)} tone="negative" />
        <StatCard
          label="Chênh lệch"
          value={formatCurrency(data.net)}
          tone={data.net < 0 ? 'negative' : 'positive'}
        />
        <StatCard
          label="Tổng số dư"
          value={formatCurrency(data.totalBalance)}
          tone={data.totalBalance < 0 ? 'negative' : 'default'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Chi tiêu theo danh mục
          </h2>
          {hasExpenseData ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.expenseByCategory}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                >
                  {data.expenseByCategory.map((entry) => (
                    <Cell key={entry.categoryId} fill={entry.color ?? DEFAULT_COLOR} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState>Chưa có khoản chi nào trong tháng này.</EmptyState>
          )}
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Giao dịch gần đây
          </h2>
          {data.recentTransactions.length === 0 ? (
            <EmptyState>Chưa có giao dịch nào.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {data.recentTransactions.map((transaction) => (
                <li key={transaction.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-neutral-900 dark:text-neutral-100">
                      {transaction.category.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDate(transaction.occurredOn)} · {transaction.wallet.name}
                    </p>
                  </div>
                  <span
                    className={
                      transaction.type === 'income'
                        ? 'font-medium text-green-600 dark:text-green-400'
                        : 'font-medium text-neutral-900 dark:text-neutral-100'
                    }
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
