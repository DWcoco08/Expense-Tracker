import { useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { useOverview } from '@/features/stats/use-stats'
import { currentLocalMonth, formatCurrency, formatMonth, monthsBeforeLocal } from '@/lib/format'

export function StatsPage() {
  const [to, setTo] = useState(currentLocalMonth())
  const [from, setFrom] = useState(monthsBeforeLocal(currentLocalMonth(), 5))

  const { data, isLoading, isError, error } = useOverview(from, to)

  const chartData = data?.monthly.map((point) => ({
    month: formatMonth(point.month),
    Thu: point.income,
    Chi: point.expense,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Thống kê</h1>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="month"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
          <span className="text-neutral-400">–</span>
          <input
            type="month"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
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

          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Thu chi theo tháng
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" fontSize={12} />
                <YAxis
                  fontSize={12}
                  tickFormatter={(value: number) => formatCurrency(value)}
                  width={90}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="Thu" fill="#22c55e" />
                <Bar dataKey="Chi" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Top danh mục chi nhiều nhất
            </h2>
            {data.topExpenseCategories.length === 0 ? (
              <EmptyState>Chưa có khoản chi nào trong khoảng thời gian này.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {data.topExpenseCategories.map((category) => (
                  <li
                    key={category.categoryId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color ?? '#6b7280' }}
                      />
                      {category.name}
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(category.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
