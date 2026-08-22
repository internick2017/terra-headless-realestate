import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LeadForm } from '@/components/lead-form'
import { PropertyGallery } from '@/components/property-gallery'
import { PropertyMap } from '@/components/property-map'
import { formatPrice } from '@/lib/format'
import { getDict } from '@/lib/i18n'
import { getPropertySlugs, getProperty } from '@/lib/queries'
import { propertyJsonLd } from '@/lib/schema'
import { absoluteUrl } from '@/lib/site'
import { propertySpecs } from '@/lib/specs'
import {
  LOCALES,
  alternateLinks,
  isLocale,
  resolveTranslatedRoute,
  type PropertyDetail,
} from '@/lib/types'

/**
 * ISR: listings change rarely, so every visitor gets a static page, and an edit
 * in WordPress appears within the hour without a redeploy.
 */
export const revalidate = 3600

/**
 * Prerender the catalogue at build time. A slug that appears later — a listing
 * added after the deploy — is still rendered on first request and then cached,
 * which is the default and is what we want.
 */
export async function generateStaticParams() {
  const perLocale = await Promise.all(
    LOCALES.map(async (locale) => {
      const slugs = await getPropertySlugs(locale)
      return slugs.map((slug) => ({ locale, slug }))
    }),
  )

  return perLocale.flat()
}

/**
 * Resolve and validate the route in one place, for the page and its metadata.
 *
 * Returns the property only when this URL is the right one for it; a slug from
 * the other language comes back as a redirect for the page to follow, which is
 * what makes the language switcher work on a detail page — it can swap the
 * locale segment, but it cannot translate a slug.
 */
async function load(params: Promise<{ locale: string; slug: string }>) {
  const { locale, slug } = await params

  if (!isLocale(locale)) {
    return null
  }

  const property = await getProperty(slug)

  if (!property) {
    return null
  }

  const route = resolveTranslatedRoute(property, locale)

  if (route.action === 'notFound') {
    return null
  }

  if (route.action === 'redirect') {
    return { locale, property, redirectTo: `/${locale}/properties/${route.slug}` }
  }

  return { locale, property, redirectTo: null }
}

/**
 * Strip the WordPress body down to a description. `content` is HTML, and a meta
 * description with tags in it is worse than none.
 */
function toDescription(property: PropertyDetail, fallback: string): string {
  const text = (property.content ?? '')
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

  if (!loaded) {
    return {}
  }

  const { locale, property, redirectTo } = loaded

  if (redirectTo) {
    return {}
  }

  const dict = getDict(locale)
  const cover = property.gallery[0]
  const description = toDescription(property, dict.tagline)

  // hreflang, built from Polylang's own links rather than by swapping the
  // locale segment: the translated listing has its own slug.
  const languages = alternateLinks(
    property,
    locale,
    (target, slug) => `/${target}/properties/${slug}`,
  )

  return {
    title: property.title,
    description,
    alternates: { canonical: languages[locale], languages },
    openGraph: {
      title: property.title,
      description,
      images: cover ? [{ url: cover.sourceUrl, alt: cover.altText ?? property.title }] : undefined,
    },
  }
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const loaded = await load(params)

  // An unknown slug, or one belonging to the other language, is a 404 rather
  // than an empty page.
  if (!loaded) {
    notFound()
  }

  const { locale, property, redirectTo } = loaded

  // The visitor asked for this listing in the other language: send them to its
  // own URL rather than serving the same page under two addresses.
  if (redirectTo) {
    redirect(redirectTo)
  }

  const dict = getDict(locale)
  const specs = propertySpecs(property, dict, locale)
  const price = formatPrice(property.price, property.currency, locale)

  const canonical = absoluteUrl(`/${locale}/properties/${property.slug}`)

  return (
    <article>
      {/* Machine-readable twin of everything below, for search engines and
          assistants. Emitted server-side so a crawler that runs no JavaScript
          still sees it. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(propertyJsonLd(property, locale, canonical)),
        }}
      />

      <Link
        href={`/${locale}/properties`}
        className="text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
      >
        ← {dict.detail.back}
      </Link>

      <header className="mb-6 mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {property.propertyType ? dict.property.types[property.propertyType] : null}
          {property.neighborhoodName ? ` · ${property.neighborhoodName}` : null}
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{property.title}</h1>

        <p className="mt-2 text-2xl font-semibold">
          {price ?? dict.detail.priceOnRequest}
          {price && property.operation === 'rent' ? (
            <span className="ml-2 text-base font-normal text-stone-500 dark:text-stone-400">
              {dict.property.forRent}
            </span>
          ) : null}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-10">
          <PropertyGallery images={property.gallery} title={property.title} />

          {property.content ? (
            <section>
              <h2 className="mb-3 text-xl font-semibold">{dict.detail.description}</h2>
              {/* The body is authored in WordPress by the agency, not by a visitor. */}
              <div
                className="space-y-4 leading-relaxed text-stone-700 dark:text-stone-300"
                dangerouslySetInnerHTML={{ __html: property.content }}
              />
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-xl font-semibold">{dict.detail.location}</h2>
            <PropertyMap
              latitude={property.latitude}
              longitude={property.longitude}
              dict={dict}
            />
          </section>
        </div>

        <aside className="space-y-8">
          {specs.length > 0 ? (
            <section className="rounded-xl border border-stone-200 p-5 dark:border-stone-800">
              <h2 className="mb-4 text-lg font-semibold">{dict.detail.specs}</h2>

              <dl className="divide-y divide-stone-200 text-sm dark:divide-stone-800">
                {specs.map((spec) => (
                  <div key={spec.label} className="flex justify-between gap-4 py-2">
                    <dt className="text-stone-500 dark:text-stone-400">{spec.label}</dt>
                    <dd className="text-right font-medium">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section className="rounded-xl border border-stone-200 p-5 dark:border-stone-800">
            <h2 className="mb-4 text-lg font-semibold">{dict.lead.title}</h2>
            <LeadForm
              propertySlug={property.slug}
              propertyTitle={property.title}
              locale={locale}
              dict={dict}
            />
          </section>

          {property.agentName ? (
            <section className="rounded-xl border border-stone-200 p-5 dark:border-stone-800">
              <h2 className="mb-2 text-lg font-semibold">{dict.detail.agent}</h2>
              <p className="text-sm">{property.agentName}</p>

              {property.agentEmail ? (
                <a
                  href={`mailto:${property.agentEmail}`}
                  className="mt-1 block text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                >
                  {property.agentEmail}
                </a>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>
    </article>
  )
}
