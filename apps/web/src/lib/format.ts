export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

// occurredOn luôn là YYYY-MM-DD (srs.md mục 2.4) — không parse bằng Date để tránh lệch múi giờ
export function formatDate(occurredOn: string): string {
  const [year, month, day] = occurredOn.split('-')
  return `${day}/${month}/${year}`
}

export function formatMonth(month: string): string {
  const [year, mon] = month.split('-')
  return `${mon}/${year}`
}

// Giá trị mặc định cho input[type=date] — máy chủ vẫn tự kiểm tra theo múi giờ
// đã lưu của người dùng (FR-09), đây chỉ là gợi ý ban đầu trên giao diện.
export function todayLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function currentLocalMonth(): string {
  return todayLocalDate().slice(0, 7)
}

export function monthsBeforeLocal(month: string, count: number): string {
  const [yearStr, monthStr] = month.split('-')
  const totalMonths = Number(yearStr) * 12 + (Number(monthStr) - 1) - count
  const year = Math.floor(totalMonths / 12)
  const mon = (totalMonths % 12) + 1
  return `${year}-${String(mon).padStart(2, '0')}`
}
