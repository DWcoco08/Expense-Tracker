// Escape theo RFC 4180 — bọc ngoặc kép khi trường chứa dấu phẩy, ngoặc kép, hoặc xuống dòng.
function escapeField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

// Hàm thuần, không I/O — dễ kiểm thử độc lập.
export function toCsv(header: string[], rows: string[][]): string {
  return [header, ...rows].map((row) => row.map(escapeField).join(',')).join('\r\n')
}
