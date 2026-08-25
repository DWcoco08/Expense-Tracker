import { describe, expect, it } from 'vitest'
import { monthRange, parseMonth } from '../src/lib/month'

describe('month helpers', () => {
  it('parses a year and month', () => {
    expect(parseMonth('2026-08')).toEqual([2026, 8])
  })

  it.each([
    ['2026-08', { from: '2026-08-01', toExclusive: '2026-09-01' }],
    ['2026-12', { from: '2026-12-01', toExclusive: '2027-01-01' }],
  ] as const)('returns an exclusive range for %s', (month, expected) => {
    expect(monthRange(month)).toEqual(expected)
  })
})
