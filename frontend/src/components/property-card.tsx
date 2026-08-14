import Image from 'next/image'
import Link from 'next/link'
import { formatArea, formatPrice } from '@/lib/format'
import type { Dict } from '@/lib/i18n'
import type { Locale, Property } from '@/lib/types'

const STATUS_STYLES: Record<'available' | 'reserved' | 'sold', string> = {
  available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  reserved: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  sold: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200',
}

export function PropertyCard({
  property,
  locale,
  dict,
}: {
  property: Property
  locale: Locale
  dict: Dict
}) {
  const cover = property.gallery[0] ?? null
  const price = formatPrice(property.price, property.currency, locale)
  const area = formatArea(property.areaM2, locale)

  const specs = [
    property.bedrooms > 0 ? `${property.bedrooms} ${dict.property.bedrooms}` : null,
    property.bathrooms > 0 ? `${property.bathrooms} ${dict.property.bathrooms}` : null,
    area,
  ].filter(Boolean)

  return (
    <article className="group overflow-hidden rounded-xl border border-stone-200 bg-white transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
      <Link href={`/${locale}/properties/${property.slug}`} className="block">
        <div className="relative aspect-[3/2] overflow-hidden bg-stone-100 dark:bg-stone-800">
          {cover ? (
            <Image
              src={cover.sourceUrl}
              alt={cover.altText ?? property.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : null}

          {property.status && property.status !== 'available' ? (
            <span
              className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[property.status]}`}
            >
              {dict.property[property.status]}
            </span>
          ) : null}
        </div>

        <div className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {property.propertyType ? dict.property.types[property.propertyType] : null}
            {property.neighborhoodName ? ` · ${property.neighborhoodName}` : null}
          </p>

          <h3 className="mt-1 text-base font-semibold leading-snug">{property.title}</h3>

          <p className="mt-2 text-lg font-semibold">
            {price ?? '—'}
            {property.operation === 'rent' ? (
              <span className="ml-1 text-sm font-normal text-stone-500 dark:text-stone-400">
                {dict.property.forRent}
              </span>
            ) : null}
          </p>

          {specs.length > 0 ? (
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{specs.join(' · ')}</p>
          ) : null}
        </div>
      </Link>
    </article>
  )
}
