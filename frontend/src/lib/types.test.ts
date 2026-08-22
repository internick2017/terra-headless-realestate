import { describe, expect, it } from 'vitest'
import {
  PropertyDetailSchema,
  PropertySchema,
  fromPllLang,
  isLocale,
  resolvePropertyRoute,
  toPllLang,
} from './types'

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

describe('fromPllLang', () => {
  it('maps a Polylang code back to our locale', () => {
    expect(fromPllLang('EN')).toBe('en')
    expect(fromPllLang('PT')).toBe('pt')
  })

  it('accepts a code that is already lowercase', () => {
    expect(fromPllLang('pt')).toBe('pt')
  })

  it('rejects a language the site does not ship', () => {
    expect(fromPllLang('FR')).toBeNull()
  })

  it('rejects a missing language rather than guessing a default', () => {
    // A post with no language must not silently pass as English: that is the
    // whole point of the check in getProperty.
    expect(fromPllLang(null)).toBeNull()
  })
})

describe('PropertyDetailSchema', () => {
  const detailNode = {
    ...landLotNode,
    content: '<p>A riverside lot.</p>',
    language: { code: 'EN' },
    translations: [],
  }

  it('keeps the body and the language alongside the flattened fields', () => {
    const property = PropertyDetailSchema.parse(detailNode)

    expect(property.content).toBe('<p>A riverside lot.</p>')
    expect(property.languageCode).toBe('EN')
    expect(property.areaM2).toBe(5000)
  })

  it('survives a post with no body and no language', () => {
    const property = PropertyDetailSchema.parse({
      ...detailNode,
      content: null,
      language: null,
    })

    expect(property.content).toBeNull()
    expect(property.languageCode).toBeNull()
  })

  it('flattens the translations into slugs and language codes', () => {
    const property = PropertyDetailSchema.parse({
      ...detailNode,
      translations: [{ slug: 'lote-na-beira-rio', language: { code: 'PT' } }],
    })

    expect(property.translations).toEqual([{ slug: 'lote-na-beira-rio', languageCode: 'PT' }])
  })

  it('treats a listing with no translations as having none, not as broken', () => {
    expect(PropertyDetailSchema.parse({ ...detailNode, translations: null }).translations).toEqual(
      [],
    )
  })
})

describe('resolvePropertyRoute', () => {
  const english = {
    languageCode: 'EN',
    translations: [{ slug: 'vila-na-beira-rio', languageCode: 'PT' }],
  }

  it('renders when the URL already asks for the language the listing is in', () => {
    expect(resolvePropertyRoute(english, 'en')).toEqual({ action: 'render' })
  })

  it('redirects to the translation when the URL asks for the other language', () => {
    // What the language switcher produces: it swaps /en for /pt but leaves the
    // English slug in place, so this is the common case, not an edge one.
    expect(resolvePropertyRoute(english, 'pt')).toEqual({
      action: 'redirect',
      slug: 'vila-na-beira-rio',
    })
  })

  it('404s when the listing has no version in the requested language', () => {
    expect(resolvePropertyRoute({ languageCode: 'EN', translations: [] }, 'pt')).toEqual({
      action: 'notFound',
    })
  })

  it('404s rather than guessing when the listing has no language at all', () => {
    expect(resolvePropertyRoute({ languageCode: null, translations: [] }, 'en')).toEqual({
      action: 'notFound',
    })
  })

  it('ignores a translation in a language the site does not ship', () => {
    const withFrench = {
      languageCode: 'EN',
      translations: [{ slug: 'villa-au-bord-de-riviere', languageCode: 'FR' }],
    }

    expect(resolvePropertyRoute(withFrench, 'pt')).toEqual({ action: 'notFound' })
  })
})
