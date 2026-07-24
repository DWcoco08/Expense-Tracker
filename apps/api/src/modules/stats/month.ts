// Định dạng "YYYY-MM" đã được Zod xác thực trước khi tới đây (regex ^\d{4}-\d{2}$)
// nên các giá trị mặc định dưới đây không bao giờ thực sự được dùng lúc chạy.
function parseMonth(month: string): [number, number] {
  const [yearStr, monthStr] = month.split('-')
  return [Number(yearStr ?? 0), Number(monthStr ?? 0)]
}

function nextMonthFirstDay(year: number, month: number): string {
  return month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
}

// toExclusive dùng cho điều kiện occurred_on < toExclusive — tránh phải tính
// số ngày trong tháng (28/29/30/31) khi lọc khoảng ngày.
export function monthRange(month: string): { from: string; toExclusive: string } {
  const [year, mon] = parseMonth(month)
  return { from: `${month}-01`, toExclusive: nextMonthFirstDay(year, mon) }
}

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
