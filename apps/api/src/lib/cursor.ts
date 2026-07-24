export interface Cursor {
  occurredOn: string
  id: string
}

function pad(base64: string): string {
  const remainder = base64.length % 4
  return remainder === 0 ? base64 : base64 + '='.repeat(4 - remainder)
}

export function encodeCursor(cursor: Cursor): string {
  const json = JSON.stringify({ d: cursor.occurredOn, i: cursor.id })
  return btoa(json).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export function decodeCursor(value: string): Cursor | null {
  try {
    const base64 = pad(value.replaceAll('-', '+').replaceAll('_', '/'))
    const parsed = JSON.parse(atob(base64))
    if (typeof parsed.d !== 'string' || typeof parsed.i !== 'string') return null
    return { occurredOn: parsed.d, id: parsed.i }
  } catch {
    return null
  }
}
