import { describe, expect, it } from 'vitest'
import { formatArea, formatPrice } from './format'

/** Intl inserts non-breaking spaces; compare on the digits and symbols instead. */
const normalise = (value: string | null) => value?.replace(/ /g, ' ') ?? null

describe('formatPrice', () => {
  it('formats US dollars for English readers', () => {
    expect(normalise(formatPrice(450000, 'USD', 'en'))).toBe('$450,000')
  })

  it('formats Brazilian reais for Portuguese readers', () => {
    expect(normalise(formatPrice(2400000, 'BRL', 'pt'))).toBe('R$ 2.400.000')
  })

  it('keeps the currency even when it does not match the locale', () => {
    // A dollar listing shown on the Portuguese site is still in dollars.
    expect(normalise(formatPrice(450000, 'USD', 'pt'))).toContain('450.000')
  })

  it('drops the cents', () => {
    expect(normalise(formatPrice(320000.75, 'BRL', 'pt'))).not.toContain(',75')
  })

  it('returns null when there is no price to show', () => {
    expect(formatPrice(null, 'USD', 'en')).toBeNull()
    expect(formatPrice(450000, null, 'en')).toBeNull()
  })
})

describe('formatArea', () => {
  it('groups thousands per locale', () => {
    expect(formatArea(5000, 'en')).toBe('5,000 m²')
    expect(formatArea(5000, 'pt')).toBe('5.000 m²')
  })

  it('returns null when the area is unknown', () => {
    expect(formatArea(null, 'en')).toBeNull()
  })
})
