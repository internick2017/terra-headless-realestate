import type { NextConfig } from 'next'

/**
 * Media lives on the WordPress host, so next/image has to be told it may
 * optimise images from there. Derive it from the GraphQL endpoint rather than
 * hardcoding a host: the two always point at the same WordPress install, and a
 * separate constant would be one more thing to remember when deploying.
 */
function wordpressImagePatterns() {
  const endpoint = process.env.WP_GRAPHQL_URL

  if (!endpoint) {
    return []
  }

  const { origin } = new URL(endpoint)

  return [new URL(`${origin}/wp-content/uploads/**`)]
}

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: wordpressImagePatterns(),

    // The dev WordPress runs on localhost, which resolves to a private IP, and
    // Next refuses to fetch those through the optimiser: an attacker could
    // otherwise use it to reach hosts inside the network (SSRF). Development is
    // the only place that restriction gets in the way — in production the CMS is
    // a public hostname — so lift it there and nowhere else.
    dangerouslyAllowLocalIP: isDev,
  },
}

export default nextConfig
