import { ATStoreClient } from '../../client/index.js'
import { printJson, printReviews } from '../output.js'
import { collectReviews, resolveListing } from '../resolve.js'

export async function reviewsCommand(
  client: ATStoreClient,
  target: string,
  limit: number,
  all: boolean,
  json: boolean,
): Promise<void> {
  const listing = await resolveListing(client, target)
  const reviews = await collectReviews(client, listing.uri, limit, all)

  if (json) printJson({ listing: listing.uri, reviews })
  else printReviews(listing, reviews)
}
