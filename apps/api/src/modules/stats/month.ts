import { monthRange, parseMonth } from '../../lib/month'

export { monthRange } from '../../lib/month'

export function monthsBetween(from: string, to: string): string[] {
  const [fromYear, fromMon] = parseMonth(from)
  const [toYear, toMon] = parseMonth(to)

  const months: string[] = []
  let year = fromYear
  let month = fromMon
  while (year < toYear || (year === toYear && month <= toMon)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    if (month === 12) {
      year += 1
      month = 1
    } else {
      month += 1
    }
  }
  return months
}

export function daysBetweenMonths(from: string, to: string): number {
  const fromDate = new Date(`${from}-01T00:00:00Z`)
  const { toExclusive } = monthRange(to)
  const toDate = new Date(`${toExclusive}T00:00:00Z`)
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000)
}
