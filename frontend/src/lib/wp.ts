import { GraphQLClient } from 'graphql-request'

const endpoint = process.env.WP_GRAPHQL_URL

if (!endpoint) {
  // Failing here beats a confusing "fetch failed" on every page render.
  throw new Error('WP_GRAPHQL_URL is not set. Copy .env.example to .env.local.')
}

export const wp = new GraphQLClient(endpoint)

export async function wpQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  return wp.request<T>(query, variables)
}
