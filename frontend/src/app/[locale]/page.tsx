import { notFound } from 'next/navigation'
import { getDict } from '@/lib/i18n'
import { isLocale } from '@/lib/types'

/** Placeholder home; the featured listings land here in Task 9. */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  if (!isLocale(locale)) {
    notFound()
  }

  const dict = getDict(locale)

  return (
    <section>
      <h1 className="text-4xl font-semibold tracking-tight">{dict.home.heroTitle}</h1>
      <p className="mt-3 text-lg text-stone-600 dark:text-stone-400">{dict.home.heroSubtitle}</p>
    </section>
  )
}
