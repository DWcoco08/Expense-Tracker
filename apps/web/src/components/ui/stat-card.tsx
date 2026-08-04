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
      ? 'text-status-danger-text'
      : tone === 'positive'
        ? 'text-status-success-text'
        : 'text-card-foreground'

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}
