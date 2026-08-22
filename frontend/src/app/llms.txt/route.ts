import { formatArea, formatPrice } from '@/lib/format'
import { getDict, type Dict } from '@/lib/i18n'
import { getAllProperties, getNeighborhoods } from '@/lib/queries'
import { absoluteUrl, siteUrl } from '@/lib/site'
import { LOCALES, type Locale } from '@/lib/types'

/**
 * /llms.txt — a plain-text catalogue index, in the shape the convention asks
 * for: a title, a short description, then link sections.
 *
 * The bet behind it: an assistant answering "three-bedroom houses near the
 * river in Terra" will not run our JavaScript or parse our grid, but it will
 * read one Markdown-ish file that says what exists and where. The JSON-LD
 * describes a page it already found; this is how it finds them at all.
 *
 * Regenerated from the CMS on the same hour as everything else.
 */
export const revalidate = 3600

const INTRO: Record<Locale, string> = {
  en: 'Homes, apartments and land for sale and rent in Terra. Every listing exists in English and Portuguese at its own URL.',
  pt: 'Casas, apartamentos e terrenos à venda e para alugar em Terra. Cada imóvel existe em inglês e português, cada um com sua própria URL.',
}

/**
 * One line per listing: enough to decide whether to open it, and no more.
 *
 * Written in the language of the section it appears in, through the same
 * dictionary the pages use. An assistant reading the Portuguese catalogue
 * should not have to know that "for sale" and "à venda" are the same thing.
 */
function describe(
  property: Awaited<ReturnType<typeof getAllProperties>>[number],
  locale: Locale,
  dict: Dict,
): string {
  const facts = [
    property.propertyType ? dict.property.types[property.propertyType] : null,
    property.operation === 'rent' ? dict.property.forRent : dict.property.forSale,
    property.bedrooms > 0 ? `${property.bedrooms} ${dict.property.bedrooms}` : null,
    property.bathrooms > 0 ? `${property.bathrooms} ${dict.property.bathrooms}` : null,
    formatArea(property.areaM2, locale),
    property.neighborhoodName,
    formatPrice(property.price, property.currency, locale),
    property.status ? dict.property[property.status] : null,
  ].filter(Boolean)

  return `- [${property.title}](${absoluteUrl(`/${locale}/properties/${property.slug}`)}): ${facts.join(', ')}`
}

export async function GET() {
  const sections: string[] = [
    '# Terra',
    '',
    '> A bilingual real estate catalogue. WordPress as the content back end, Next.js as the front end.',
    '',
  ]

  for (const locale of LOCALES) {
    const dict = getDict(locale)

    const [properties, neighborhoods] = await Promise.all([
      getAllProperties(locale),
      getNeighborhoods(locale),
    ])

    sections.push(
      `## ${locale === 'en' ? 'English' : 'Português'} (${absoluteUrl(`/${locale}`)})`,
      '',
      INTRO[locale],
      '',
      `### ${dict.nav.properties}`,
      '',
      ...properties.map((property) => describe(property, locale, dict)),
      '',
      `### ${dict.nav.neighborhoods}`,
      '',
      ...neighborhoods.map(
        (neighborhood) =>
          `- [${neighborhood.title}](${absoluteUrl(`/${locale}/neighborhoods/${neighborhood.slug}`)})`,
      ),
      '',
    )
  }

  sections.push('## Machine-readable', '', `- [Sitemap](${absoluteUrl('/sitemap.xml')})`, '')

  return new Response(sections.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Same hour as the pages it indexes, so the two cannot disagree for long.
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'all',
      Link: `<${siteUrl()}>; rel="canonical"`,
    },
  })
}
