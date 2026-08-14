import type { Locale } from './types'

/** Intl wants a full BCP 47 tag; our routes only carry the language. */
const INTL_LOCALES: Record<Locale, string> = {
  en: 'en-US',
  pt: 'pt-BR',
}

/**
 * Money as a reader of that language expects it: "$450,000" in English,
 * "R$ 2.400.000" in Portuguese. Cents are dropped — listing prices are round
 * numbers and the decimals only add noise.
 *
 * Returns null when the listing has no price, so callers can say "on request"
 * instead of printing a misleading zero.
 */
export function formatPrice(
  price: number | null,
  currency: 'USD' | 'BRL' | null,
  locale: Locale,
): string | null {
  if (price === null || currency === null) {
    return null
  }

  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price)
}

/** Floor area with a thousands separator: "5,000 m²" / "5.000 m²". */
export function formatArea(area: number | null, locale: Locale): string | null {
  if (area === null) {
    return null
  }

  return `${new Intl.NumberFormat(INTL_LOCALES[locale]).format(area)} m²`
}
