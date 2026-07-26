// Định dạng "YYYY-MM" đã được Zod xác thực trước khi tới đây (regex ^\d{4}-\d{2}$)
// nên các giá trị mặc định dưới đây không bao giờ thực sự được dùng lúc chạy.
export function parseMonth(month: string): [number, number] {
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
