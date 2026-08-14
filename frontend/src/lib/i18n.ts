import { LOCALES, type Locale } from './types'

/**
 * UI copy. `Dict` is inferred from the English entry and every other locale is
 * typed against it, so a missing or misspelled Portuguese key is a type error
 * rather than a blank spot discovered in the browser.
 *
 * Deliberately not `as const`: that would narrow each string to its own literal
 * type and no translation could ever satisfy it.
 */
const en = {
  brand: 'Terra',
  tagline: 'Homes and land, found faster.',
  nav: {
    properties: 'Properties',
    neighborhoods: 'Neighborhoods',
  },
  switcher: {
    label: 'Language',
    en: 'English',
    pt: 'Portuguese',
  },
  home: {
    heroTitle: 'Find your next address',
    heroSubtitle: 'A curated selection of homes, apartments and land.',
    featured: 'Featured listings',
    viewAll: 'View all properties',
  },
  property: {
    bedrooms: 'bed',
    bathrooms: 'bath',
    area: 'm²',
    forSale: 'For sale',
    forRent: 'For rent',
    available: 'Available',
    reserved: 'Reserved',
    sold: 'Sold',
    types: {
      house: 'House',
      apartment: 'Apartment',
      land: 'Land',
      commercial: 'Commercial',
    },
  },
  filters: {
    title: 'Filters',
    operation: 'Operation',
    type: 'Type',
    minPrice: 'Min price',
    maxPrice: 'Max price',
    bedrooms: 'Bedrooms',
    any: 'Any',
    clear: 'Clear filters',
    resultsOne: 'property found',
    resultsMany: 'properties found',
    empty: 'No properties match these filters.',
  },
  lead: {
    title: 'Ask about this property',
    name: 'Your name',
    email: 'Your email',
    message: 'Message',
    submit: 'Send enquiry',
    sending: 'Sending…',
    success: 'Thanks. The agent will get back to you.',
    error: 'Something went wrong. Please try again.',
  },
  footer: {
    note: 'Demo project. Listings and agents are fictional.',
  },
}

export type Dict = typeof en

const pt: Dict = {
  brand: 'Terra',
  tagline: 'Imóveis e terrenos, encontrados mais rápido.',
  nav: {
    properties: 'Imóveis',
    neighborhoods: 'Bairros',
  },
  switcher: {
    label: 'Idioma',
    en: 'Inglês',
    pt: 'Português',
  },
  home: {
    heroTitle: 'Encontre seu próximo endereço',
    heroSubtitle: 'Uma seleção de casas, apartamentos e terrenos.',
    featured: 'Imóveis em destaque',
    viewAll: 'Ver todos os imóveis',
  },
  property: {
    bedrooms: 'quartos',
    bathrooms: 'banheiros',
    area: 'm²',
    forSale: 'À venda',
    forRent: 'Para alugar',
    available: 'Disponível',
    reserved: 'Reservado',
    sold: 'Vendido',
    types: {
      house: 'Casa',
      apartment: 'Apartamento',
      land: 'Terreno',
      commercial: 'Comercial',
    },
  },
  filters: {
    title: 'Filtros',
    operation: 'Operação',
    type: 'Tipo',
    minPrice: 'Preço mínimo',
    maxPrice: 'Preço máximo',
    bedrooms: 'Quartos',
    any: 'Qualquer',
    clear: 'Limpar filtros',
    resultsOne: 'imóvel encontrado',
    resultsMany: 'imóveis encontrados',
    empty: 'Nenhum imóvel corresponde a esses filtros.',
  },
  lead: {
    title: 'Pergunte sobre este imóvel',
    name: 'Seu nome',
    email: 'Seu e-mail',
    message: 'Mensagem',
    submit: 'Enviar contato',
    sending: 'Enviando…',
    success: 'Obrigado. O corretor entrará em contato.',
    error: 'Algo deu errado. Tente novamente.',
  },
  footer: {
    note: 'Projeto de demonstração. Imóveis e corretores são fictícios.',
  },
}

const dictionaries: Record<Locale, Dict> = { en, pt }

/** English and Portuguese share the same one-vs-many split, so a count is enough. */
export function resultsLabel(dict: Dict, count: number): string {
  return count === 1 ? dict.filters.resultsOne : dict.filters.resultsMany
}

export function getDict(locale: Locale): Dict {
  return dictionaries[locale]
}

/**
 * Rewrite a path so it points at the same page in another locale, by swapping
 * the leading locale segment. Pure, so the switcher's logic is testable without
 * a router: `/pt/properties` + 'en' becomes `/en/properties`.
 */
export function withLocale(pathname: string, locale: Locale): string {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return `/${locale}`
  }

  const [first, ...rest] = segments
  const tail = (LOCALES as readonly string[]).includes(first) ? rest : segments

  return `/${[locale, ...tail].join('/')}`
}
