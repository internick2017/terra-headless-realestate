import { describe, expect, it } from 'vitest'
import { getDict, resultsLabel, withLocale } from './i18n'

describe('withLocale', () => {
  it('swaps the leading locale segment', () => {
    expect(withLocale('/pt/properties', 'en')).toBe('/en/properties')
    expect(withLocale('/en/properties/downtown-loft', 'pt')).toBe('/pt/properties/downtown-loft')
  })

  it('handles the bare root', () => {
    expect(withLocale('/', 'pt')).toBe('/pt')
    expect(withLocale('', 'en')).toBe('/en')
  })

  it('keeps a locale-less path intact and just prefixes it', () => {
    expect(withLocale('/properties', 'pt')).toBe('/pt/properties')
  })

  it('does not mistake a page named like a locale for the locale segment', () => {
    // Only the FIRST segment is a locale; a nested "en" is part of the path.
    expect(withLocale('/pt/neighborhoods/en', 'en')).toBe('/en/neighborhoods/en')
  })
})

describe('getDict', () => {
  it('returns copy for each locale', () => {
    expect(getDict('en').nav.properties).toBe('Properties')
    expect(getDict('pt').nav.properties).toBe('Imóveis')
  })

  it('keeps both dictionaries the same shape', () => {
    const walk = (value: unknown, path = ''): string[] =>
      typeof value === 'object' && value !== null
        ? Object.entries(value).flatMap(([key, inner]) => walk(inner, path ? `${path}.${key}` : key))
        : [path]

    expect(walk(getDict('pt')).sort()).toEqual(walk(getDict('en')).sort())
  })
})

describe('resultsLabel', () => {
  it('uses the singular for exactly one result', () => {
    expect(resultsLabel(getDict('en'), 1)).toBe('property found')
    expect(resultsLabel(getDict('pt'), 1)).toBe('imóvel encontrado')
  })

  it('uses the plural for none and for many', () => {
    expect(resultsLabel(getDict('en'), 0)).toBe('properties found')
    expect(resultsLabel(getDict('en'), 8)).toBe('properties found')
    expect(resultsLabel(getDict('pt'), 8)).toBe('imóveis encontrados')
  })
})
