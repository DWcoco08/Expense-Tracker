import { describe, expect, it } from 'vitest'
import { toCsv } from '../src/lib/csv'

describe('toCsv', () => {
  it('escapes RFC 4180 special fields', () => {
    expect(
      toCsv(
        ['name', 'note'],
        [
          ['Alice, Inc.', 'said "hello"'],
          ['Bob', 'line 1\nline 2'],
        ],
      ),
    ).toBe('name,note\r\n"Alice, Inc.","said ""hello"""\r\nBob,"line 1\nline 2"')
  })

  it('writes a header for an empty result', () => {
    expect(toCsv(['date', 'amount'], [])).toBe('date,amount')
  })

  it('quotes carriage returns and preserves empty fields', () => {
    expect(toCsv(['note', 'category'], [['line 1\rline 2', '']])).toBe(
      'note,category\r\n"line 1\rline 2",',
    )
  })
})
