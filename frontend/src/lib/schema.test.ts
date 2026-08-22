import { describe, expect, it } from 'vitest'
import { neighborhoodJsonLd, propertyJsonLd } from './schema'
import type { Neighborhood, PropertyDetail } from './types'

function property(overrides: Partial<PropertyDetail> = {}): PropertyDetail {
  return {
    title: 'Riverside Villa',
    slug: 'riverside-villa',
    content: '<p>An expansive five-bedroom villa.</p>',
    languageCode: 'EN',
    translations: [],
    price: 450000,
    currency: 'USD',
    operation: 'sale',
    propertyType: 'house',
    bedrooms: 5,
    bathrooms: 4,
    areaM2: 380,
    address: '8 Riverside Drive',
    neighborhoodName: 'Riverside',
    latitude: 40.7368,
    longitude: -74.0261,
    status: 'available',
    gallery: [{ sourceUrl: 'https://cms.test/villa-0.jpg', altText: 'Exterior' }],
    agentName: 'Ana Ribeiro',
    agentEmail: 'ana@example.com',
    ...overrides,
  }
}

const url = 'https://terra.example.com/en/properties/riverside-villa'

/**
 * JSON-LD is a bag of loosely typed keys by nature, so the tests assert its
 * shape with toMatchObject rather than reaching into it through casts.
 */
const ld = (p: PropertyDetail) => propertyJsonLd(p, 'en', url)

describe('propertyJsonLd', () => {
  it('is a RealEstateListing at its own URL', () => {
    expect(ld(property())).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      url,
      inLanguage: 'en',
    })
  })

  it('strips the HTML out of the description', () => {
    expect(ld(property()).description).toBe('An expansive five-bedroom villa.')
  })

  it('describes a house as a residence and an apartment as an apartment', () => {
    expect(ld(property())).toMatchObject({ about: { '@type': 'SingleFamilyResidence' } })
    expect(ld(property({ propertyType: 'apartment' }))).toMatchObject({
      about: { '@type': 'Apartment' },
    })
  })

  it('refuses to call a lot or a shop a residence', () => {
    // Being vague beats being wrong: schema.org has no honest residence type
    // for either.
    expect(ld(property({ propertyType: 'land' }))).toMatchObject({ about: { '@type': 'Place' } })
    expect(ld(property({ propertyType: 'commercial' }))).toMatchObject({
      about: { '@type': 'Place' },
    })
  })

  it('gives the floor area the unit code schema.org expects, not "m²"', () => {
    expect(ld(property())).toMatchObject({
      about: { floorSize: { '@type': 'QuantitativeValue', value: 380, unitCode: 'MTK' } },
    })
  })

  it('carries the address and the coordinates', () => {
    expect(ld(property())).toMatchObject({
      about: {
        address: { streetAddress: '8 Riverside Drive', addressLocality: 'Riverside' },
        geo: { '@type': 'GeoCoordinates', latitude: 40.7368, longitude: -74.0261 },
      },
    })
  })

  it('prices a sale and a rental with different business functions', () => {
    expect(JSON.stringify(ld(property()))).toContain('#Sell')
    expect(JSON.stringify(ld(property({ operation: 'rent' })))).toContain('#LeaseOut')
  })

  it('maps the status onto schema.org availability', () => {
    expect(ld(property({ status: 'available' }))).toMatchObject({
      offers: { availability: 'https://schema.org/InStock' },
    })
    expect(ld(property({ status: 'sold' }))).toMatchObject({
      offers: { availability: 'https://schema.org/SoldOut' },
    })
  })

  it('omits the offer entirely when there is no price', () => {
    // An offer with no price is worse than no offer: it claims the listing is
    // for sale at nothing.
    expect(ld(property({ price: null }))).not.toHaveProperty('offers')
  })

  it('omits rooms a listing does not have rather than claiming zero', () => {
    const land = ld(property({ propertyType: 'land', bedrooms: 0, bathrooms: 0 }))

    expect(land.about).not.toHaveProperty('numberOfBedrooms')
    expect(land.about).not.toHaveProperty('numberOfBathroomsTotal')
  })

  it('drops every empty key rather than emitting null', () => {
    const bare = ld(
      property({
        content: null,
        address: null,
        neighborhoodName: null,
        latitude: null,
        longitude: null,
        areaM2: null,
        gallery: [],
      }),
    )

    expect(JSON.stringify(bare)).not.toContain('null')
    expect(bare.about).not.toHaveProperty('address')
    expect(bare).not.toHaveProperty('image')
  })

  it('survives being serialised, which is the only thing that ships', () => {
    expect(() => JSON.stringify(ld(property()))).not.toThrow()
  })
})

describe('neighborhoodJsonLd', () => {
  const neighborhood: Neighborhood = {
    title: 'Riverside',
    slug: 'riverside',
    excerpt: '<p>Riverside runs along the water.</p>',
    content: '<p>Long body.</p>',
    languageCode: 'EN',
    translations: [],
  }

  it('is an Article about a Place', () => {
    const json = neighborhoodJsonLd(
      neighborhood,
      'en',
      'https://terra.example.com/en/neighborhoods/riverside',
    )

    expect(json).toMatchObject({
      '@type': 'Article',
      headline: 'Riverside',
      description: 'Riverside runs along the water.',
      about: { '@type': 'Place', name: 'Riverside' },
    })
  })

  it('omits the description when the post has no excerpt', () => {
    const json = neighborhoodJsonLd({ ...neighborhood, excerpt: null }, 'pt', 'https://x.test/a')

    expect(json).not.toHaveProperty('description')
  })
})
