'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { withLocale } from '@/lib/i18n'
import { LOCALES, type Locale } from '@/lib/types'

/**
 * Swaps the locale segment of the current path, so switching language keeps the
 * visitor on the page they were reading instead of dropping them at the home page.
 *
 * Note this maps route to route, not translation to translation: a property
 * detail page resolves its own translated slug server-side.
 */
export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  const pathname = usePathname() ?? '/'

  return (
    <nav aria-label={label} className="flex items-center gap-1 text-sm">
      {LOCALES.map((locale) => {
        const active = locale === current

        return (
          <Link
            key={locale}
            href={withLocale(pathname, locale)}
            hrefLang={locale}
            aria-current={active ? 'true' : undefined}
            className={
              active
                ? 'rounded px-2 py-1 font-semibold text-stone-900 dark:text-stone-100'
                : 'rounded px-2 py-1 text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100'
            }
          >
            {locale.toUpperCase()}
          </Link>
        )
      })}
    </nav>
  )
}
