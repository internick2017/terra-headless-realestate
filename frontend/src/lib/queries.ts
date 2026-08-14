import { PropertySchema, toPllLang, type Locale, type Property } from './types'
import { wpQuery } from './wp'

/**
 * Everything PropertySchema needs. Kept in one place so a card and a detail
 * page cannot drift into asking for different fields and failing validation.
 */
const PROPERTY_FIELDS = `
  title
  slug
  propertyFields {
    price
    currency
    operation
    propertyType
    bedrooms
    bathrooms
    areaM2
    address
    neighborhoodName
    latitude
    longitude
    status
    agentName
    agentEmail
    gallery {
      nodes {
        sourceUrl
        altText
      }
    }
  }
`

export const PROPERTIES_QUERY = `
  query Properties($language: LanguageCodeFilterEnum!, $first: Int!) {
    properties(where: { language: $language }, first: $first) {
      nodes {
        ${PROPERTY_FIELDS}
      }
    }
  }
`

/**
 * Listings for the home page. There is no "featured" flag in the CMS, so this
 * is simply the most recent listings in the requested language — enough for a
 * demo, and the query is the same shape a real flag would need.
 */
export async function getFeaturedProperties(locale: Locale, first = 6): Promise<Property[]> {
  const data = await wpQuery<{ properties: { nodes: unknown[] } }>(PROPERTIES_QUERY, {
    language: toPllLang(locale),
    first,
  })

  // Parsing here means a CMS change surfaces as a clear validation error on the
  // server rather than as undefined leaking into the markup.
  return data.properties.nodes.map((node) => PropertySchema.parse(node))
}
