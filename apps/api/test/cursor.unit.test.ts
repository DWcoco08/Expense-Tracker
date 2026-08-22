import { describe, expect, it } from 'vitest'
import { decodeCursor, encodeCursor } from '../src/lib/cursor'

describe('cursor helpers', () => {
  it('round-trips transaction date and id', () => {
    const cursor = { occurredOn: '2026-08-22', id: 'transaction-1' }

    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor)
  })

  it('returns null for malformed or incomplete cursors', () => {
    expect(decodeCursor('not-base64')).toBeNull()
    expect(decodeCursor(btoa(JSON.stringify({ occurredOn: '2026-08-22' })))).toBeNull()
  })
})
