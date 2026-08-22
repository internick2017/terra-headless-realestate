import { describe, expect, it } from 'vitest'
import { getDict } from './i18n'
import { propertySpecs } from './specs'
import type { PropertyDetail } from './types'

const dict = getDict('en')

function property(overrides: Partial<PropertyDetail> = {}): PropertyDetail {
  return {
    title: 'Casa Aurora',
    slug: 'casa-aurora',
    content: null,
    languageCode: 'EN',
    translations: [],
    price: 450000,
    currency: 'USD',
    operation: 'sale',
    propertyType: 'house',
    bedrooms: 3,
    bathrooms: 2,
    areaM2: 180,
    address: 'Rua das Flores 42',
    neighborhoodName: 'Centro',
    latitude: -26.08,
    longitude: -53.05,
    status: 'available',
    gallery: [],
    agentName: 'Ana Ribeiro',
    agentEmail: 'ana@example.com',
    ...overrides,
  }
}

const labels = (p: PropertyDetail) => propertySpecs(p, dict, 'en').map((spec) => spec.label)
const find = (p: PropertyDetail, label: string) =>
  propertySpecs(p, dict, 'en').find((spec) => spec.label === label)?.value

describe('propertySpecs', () => {
  it('describes a fully filled listing', () => {
    expect(labels(property())).toEqual([
      'Operation',
      'Type',
      'Bedrooms',
      'Bathrooms',
      'Floor area',
      'Status',
      'Neighborhood',
      'Address',
    ])
  })

  it('omits rooms a listing does not have instead of showing zero', () => {
    const land = property({ propertyType: 'land', bedrooms: 0, bathrooms: 0 })

    expect(labels(land)).not.toContain('Bedrooms')
    expect(labels(land)).not.toContain('Bathrooms')
    expect(labels(land)).toContain('Type')
  })

  it('translates the operation rather than printing the raw value', () => {
    expect(find(property({ operation: 'rent' }), 'Operation')).toBe('For rent')
    expect(find(property({ operation: 'sale' }), 'Operation')).toBe('For sale')
  })

  it('translates the status', () => {
    expect(find(property({ status: 'reserved' }), 'Status')).toBe('Reserved')
  })

  it('formats the area for the reader locale', () => {
    expect(propertySpecs(property({ areaM2: 5000 }), dict, 'en')).toContainEqual({
      label: 'Floor area',
      value: '5,000 m²',
    })
  })

  it('drops every field the CMS left empty', () => {
    const bare = property({
      operation: null,
      propertyType: null,
      bedrooms: 0,
      bathrooms: 0,
      areaM2: null,
      status: null,
      address: null,
      neighborhoodName: null,
    })

    expect(propertySpecs(bare, dict, 'en')).toEqual([])
  })

  it('speaks Portuguese when asked to', () => {
    expect(labels(property()).length).toBe(propertySpecs(property(), getDict('pt'), 'pt').length)
    expect(propertySpecs(property(), getDict('pt'), 'pt')[0]).toEqual({
      label: 'Operação',
      value: 'À venda',
    })
  })
})
