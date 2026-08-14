import { describe, expect, it } from 'vitest'
import { filterProperties, parseFilters, type FilterCriteria } from './filter'
import type { Property } from './types'

/** Minimal property; each test overrides only what it cares about. */
const p = (overrides: Partial<Property> = {}): Property =>
  ({
    title: 'A place',
    slug: 'a-place',
    price: 100_000,
    currency: 'USD',
    operation: 'sale',
    propertyType: 'house',
    bedrooms: 2,
    bathrooms: 1,
    areaM2: 90,
    address: null,
    neighborhoodName: 'Downtown',
    latitude: null,
    longitude: null,
    status: 'available',
    gallery: [],
    agentName: null,
    agentEmail: null,
    ...overrides,
  }) as Property

describe('filterProperties', () => {
  it('returns everything when no criteria are given', () => {
    const list = [p(), p({ slug: 'b' })]

    expect(filterProperties(list, {})).toHaveLength(2)
  })

  it('filters by operation', () => {
    const list = [p({ operation: 'sale' }), p({ slug: 'b', operation: 'rent' })]

    expect(filterProperties(list, { operation: 'sale' })).toHaveLength(1)
    expect(filterProperties(list, { operation: 'rent' })[0].slug).toBe('b')
  })

  it('filters by property type', () => {
    const list = [p({ propertyType: 'house' }), p({ slug: 'b', propertyType: 'land' })]

    expect(filterProperties(list, { propertyType: 'land' })[0].slug).toBe('b')
  })

  it('applies a price range inclusively', () => {
    const list = [p({ price: 100 }), p({ slug: 'b', price: 200 }), p({ slug: 'c', price: 300 })]

    expect(filterProperties(list, { minPrice: 200 })).toHaveLength(2)
    expect(filterProperties(list, { maxPrice: 200 })).toHaveLength(2)
    expect(filterProperties(list, { minPrice: 200, maxPrice: 200 })).toHaveLength(1)
  })

  it('combines criteria', () => {
    const list = [p({ price: 100 }), p({ slug: 'b', price: 300, operation: 'rent' })]

    expect(filterProperties(list, { operation: 'sale', minPrice: 150 })).toHaveLength(0)
    expect(filterProperties(list, { operation: 'sale' })).toHaveLength(1)
  })

  it('treats minBedrooms as "at least"', () => {
    const list = [p({ bedrooms: 1 }), p({ slug: 'b', bedrooms: 3 })]

    expect(filterProperties(list, { minBedrooms: 2 })).toHaveLength(1)
    expect(filterProperties(list, { minBedrooms: 0 })).toHaveLength(2)
  })

  it('matches neighborhood regardless of case', () => {
    const list = [p({ neighborhoodName: 'Beira-Rio' })]

    expect(filterProperties(list, { neighborhood: 'beira-rio' })).toHaveLength(1)
  })

  it('excludes listings with no price once a price bound is set', () => {
    // A listing with no price cannot be shown to satisfy "under 200k": we do not
    // know that it does, and showing it would mislead.
    const list = [p({ price: null })]

    expect(filterProperties(list, {})).toHaveLength(1)
    expect(filterProperties(list, { maxPrice: 200_000 })).toHaveLength(0)
    expect(filterProperties(list, { minPrice: 1 })).toHaveLength(0)
  })

  it('does not mutate the list it is given', () => {
    const list = [p(), p({ slug: 'b', operation: 'rent' })]

    filterProperties(list, { operation: 'sale' })

    expect(list).toHaveLength(2)
  })
})

describe('parseFilters', () => {
  it('reads criteria out of URL search params', () => {
    const params = new URLSearchParams({
      operation: 'rent',
      type: 'apartment',
      minPrice: '1000',
      maxPrice: '5000',
      bedrooms: '2',
      neighborhood: 'Downtown',
    })

    expect(parseFilters(params)).toEqual<FilterCriteria>({
      operation: 'rent',
      propertyType: 'apartment',
      minPrice: 1000,
      maxPrice: 5000,
      minBedrooms: 2,
      neighborhood: 'Downtown',
    })
  })

  it('ignores empty, absent and non-numeric values', () => {
    const params = new URLSearchParams({ operation: '', minPrice: 'cheap', bedrooms: '' })

    expect(parseFilters(params)).toEqual({})
  })

  it('ignores values outside the allowed choices', () => {
    // A hand-edited URL should not slip an unknown operation into the filter.
    const params = new URLSearchParams({ operation: 'barter', type: 'castle' })

    expect(parseFilters(params)).toEqual({})
  })
})
