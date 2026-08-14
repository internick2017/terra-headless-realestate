import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.fn()

vi.mock('graphql-request', () => ({
  GraphQLClient: class {
    request = request
  },
}))

// wp.ts throws at import time when the endpoint is missing, so set it first.
process.env.WP_GRAPHQL_URL = 'http://wordpress.test/graphql'

describe('wpQuery', () => {
  beforeEach(() => {
    request.mockReset()
  })

  it('forwards the query and variables to the client', async () => {
    const { wpQuery } = await import('./wp')
    request.mockResolvedValue({ properties: { nodes: [] } })

    await wpQuery('{ properties { nodes { slug } } }', { language: 'EN' })

    expect(request).toHaveBeenCalledWith('{ properties { nodes { slug } } }', {
      language: 'EN',
    })
  })

  it('returns the parsed data', async () => {
    const { wpQuery } = await import('./wp')
    request.mockResolvedValue({ properties: { nodes: [{ slug: 'downtown-loft' }] } })

    const data = await wpQuery<{ properties: { nodes: { slug: string }[] } }>('{ ... }')

    expect(data.properties.nodes[0].slug).toBe('downtown-loft')
  })
})
