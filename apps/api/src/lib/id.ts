// UUIDv7: 48-bit timestamp + version/variant + random. Sắp xếp được theo thời gian
// tạo (architecture.md mục 7) nên dùng làm khoá chính thay cho auto-increment.
export function generateId(): string {
  const timestamp = BigInt(Date.now())
  const random = crypto.getRandomValues(new Uint8Array(10))

  const bytes = new Uint8Array(16)
  bytes[0] = Number((timestamp >> 40n) & 0xffn)
  bytes[1] = Number((timestamp >> 32n) & 0xffn)
  bytes[2] = Number((timestamp >> 24n) & 0xffn)
  bytes[3] = Number((timestamp >> 16n) & 0xffn)
  bytes[4] = Number((timestamp >> 8n) & 0xffn)
  bytes[5] = Number(timestamp & 0xffn)
  bytes[6] = 0x70 | ((random[0] ?? 0) & 0x0f)
  bytes[7] = random[1] ?? 0
  bytes[8] = 0x80 | ((random[2] ?? 0) & 0x3f)
  bytes[9] = random[3] ?? 0
  bytes[10] = random[4] ?? 0
  bytes[11] = random[5] ?? 0
  bytes[12] = random[6] ?? 0
  bytes[13] = random[7] ?? 0
  bytes[14] = random[8] ?? 0
  bytes[15] = random[9] ?? 0

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
