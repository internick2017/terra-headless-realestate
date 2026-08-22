/**
 * The public origin of the site. Everything that has to emit an absolute URL —
 * hreflang, the sitemap, JSON-LD, the enquiry email — goes through here, so
 * there is one place to be wrong rather than six.
 */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`
}
