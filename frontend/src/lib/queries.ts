import {
  NeighborhoodSchema,
  PropertyDetailSchema,
  PropertySchema,
  toPllLang,
  type Locale,
  type Neighborhood,
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
        translations {
          slug
          language {
            code
          }
        }
        ${PROPERTY_FIELDS}
      }
    }
  }
`

/**
 * One listing, by slug, in whatever language it happens to be.
 *
 * The language is deliberately not in the query. Passing both `language` and
 * `name` to the connection was measured against the running CMS and `name`
 * wins outright — `where: { language: PT, name: "riverside-villa" }` cheerfully
 * returns the English post. Polylang's filter is simply not applied once a post
 * name is in play, so filtering here would be a lie either way.
 *
 * Instead the answer carries its own language and its translations, and
 * resolvePropertyRoute decides what the page should do with it. Returns null
 * only when no listing anywhere has that slug.
 */
export async function getProperty(slug: string): Promise<PropertyDetail | null> {
  const data = await wpQuery<{ properties: { nodes: unknown[] } }>(PROPERTY_QUERY, { slug })

  const node = data.properties.nodes[0]

  return node ? PropertyDetailSchema.parse(node) : null
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

/**
 * Neighborhood articles are ordinary posts filed under a category, and Polylang
 * translates the category term along with the posts — so the English site asks
 * for "Neighborhoods" and the Portuguese one for "Bairros". Asking for the
 * wrong name simply returns nothing, which is why the names live here rather
 * than being guessed.
 *
 * Unlike `name`, `categoryName` does compose with the language filter; that was
 * measured, not assumed, after `name` turned out to override it.
 */
const NEIGHBORHOOD_CATEGORY: Record<Locale, string> = {
  en: 'Neighborhoods',
  pt: 'Bairros',
}

const NEIGHBORHOOD_FIELDS = `
  title
  slug
  excerpt
  language {
    code
  }
  translations {
    slug
    language {
      code
    }
  }
`

export const NEIGHBORHOODS_QUERY = `
  query Neighborhoods($language: LanguageCodeFilterEnum!, $category: String!, $first: Int!) {
    posts(where: { language: $language, categoryName: $category }, first: $first) {
      nodes {
        ${NEIGHBORHOOD_FIELDS}
        content
      }
    }
  }
`

/** Every neighborhood article in one language, for the index page. */
export async function getNeighborhoods(locale: Locale, first = 50): Promise<Neighborhood[]> {
  const data = await wpQuery<{ posts: { nodes: unknown[] } }>(NEIGHBORHOODS_QUERY, {
    language: toPllLang(locale),
    category: NEIGHBORHOOD_CATEGORY[locale],
    first,
  })

  return data.posts.nodes.map((node) => NeighborhoodSchema.parse(node))
}

export const NEIGHBORHOOD_QUERY = `
  query Neighborhood($slug: String!) {
    posts(where: { name: $slug }, first: 1) {
      nodes {
        ${NEIGHBORHOOD_FIELDS}
        content
      }
    }
  }
`

/**
 * One article by slug, in whatever language it is. Same deal as getProperty:
 * the language cannot be part of the query, so the answer carries its own and
 * resolveTranslatedRoute decides what the page does with it.
 */
export async function getNeighborhood(slug: string): Promise<Neighborhood | null> {
  const data = await wpQuery<{ posts: { nodes: unknown[] } }>(NEIGHBORHOOD_QUERY, { slug })

  const node = data.posts.nodes[0]

  return node ? NeighborhoodSchema.parse(node) : null
}

/** Slugs for generateStaticParams, in both languages. */
export async function getNeighborhoodSlugs(locale: Locale): Promise<string[]> {
  const neighborhoods = await getNeighborhoods(locale)

  return neighborhoods.map((neighborhood) => neighborhood.slug)
}
