import { useSearchParams } from 'react-router'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { useOverview } from '@/features/stats/use-stats'
import { currentLocalMonth, formatCurrency, formatMonth, monthsBeforeLocal } from '@/lib/format'

export function StatsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const to = searchParams.get('to') ?? currentLocalMonth()
  const from = searchParams.get('from') ?? monthsBeforeLocal(currentLocalMonth(), 5)

  function updateRange(key: 'from' | 'to', value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(key, value)
        return next
      },
      { replace: true },
    )
  }

  const { data, isLoading, isError, error } = useOverview(from, to)

  const chartData = data?.monthly.map((point) => ({
    month: formatMonth(point.month),
    Thu: point.income,
    Chi: point.expense,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Thống kê</h1>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="month"
            value={from}
            onChange={(e) => updateRange('from', e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-foreground"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="month"
            value={to}
            onChange={(e) => updateRange('to', e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-foreground"
          />
        </div>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="Tổng số giao dịch" value={String(data.totalTransactions)} />
            <StatCard
              label="Chi tiêu trung bình mỗi ngày"
              value={formatCurrency(data.averageExpensePerDay)}
            />
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium text-foreground">Thu chi theo tháng</h2>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(value: number) => formatCurrency(value)}
                    width={90}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="Thu" fill="#16a34a" />
                  <Bar dataKey="Chi" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-medium text-foreground">Top danh mục chi nhiều nhất</h2>
            </CardHeader>
            <CardContent>
              {data.topExpenseCategories.length === 0 ? (
                <EmptyState>Chưa có khoản chi nào trong khoảng thời gian này.</EmptyState>
              ) : (
                <ul className="space-y-2">
                  {data.topExpenseCategories.map((category) => (
                    <li
                      key={category.categoryId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 text-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: category.color ?? '#6b7280' }}
                        />
                        {category.name}
                      </span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(category.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
