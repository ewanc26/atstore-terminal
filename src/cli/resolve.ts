import { ATStoreClient } from '../client/index.js'
import type { ListingDetail, ListingSummary, Review } from '../types/index.js'

/** Resolve a name, handle, at:// URI, or storefront URL to a full listing. */
export async function resolveListing(
  client: ATStoreClient,
  target: string,
): Promise<ListingDetail> {
  if (target.startsWith('at://')) return (await client.getListing({ uri: target })).listing
  if (/^https?:\/\//i.test(target)) {
    return (await client.getListing({ externalUrl: target })).listing
  }

  const needle = target.toLowerCase().replace(/^@/, '')
  const found = await client.search({ q: needle, limit: 100 })
  const match = found.listings.find((listing) => matches(listing, needle)) ?? found.listings[0]
  if (!match) throw new Error(`No listing matches ${JSON.stringify(target)}.`)
  return (await client.getListing({ uri: match.uri })).listing
}

export async function collectReviews(
  client: ATStoreClient,
  uri: string,
  limit: number,
  all: boolean,
): Promise<Review[]> {
  const reviews: Review[] = []
  let cursor: string | undefined

  do {
    const page = await client.listReviews({ uri, limit: all ? 100 : limit, cursor })
    reviews.push(...page.reviews)
    cursor = all && page.cursor && page.reviews.length ? page.cursor : undefined
  } while (cursor && reviews.length < 1000)

  return all ? reviews : reviews.slice(0, limit)
}

function matches(listing: ListingSummary, needle: string): boolean {
  const candidates = [
    listing.name,
    listing.productAccountHandle,
    listing.category,
    ...(listing.appTags ?? []),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase().replace(/^@/, ''))

  return candidates.some((value) => value === needle || value.includes(needle))
}
