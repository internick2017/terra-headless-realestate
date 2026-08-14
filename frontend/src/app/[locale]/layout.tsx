import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LanguageSwitcher } from '@/components/language-switcher'
import { getDict } from '@/lib/i18n'
import { LOCALES, isLocale } from '@/lib/types'
import '../globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

/**
 * This is the root layout: it lives under [locale] so `<html lang>` can carry
 * the actual language of the page rather than a hardcoded one. Every route sits
 * beneath a locale, and middleware sends bare paths to the default one.
 */
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

  return {
    title: { default: dict.brand, template: `%s · ${dict.brand}` },
    description: dict.tagline,
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // An unknown segment (/fr, /admin) is a 404 rather than a page with missing copy.
  if (!isLocale(locale)) {
    notFound()
  }

  const dict = getDict(locale)

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <header className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-4">
            <Link href={`/${locale}`} className="text-lg font-semibold tracking-tight">
              {dict.brand}
            </Link>

            <nav className="flex items-center gap-4 text-sm">
              <Link
                href={`/${locale}/properties`}
                className="text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
              >
                {dict.nav.properties}
              </Link>
              <Link
                href={`/${locale}/neighborhoods`}
                className="text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
              >
                {dict.nav.neighborhoods}
              </Link>
            </nav>

            <div className="ml-auto">
              <LanguageSwitcher current={locale} label={dict.switcher.label} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>

        <footer className="border-t border-stone-200 px-4 py-6 text-sm text-stone-500 dark:border-stone-800 dark:text-stone-400">
          <div className="mx-auto w-full max-w-6xl">{dict.footer.note}</div>
        </footer>
      </body>
    </html>
  )
}
