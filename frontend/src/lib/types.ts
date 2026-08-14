import { z } from 'zod'

/** The two locales this site ships. Polylang is configured with exactly these. */
export type Locale = 'en' | 'pt'

export const LOCALES = ['en', 'pt'] as const

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

/** WPGraphQL's Polylang enums are uppercase; our routes are lowercase. */
export function toPllLang(locale: Locale): 'EN' | 'PT' {
  return locale === 'pt' ? 'PT' : 'EN'
}

/**
 * ACF select fields come back from WPGraphQL as arrays, even when the field
 * holds a single choice — `currency: ["BRL"]` rather than `currency: "BRL"`.
 * Unwrap to the first entry before validating against the allowed values.
 */
function singleChoice<const T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(
    (value) => (Array.isArray(value) ? (value[0] ?? null) : value),
    z.enum(values).nullable(),
  )
}

/**
 * ACF returns null instead of 0 for empty numeric fields, so a land lot with no
 * bedrooms arrives as null. Treat that as 0 rather than leaking null into the UI.
 */
const count = z
  .number()
  .nullable()
  .transform((value) => value ?? 0)

const GalleryImageSchema = z.object({
  sourceUrl: z.string(),
  altText: z.string().nullable(),
})

export type GalleryImage = z.infer<typeof GalleryImageSchema>

/** ACF gallery fields expose a connection, and are null when no images are attached. */
const GallerySchema = z
  .object({ nodes: z.array(GalleryImageSchema) })
  .nullable()
  .transform((value) => value?.nodes ?? [])

const PropertyFieldsSchema = z.object({
  price: z.number().nullable(),
  currency: singleChoice(['USD', 'BRL']),
  operation: singleChoice(['sale', 'rent']),
  propertyType: singleChoice(['house', 'apartment', 'land', 'commercial']),
  bedrooms: count,
  bathrooms: count,
  areaM2: z.number().nullable(),
  address: z.string().nullable(),
  neighborhoodName: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  status: singleChoice(['available', 'reserved', 'sold']),
  gallery: GallerySchema,
  agentName: z.string().nullable(),
  agentEmail: z.string().nullable(),
})

/**
 * A property as the UI wants it: the GraphQL node flattened, so components read
 * `property.price` instead of `property.propertyFields.price`.
 */
export const PropertySchema = z
  .object({
    title: z.string(),
    slug: z.string(),
    propertyFields: PropertyFieldsSchema,
  })
  .transform(({ title, slug, propertyFields }) => ({
    title,
    slug,
    ...propertyFields,
  }))

export type Property = z.infer<typeof PropertySchema>

export const NeighborhoodSchema = z.object({
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  content: z.string().nullable(),
})

export type Neighborhood = z.infer<typeof NeighborhoodSchema>
