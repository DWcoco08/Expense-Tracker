export function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'negative' | 'positive'
}) {
  const toneClass =
    tone === 'negative'
      ? 'text-red-600 dark:text-red-400'
      : tone === 'positive'
        ? 'text-green-600 dark:text-green-400'
        : 'text-neutral-900 dark:text-neutral-100'

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}
