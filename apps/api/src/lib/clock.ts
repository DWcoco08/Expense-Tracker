// en-CA định dạng ngày theo thứ tự YYYY-MM-DD, khớp luôn định dạng lưu trong DB.
// Tách hàm riêng để dễ kiểm thử độc lập với đồng hồ hệ thống (NFR-12).
export function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
