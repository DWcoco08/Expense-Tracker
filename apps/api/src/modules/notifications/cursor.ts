// Cursor riêng cho notifications: khoá sắp xếp là created_at (number), khác kiểu
// occurred_on (string) của lib/cursor.ts dùng cho transactions — không tái dùng để
// tránh đổi hợp đồng của module transactions đang chạy ổn định.
export interface NotificationCursor {
  createdAt: number
  id: string
}

function pad(base64: string): string {
  const remainder = base64.length % 4
  return remainder === 0 ? base64 : base64 + '='.repeat(4 - remainder)
}

export function encodeCursor(cursor: NotificationCursor): string {
  const json = JSON.stringify({ c: cursor.createdAt, i: cursor.id })
  return btoa(json).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export function decodeCursor(value: string): NotificationCursor | null {
  try {
    const base64 = pad(value.replaceAll('-', '+').replaceAll('_', '/'))
    const parsed = JSON.parse(atob(base64))
    if (typeof parsed.c !== 'number' || typeof parsed.i !== 'string') return null
    return { createdAt: parsed.c, id: parsed.i }
  } catch {
    return null
  }
}
