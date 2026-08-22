import type { Locale, Neighborhood, PropertyDetail } from './types'

/**
 * JSON-LD, so a listing can be understood by something that is not a person:
 * Google's rich results, and increasingly an assistant answering "three-bedroom
 * houses near the river". That is the whole point of the exercise — the markup
 * is what makes the catalogue citable.
 *
 * Built as plain objects by pure functions, so the shape can be asserted in
 * tests instead of eyeballed in a validator.
 */

/** schema.org has no one type for "property"; pick the closest per kind. */
const RESIDENCE_TYPES: Record<NonNullable<PropertyDetail['propertyType']>, string> = {
  house: 'SingleFamilyResidence',
  apartment: 'Apartment',
  // Neither a lot nor a shop is a residence, and claiming otherwise would be
  // worse than being vague.
  land: 'Place',
  commercial: 'Place',
}

const AVAILABILITY: Record<NonNullable<PropertyDetail['status']>, string> = {
  available: 'https://schema.org/InStock',
  reserved: 'https://schema.org/LimitedAvailability',
  sold: 'https://schema.org/SoldOut',
}

/** GoodRelations, which is what schema.org uses to say sale versus rental. */
const BUSINESS_FUNCTION: Record<NonNullable<PropertyDetail['operation']>, string> = {
  sale: 'http://purl.org/goodrelations/v1#Sell',
  rent: 'http://purl.org/goodrelations/v1#LeaseOut',
}

/** Drop keys the CMS left empty: absent beats null in JSON-LD. */
function compact<T extends Record<string, unknown>>(object: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== null && value !== undefined),
  ) as Partial<T>
}

export function propertyJsonLd(property: PropertyDetail, locale: Locale, url: string) {
  const description = (property.content ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  const address = compact({
    '@type': 'PostalAddress',
    streetAddress: property.address,
    addressLocality: property.neighborhoodName,
  })

  const geo =
    property.latitude !== null && property.longitude !== null
      ? {
          '@type': 'GeoCoordinates',
          latitude: property.latitude,
          longitude: property.longitude,
        }
      : null

  const about = compact({
    '@type': property.propertyType ? RESIDENCE_TYPES[property.propertyType] : 'Place',
    name: property.title,
    address: Object.keys(address).length > 1 ? address : null,
    geo,
    numberOfBedrooms: property.bedrooms > 0 ? property.bedrooms : null,
    numberOfBathroomsTotal: property.bathrooms > 0 ? property.bathrooms : null,
    floorSize:
      property.areaM2 !== null
        ? // MTK is the UN/CEFACT code for square metre, which is what
          // schema.org expects rather than the string "m²".
          { '@type': 'QuantitativeValue', value: property.areaM2, unitCode: 'MTK' }
        : null,
  })

  const offers =
    property.price !== null && property.currency !== null
      ? compact({
          '@type': 'Offer',
          price: property.price,
          priceCurrency: property.currency,
          availability: property.status ? AVAILABILITY[property.status] : null,
          businessFunction: property.operation ? BUSINESS_FUNCTION[property.operation] : null,
          url,
        })
      : null

  return compact({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    url,
    name: property.title,
    description: description || null,
    inLanguage: locale,
    image: property.gallery.length > 0 ? property.gallery.map((image) => image.sourceUrl) : null,
    about,
    offers,
  })
}

export function neighborhoodJsonLd(neighborhood: Neighborhood, locale: Locale, url: string) {
  const description = (neighborhood.excerpt ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return compact({
    '@context': 'https://schema.org',
    '@type': 'Article',
    url,
    headline: neighborhood.title,
    description: description || null,
    inLanguage: locale,
    about: { '@type': 'Place', name: neighborhood.title },
  })
}
