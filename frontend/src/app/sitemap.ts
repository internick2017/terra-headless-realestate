import type { MetadataRoute } from 'next'
import { getNeighborhoods, getPropertySlugs } from '@/lib/queries'
import { absoluteUrl } from '@/lib/site'
import { LOCALES, type Locale } from '@/lib/types'

/**
 * Every page, in every language, with hreflang alternates so a crawler learns
 * the two versions belong together. Built from the CMS rather than maintained
 * by hand: a listing added in WordPress appears here on the next revalidation.
 */
export const revalidate = 3600

/** The alternates block Next expects: locale to absolute URL. */
function alternates(paths: Record<Locale, string>) {
  return {
    languages: Object.fromEntries(
      LOCALES.map((locale) => [locale, absoluteUrl(paths[locale])]),
    ),
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  // The pages that exist in both languages at a predictable path.
  for (const path of ['', '/properties', '/neighborhoods']) {
    const paths = Object.fromEntries(
      LOCALES.map((locale) => [locale, `/${locale}${path}`]),
    ) as Record<Locale, string>

    for (const locale of LOCALES) {
      entries.push({
        url: absoluteUrl(paths[locale]),
        changeFrequency: 'daily',
        priority: path === '' ? 1 : 0.8,
        alternates: alternates(paths),
      })
    }
  }

  // Listings and articles have a different slug per language, so each locale is
  // fetched separately and paired up by position — the seed keeps them in the
  // same order, and a mismatch degrades to a missing alternate rather than a
  // wrong one.
  const [propertiesByLocale, neighborhoodsByLocale] = await Promise.all([
    Promise.all(LOCALES.map((locale) => getPropertySlugs(locale))),
    Promise.all(LOCALES.map((locale) => getNeighborhoods(locale))),
  ])

  LOCALES.forEach((locale, index) => {
    for (const slug of propertiesByLocale[index]) {
      entries.push({
        url: absoluteUrl(`/${locale}/properties/${slug}`),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }

    for (const neighborhood of neighborhoodsByLocale[index]) {
      entries.push({
        url: absoluteUrl(`/${locale}/neighborhoods/${neighborhood.slug}`),
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
  })

  return entries
}
