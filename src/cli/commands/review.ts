import { ATStoreClient } from '../../client/index.js'
import { buildReviewRecord, publishReview, resolveReviewAuth } from '../../review/index.js'
import { printJson, printPublished, printReviewDraft } from '../output.js'
import { resolveListing } from '../resolve.js'

export async function reviewCommand(
  client: ATStoreClient,
  target: string,
  rating: number,
  text: string | undefined,
  post: boolean,
  json: boolean,
): Promise<void> {
  const listing = await resolveListing(client, target)
  const record = buildReviewRecord(listing.uri, rating, text)

  if (!post) {
    if (json) printJson(record)
    else printReviewDraft(listing, record)
    return
  }

  const auth = await resolveReviewAuth()
  const published = await publishReview({
    auth,
    subject: listing.uri,
    rating,
    text,
  })
  if (json) printJson(published)
  else printPublished(published)
}
