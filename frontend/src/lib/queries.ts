import {
  PropertyDetailSchema,
  PropertySchema,
  fromPllLang,
  toPllLang,
  type Locale,
  type Property,
  type PropertyDetail,
} from './types'
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

/**
 * The whole catalogue for the requested language. The demo has a handful of
 * listings, so the listings page fetches them once and filters in memory rather
 * than issuing a query per filter change: instant filtering, and the filter
 * logic stays a pure function.
 *
 * A real catalogue would move the criteria into the GraphQL `where` argument.
 */
export async function getAllProperties(locale: Locale, first = 100): Promise<Property[]> {
  const data = await wpQuery<{ properties: { nodes: unknown[] } }>(PROPERTIES_QUERY, {
    language: toPllLang(locale),
    first,
  })

  return data.properties.nodes.map((node) => PropertySchema.parse(node))
}

export const PROPERTY_QUERY = `
  query Property($slug: String!) {
    properties(where: { name: $slug }, first: 1) {
      nodes {
        content
        language {
          code
        }
        ${PROPERTY_FIELDS}
      }
    }
  }
`

/**
 * One listing, by slug, within a language.
 *
 * The language is NOT part of the query, and that is deliberate: passing both
 * `language` and `name` to the connection was measured against the running CMS
 * and `name` wins outright — `where: { language: PT, name: "riverside-villa" }`
 * cheerfully returns the English post. Polylang's filter is simply not applied
 * once a post name is in play.
 *
 * So the check lives here instead, where it can be seen and tested: ask by
 * slug, then confirm the post WordPress handed back is in the language the URL
 * claimed. Without it, /pt/properties/<english-slug> would render English
 * copy inside Portuguese chrome.
 *
 * Returns null when nothing matches or the language is wrong, so the page can
 * call notFound() rather than throw on a URL a visitor simply mistyped.
 */
export async function getProperty(locale: Locale, slug: string): Promise<PropertyDetail | null> {
  const data = await wpQuery<{ properties: { nodes: unknown[] } }>(PROPERTY_QUERY, { slug })

  const node = data.properties.nodes[0]

  if (!node) {
    return null
  }

  const property = PropertyDetailSchema.parse(node)

  return fromPllLang(property.languageCode) === locale ? property : null
}

export const PROPERTY_SLUGS_QUERY = `
  query PropertySlugs($language: LanguageCodeFilterEnum!, $first: Int!) {
    properties(where: { language: $language }, first: $first) {
      nodes {
        slug
      }
    }
  }
`

/**
 * Just the slugs, for generateStaticParams. A separate, deliberately thin
 * query: prerendering the routes should not drag the whole gallery of every
 * listing across the wire to learn their names.
 */
export async function getPropertySlugs(locale: Locale, first = 100): Promise<string[]> {
  const data = await wpQuery<{ properties: { nodes: { slug: string }[] } }>(PROPERTY_SLUGS_QUERY, {
    language: toPllLang(locale),
    first,
  })

  return data.properties.nodes.map((node) => node.slug)
}
