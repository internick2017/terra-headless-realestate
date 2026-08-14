import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PropertyCard } from '@/components/property-card'
import { getDict } from '@/lib/i18n'
import { getFeaturedProperties } from '@/lib/queries'
import { isLocale } from '@/lib/types'

/** Rebuild the page at most once a minute; listings do not change by the second. */
export const revalidate = 60

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  if (!isLocale(locale)) {
    notFound()
  }

  const dict = getDict(locale)
  const properties = await getFeaturedProperties(locale)

  return (
    <>
      <section className="pb-10">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{dict.home.heroTitle}</h1>
        <p className="mt-3 max-w-2xl text-lg text-stone-600 dark:text-stone-400">
          {dict.home.heroSubtitle}
        </p>
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
    </>
  )
}
