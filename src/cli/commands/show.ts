import { ATStoreClient } from '../../client/index.js'
import { printDetail, printJson } from '../output.js'
import { resolveListing } from '../resolve.js'

export async function showCommand(
  client: ATStoreClient,
  target: string,
  withReviews: boolean,
  reviewLimit: number,
  json: boolean,
): Promise<void> {
  const listing = await resolveListing(client, target)
  const reviews = withReviews
    ? (await client.listReviews({ uri: listing.uri, limit: reviewLimit })).reviews
    : []

  if (json) {
    printJson({ listing, reviews })
    return
  }

  const tip = !withReviews && listing.reviewCount ? `atstore show ${target} --reviews` : undefined
  printDetail(listing, reviews, tip)
}
