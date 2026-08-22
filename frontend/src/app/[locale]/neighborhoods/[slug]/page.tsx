import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getDict } from '@/lib/i18n'
import { getNeighborhood, getNeighborhoodSlugs } from '@/lib/queries'
import { LOCALES, alternateLinks, isLocale, resolveTranslatedRoute } from '@/lib/types'

export const revalidate = 3600

export async function generateStaticParams() {
  const perLocale = await Promise.all(
    LOCALES.map(async (locale) => {
      const slugs = await getNeighborhoodSlugs(locale)
      return slugs.map((slug) => ({ locale, slug }))
    }),
  )

  return perLocale.flat()
}

/** Same shape as the listings route: see its `load` for why redirects happen. */
async function load(params: Promise<{ locale: string; slug: string }>) {
  const { locale, slug } = await params

  if (!isLocale(locale)) {
    return null
  }

  const neighborhood = await getNeighborhood(slug)

  if (!neighborhood) {
    return null
  }

  const route = resolveTranslatedRoute(neighborhood, locale)

  if (route.action === 'notFound') {
    return null
  }

  return {
    locale,
    neighborhood,
    redirectTo:
      route.action === 'redirect' ? `/${locale}/neighborhoods/${route.slug}` : null,
  }
}

function toSummary(excerpt: string | null, fallback: string): string {
  const text = (excerpt ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) {
    return fallback
  }

  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const loaded = await load(params)

  if (!loaded || loaded.redirectTo) {
    return {}
  }

  const { locale, neighborhood } = loaded
  const dict = getDict(locale)
  const description = toSummary(neighborhood.excerpt, dict.neighborhoods.intro)

  const languages = alternateLinks(
    neighborhood,
    locale,
    (target, slug) => `/${target}/neighborhoods/${slug}`,
  )

  return {
    title: neighborhood.title,
    description,
    alternates: { canonical: languages[locale], languages },
    openGraph: { title: neighborhood.title, description, type: 'article' },
  }
}

export default async function NeighborhoodPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const loaded = await load(params)

  if (!loaded) {
    notFound()
  }

  const { locale, neighborhood, redirectTo } = loaded

  if (redirectTo) {
    redirect(redirectTo)
  }

  const dict = getDict(locale)

  return (
    <article className="mx-auto max-w-2xl">
      <Link
        href={`/${locale}/neighborhoods`}
        className="text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
      >
        ← {dict.neighborhoods.back}
      </Link>

      <h1 className="mb-6 mt-4 text-3xl font-semibold tracking-tight">{neighborhood.title}</h1>

      {neighborhood.content ? (
        // Authored in WordPress by the agency, not by a visitor.
        <div
          className="space-y-4 leading-relaxed text-stone-700 dark:text-stone-300"
          dangerouslySetInnerHTML={{ __html: neighborhood.content }}
        />
      ) : null}

      <p className="mt-10">
        <Link
          href={`/${locale}/properties`}
          className="text-sm underline underline-offset-4"
        >
          {dict.home.viewAll} →
        </Link>
      </p>
    </article>
  )
}
