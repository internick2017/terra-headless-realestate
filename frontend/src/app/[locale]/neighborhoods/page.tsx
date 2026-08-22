import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { toPlainText } from '@/lib/html'
import { getDict } from '@/lib/i18n'
import { getNeighborhoods } from '@/lib/queries'
import { LOCALES, isLocale } from '@/lib/types'

/** Articles change even less often than listings, but the same hour will do. */
export const revalidate = 3600

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  if (!isLocale(locale)) {
    return {}
  }

  const dict = getDict(locale)

  return { title: dict.neighborhoods.title, description: dict.neighborhoods.intro }
}

export default async function NeighborhoodsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!isLocale(locale)) {
    notFound()
  }

  const dict = getDict(locale)
  const neighborhoods = await getNeighborhoods(locale)

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{dict.neighborhoods.title}</h1>
      <p className="mb-8 mt-2 text-stone-600 dark:text-stone-400">{dict.neighborhoods.intro}</p>

      {neighborhoods.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500 dark:border-stone-700 dark:text-stone-400">
          {dict.neighborhoods.empty}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {neighborhoods.map((neighborhood) => (
            <article
              key={neighborhood.slug}
              className="rounded-xl border border-stone-200 p-5 transition hover:shadow-md dark:border-stone-800"
            >
              <h2 className="text-xl font-semibold">
                <Link href={`/${locale}/neighborhoods/${neighborhood.slug}`}>
                  {neighborhood.title}
                </Link>
              </h2>

              <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                {toPlainText(neighborhood.excerpt)}
              </p>

              <Link
                href={`/${locale}/neighborhoods/${neighborhood.slug}`}
                className="mt-3 inline-block text-sm underline underline-offset-4"
              >
                {dict.neighborhoods.readMore}
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
