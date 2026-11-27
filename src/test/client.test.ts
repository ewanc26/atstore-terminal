import assert from 'node:assert/strict'
import test from 'node:test'
import { ATStoreClient, ATStoreError } from '../client/index.js'
import type { GetListingResponse, SearchResult } from '../types/index.js'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

test('search encodes repeatable filters and scalars', async () => {
  let requested: URL | undefined
  const fetchMock = (async (input: RequestInfo | URL) => {
    requested = input instanceof URL ? input : new URL(String(input))
    return jsonResponse({ listings: [], cursor: 'next' } satisfies SearchResult)
  }) as typeof fetch

  const client = new ATStoreClient({ baseUrl: 'https://example.test/', fetch: fetchMock })
  const result = await client.search({
    q: 'bluesky client',
    tag: ['social', 'developer'],
    has: ['open-source'],
    minRating: '4.5',
    limit: 10,
    sort: 'rating',
  })

  assert.equal(result.cursor, 'next')
  assert.equal(requested?.origin, 'https://example.test')
  assert.equal(requested?.pathname, '/xrpc/fyi.atstore.directory.searchListings')
  assert.equal(requested?.searchParams.get('q'), 'bluesky client')
  assert.deepEqual(requested?.searchParams.getAll('tag'), ['social', 'developer'])
  assert.deepEqual(requested?.searchParams.getAll('has'), ['open-source'])
  assert.equal(requested?.searchParams.get('minRating'), '4.5')
  assert.equal(requested?.searchParams.get('limit'), '10')
})

test('getListing merges root-level detail fields with older listing-level fields', async () => {
  const body: GetListingResponse = {
    listing: { uri: 'at://did:plc:test/fyi.atstore.listing.detail/abc', name: 'Example' },
    externalUrl: 'https://example.com/',
    updatedAt: '2026-11-20T10:00:00.000Z',
    createdAt: '2026-10-01T10:00:00.000Z',
    sourceFullDescription: 'A detailed description',
    screenshots: ['https://example.com/a.png'],
    links: [{ uri: 'https://example.com/docs', label: 'Docs' }],
  }
  const client = new ATStoreClient({
    baseUrl: 'https://example.test',
    fetch: (async () => jsonResponse(body)) as typeof fetch,
  })

  const { listing } = await client.getListing({ uri: body.listing.uri })
  assert.equal(listing.externalUrl, 'https://example.com/')
  assert.equal(listing.updatedAt, '2026-11-20T10:00:00.000Z')
  assert.equal(listing.description, 'A detailed description')
  assert.equal(listing.screenshots?.length, 1)
  assert.equal(listing.links?.[0]?.label, 'Docs')
})

test('getListing requires exactly one identifier', async () => {
  const client = new ATStoreClient({
    fetch: (async () => {
      throw new Error('fetch should not be called')
    }) as typeof fetch,
  })
  await assert.rejects(() => client.getListing({}), ATStoreError)
  await assert.rejects(
    () => client.getListing({ uri: 'at://x', externalUrl: 'https://x.test' }),
    ATStoreError,
  )
})

test('XRPC errors include status and error code', async () => {
  const client = new ATStoreClient({
    fetch: (async () =>
      jsonResponse({ error: 'ListingNotFound', message: 'No such listing' }, 404)) as typeof fetch,
  })
  await assert.rejects(
    () => client.getListing({ uri: 'at://x' }),
    (error: unknown) => {
      assert.ok(error instanceof ATStoreError)
      assert.equal(error.status, 404)
      assert.equal(error.code, 'ListingNotFound')
      assert.equal(error.message, 'No such listing')
      return true
    },
  )
})

test('collect follows cursors up to the page limit', async () => {
  let calls = 0
  const client = new ATStoreClient({
    fetch: (async () => {
      calls += 1
      return jsonResponse({
        listings: [{ uri: `at://x/${calls}`, name: `App ${calls}` }],
        cursor: calls < 3 ? `c${calls}` : undefined,
      })
    }) as typeof fetch,
  })

  const listings = await client.collect({}, 5)
  assert.equal(calls, 3)
  assert.deepEqual(
    listings.map((listing) => listing.name),
    ['App 1', 'App 2', 'App 3'],
  )
})
