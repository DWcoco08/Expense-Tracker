import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
        <h1 className="text-2xl font-semibold text-foreground">
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
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium text-foreground">Chi tiêu theo danh mục</h2>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium text-foreground">Giao dịch gần đây</h2>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <EmptyState>Chưa có giao dịch nào.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {data.recentTransactions.map((transaction) => (
                  <li key={transaction.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-foreground">{transaction.category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.occurredOn)} · {transaction.wallet.name}
                      </p>
                    </div>
                    <span
                      className={
                        transaction.type === 'income'
                          ? 'font-medium text-status-success-text'
                          : 'font-medium text-foreground'
                      }
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
