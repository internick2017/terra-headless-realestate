import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'

/**
 * Everything is public and everything is meant to be indexed — including by AI
 * crawlers, which is the point of the JSON-LD and of /llms.txt. The only path
 * worth keeping out is the enquiry endpoint, which nothing should be crawling.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
