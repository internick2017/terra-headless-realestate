import { formatArea } from './format'
import type { Dict } from './i18n'
import type { Locale, PropertyDetail } from './types'

export type Spec = { label: string; value: string }

/**
 * The specifications table, as label/value pairs.
 *
 * A pure function rather than JSX in the page so the rules that decide what a
 * visitor sees — a land lot has no bedrooms, an unpriced listing says "on
 * request" — are testable without rendering anything.
 */
export function propertySpecs(property: PropertyDetail, dict: Dict, locale: Locale): Spec[] {
  const { detail, property: labels } = dict

  const specs: (Spec | null)[] = [
    property.operation
      ? {
          label: detail.operation,
          value: property.operation === 'rent' ? labels.forRent : labels.forSale,
        }
      : null,

    property.propertyType
      ? { label: detail.type, value: labels.types[property.propertyType] }
      : null,

    // Zero is meaningful noise here: a warehouse with no bedrooms should not
    // claim "0 bedrooms", it should not mention them at all.
    property.bedrooms > 0 ? { label: detail.bedrooms, value: String(property.bedrooms) } : null,
    property.bathrooms > 0 ? { label: detail.bathrooms, value: String(property.bathrooms) } : null,

    formatArea(property.areaM2, locale)
      ? { label: detail.area, value: formatArea(property.areaM2, locale) as string }
      : null,

    property.status ? { label: detail.status, value: labels[property.status] } : null,

    property.neighborhoodName
      ? { label: detail.neighborhood, value: property.neighborhoodName }
      : null,

    property.address ? { label: detail.address, value: property.address } : null,
  ]

  return specs.filter((spec): spec is Spec => spec !== null)
}
