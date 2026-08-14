import { describe, expect, it } from 'vitest'
import { PropertySchema, isLocale, toPllLang } from './types'

/**
 * Shaped after a real response from the local WordPress: ACF selects arrive as
 * arrays, empty numbers arrive as null, and an empty gallery arrives as null.
 */
const landLotNode = {
  title: 'Riverside Land Lot',
  slug: 'riverside-land-lot',
  propertyFields: {
    price: 320000,
    currency: ['BRL'],
    operation: ['sale'],
    propertyType: ['land'],
    bedrooms: null,
    bathrooms: null,
    areaM2: 5000,
    address: 'Lot 14, Riverside Road',
    neighborhoodName: 'Riverside',
    latitude: 40.7372,
    longitude: -74.0269,
    status: ['sold'],
    gallery: null,
    agentName: 'Ana Costa',
    agentEmail: 'ana.costa@terrahomes.example',
  },
}

describe('PropertySchema', () => {
  it('unwraps ACF select fields from their arrays', () => {
    const property = PropertySchema.parse(landLotNode)

    expect(property.currency).toBe('BRL')
    expect(property.operation).toBe('sale')
    expect(property.propertyType).toBe('land')
    expect(property.status).toBe('sold')
  })

  it('turns null bedroom and bathroom counts into 0', () => {
    const property = PropertySchema.parse(landLotNode)

    expect(property.bedrooms).toBe(0)
    expect(property.bathrooms).toBe(0)
  })

  it('turns a null gallery into an empty array', () => {
    const property = PropertySchema.parse(landLotNode)

    expect(property.gallery).toEqual([])
  })

  it('flattens propertyFields onto the property', () => {
    const property = PropertySchema.parse(landLotNode)

    expect(property.title).toBe('Riverside Land Lot')
    expect(property.slug).toBe('riverside-land-lot')
    expect(property.price).toBe(320000)
    expect(property).not.toHaveProperty('propertyFields')
  })

  it('reads a populated gallery', () => {
    const property = PropertySchema.parse({
      ...landLotNode,
      propertyFields: {
        ...landLotNode.propertyFields,
        gallery: {
          nodes: [
            { sourceUrl: 'https://example.test/a.jpg', altText: 'Front view' },
            { sourceUrl: 'https://example.test/b.jpg', altText: null },
          ],
        },
      },
    })

    expect(property.gallery).toHaveLength(2)
    expect(property.gallery[0]).toEqual({
      sourceUrl: 'https://example.test/a.jpg',
      altText: 'Front view',
    })
  })

  it('rejects a select value outside the allowed choices', () => {
    const result = PropertySchema.safeParse({
      ...landLotNode,
      propertyFields: { ...landLotNode.propertyFields, operation: ['barter'] },
    })

    expect(result.success).toBe(false)
  })
})

describe('locales', () => {
  it('accepts the two shipped locales and nothing else', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('pt')).toBe(true)
    expect(isLocale('fr')).toBe(false)
  })

  it('maps a route locale to the Polylang enum', () => {
    expect(toPllLang('en')).toBe('EN')
    expect(toPllLang('pt')).toBe('PT')
  })
})
