import type { Property } from './types'

const OPERATIONS = ['sale', 'rent'] as const
const PROPERTY_TYPES = ['house', 'apartment', 'land', 'commercial'] as const

export type FilterCriteria = {
  operation?: (typeof OPERATIONS)[number]
  propertyType?: (typeof PROPERTY_TYPES)[number]
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  neighborhood?: string
}

/**
 * Narrow a list of properties. Pure and synchronous: the whole demo catalogue is
 * small enough to filter in memory, which keeps the filters instant and the
 * logic testable without a server or a browser.
 *
 * Every criterion is optional, and an absent one means "no opinion" rather than
 * "must be empty".
 */
export function filterProperties(list: Property[], criteria: FilterCriteria): Property[] {
  const hasPriceBound = criteria.minPrice !== undefined || criteria.maxPrice !== undefined

  return list.filter((property) => {
    if (criteria.operation && property.operation !== criteria.operation) {
      return false
    }

    if (criteria.propertyType && property.propertyType !== criteria.propertyType) {
      return false
    }

    if (hasPriceBound) {
      // A listing with no price cannot be claimed to sit inside a range.
      if (property.price === null) {
        return false
      }
      if (criteria.minPrice !== undefined && property.price < criteria.minPrice) {
        return false
      }
      if (criteria.maxPrice !== undefined && property.price > criteria.maxPrice) {
        return false
      }
    }

    if (criteria.minBedrooms !== undefined && property.bedrooms < criteria.minBedrooms) {
      return false
    }

    if (
      criteria.neighborhood &&
      property.neighborhoodName?.toLowerCase() !== criteria.neighborhood.toLowerCase()
    ) {
      return false
    }

    return true
  })
}

function oneOf<const T extends readonly string[]>(
  values: T,
  raw: string | null,
): T[number] | undefined {
  return raw && (values as readonly string[]).includes(raw) ? (raw as T[number]) : undefined
}

function positiveNumber(raw: string | null): number | undefined {
  if (!raw) {
    return undefined
  }

  const value = Number(raw)

  return Number.isFinite(value) ? value : undefined
}

/**
 * Read criteria out of the query string. The URL is the single source of truth
 * for filter state, so a filtered view can be reloaded, shared or opened in a
 * new tab and still show the same listings.
 *
 * Anything unrecognised is dropped rather than trusted: the URL is user input.
 */
export function parseFilters(params: URLSearchParams): FilterCriteria {
  const criteria: FilterCriteria = {}

  const operation = oneOf(OPERATIONS, params.get('operation'))
  if (operation) {
    criteria.operation = operation
  }

  const propertyType = oneOf(PROPERTY_TYPES, params.get('type'))
  if (propertyType) {
    criteria.propertyType = propertyType
  }

  const minPrice = positiveNumber(params.get('minPrice'))
  if (minPrice !== undefined) {
    criteria.minPrice = minPrice
  }

  const maxPrice = positiveNumber(params.get('maxPrice'))
  if (maxPrice !== undefined) {
    criteria.maxPrice = maxPrice
  }

  const minBedrooms = positiveNumber(params.get('bedrooms'))
  if (minBedrooms !== undefined) {
    criteria.minBedrooms = minBedrooms
  }

  const neighborhood = params.get('neighborhood')?.trim()
  if (neighborhood) {
    criteria.neighborhood = neighborhood
  }

  return criteria
}
