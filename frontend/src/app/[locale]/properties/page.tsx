import { notFound } from 'next/navigation'
import { PropertyCard } from '@/components/property-card'
import { PropertyFilters } from '@/components/property-filters'
import { filterProperties, parseFilters } from '@/lib/filter'
import { getDict, resultsLabel } from '@/lib/i18n'
import { getAllProperties } from '@/lib/queries'
import { isLocale } from '@/lib/types'

/**
 * Reading searchParams makes this route server-rendered on demand, so it is
 * never prerendered and useSearchParams needs no Suspense boundary in the
 * filters. Wrapping them in one actively broke them: the subtree rendered but
 * never hydrated, so the controls moved and nothing happened.
 */

type SearchParams = Record<string, string | string[] | undefined>

/** Rebuild a URLSearchParams so the same parser serves the server and the client. */
function toSearchParams(input: SearchParams): URLSearchParams {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      params.set(key, value)
    } else if (Array.isArray(value) && value[0]) {
      params.set(key, value[0])
    }
  }

  return params
}

export default async function PropertiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchParams>
}) {
  const { locale } = await params

  if (!isLocale(locale)) {
    notFound()
  }

  const dict = getDict(locale)
  const properties = await getAllProperties(locale)
  const criteria = parseFilters(toSearchParams(await searchParams))
  const visible = filterProperties(properties, criteria)

  // Offer only neighborhoods that actually have listings in this language.
  const neighborhoods = [
    ...new Set(properties.map((property) => property.neighborhoodName).filter(Boolean)),
  ].sort() as string[]

  return (
    <>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">{dict.nav.properties}</h1>

      <PropertyFilters dict={dict} neighborhoods={neighborhoods} />

      <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
        {visible.length} {resultsLabel(dict, visible.length)}
      </p>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500 dark:border-stone-700 dark:text-stone-400">
          {dict.filters.empty}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((property) => (
            <PropertyCard key={property.slug} property={property} locale={locale} dict={dict} />
          ))}
        </div>
      )}
    </>
  )
}
