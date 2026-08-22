import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PropertyCard } from '@/components/property-card'
import { toPlainText } from '@/lib/html'
import { getDict } from '@/lib/i18n'
import { getFeaturedProperties, getNeighborhoods } from '@/lib/queries'
import { isLocale } from '@/lib/types'

/** Rebuild the page at most once a minute; listings do not change by the second. */
export const revalidate = 60

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  if (!isLocale(locale)) {
    notFound()
  }

  const dict = getDict(locale)
  const [properties, neighborhoods] = await Promise.all([
    getFeaturedProperties(locale),
    getNeighborhoods(locale),
  ])

  /**
   * The search entry point the design asks for. Deliberately three links into
   * the existing filter query string rather than a search box: the filters are
   * already shareable URLs, and a box that only searches eight listings would
   * be a worse version of the page it links to.
   */
  const entries = [
    { label: dict.home.forSale, href: `/${locale}/properties?operation=sale` },
    { label: dict.home.forRent, href: `/${locale}/properties?operation=rent` },
    { label: dict.home.land, href: `/${locale}/properties?type=land` },
  ]

  return (
    <>
      <section className="pb-10">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{dict.home.heroTitle}</h1>
        <p className="mt-3 max-w-2xl text-lg text-stone-600 dark:text-stone-400">
          {dict.home.heroSubtitle}
        </p>
      </section>

      <section className="pb-12">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {dict.home.browse}
        </h2>

        <div className="flex flex-wrap gap-3">
          {entries.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium transition hover:border-stone-900 hover:bg-stone-900 hover:text-white dark:border-stone-700 dark:hover:border-stone-100 dark:hover:bg-stone-100 dark:hover:text-stone-900"
            >
              {entry.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold">{dict.home.featured}</h2>
          <Link
            href={`/${locale}/properties`}
            className="text-sm font-medium text-stone-600 underline-offset-4 hover:underline dark:text-stone-400"
          >
            {dict.home.viewAll}
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.slug}
              property={property}
              locale={locale}
              dict={dict}
            />
          ))}
        </div>
      </section>

      {neighborhoods.length > 0 ? (
        <section className="mt-14">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold">{dict.home.neighborhoods}</h2>
            <Link
              href={`/${locale}/neighborhoods`}
              className="text-sm font-medium text-stone-600 underline-offset-4 hover:underline dark:text-stone-400"
            >
              {dict.home.neighborhoodsMore}
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {neighborhoods.map((neighborhood) => (
              <Link
                key={neighborhood.slug}
                href={`/${locale}/neighborhoods/${neighborhood.slug}`}
                className="rounded-xl border border-stone-200 p-5 transition hover:shadow-md dark:border-stone-800"
              >
                <h3 className="text-lg font-semibold">{neighborhood.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  {toPlainText(neighborhood.excerpt)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}
