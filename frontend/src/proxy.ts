import { NextResponse, type NextRequest } from 'next/server'
import { LOCALES } from '@/lib/types'

const DEFAULT_LOCALE = 'en'

/**
 * Every page lives under a locale segment, so send bare paths to the default
 * language: `/` becomes `/en`, `/properties` becomes `/en/properties`.
 *
 * This is Next 16's `proxy` convention, which replaced `middleware`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )

  if (hasLocale) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`

  return NextResponse.redirect(url)
}

export const config = {
  // Skip Next internals, the API routes, and anything that looks like a file.
  matcher: ['/((?!_next|api|.*\\.).*)'],
}
