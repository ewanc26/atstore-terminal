import process from 'node:process'
import { ATStoreClient } from '../../client/index.js'
import { buildReviewRecord, publishReview } from '../../review/index.js'
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

  const identifier = process.env.ATPROTO_IDENTIFIER
  const appPassword = process.env.ATPROTO_APP_PASSWORD
  if (!identifier || !appPassword) {
    throw new Error(
      'Set ATPROTO_IDENTIFIER and ATPROTO_APP_PASSWORD (an app password) before using --post.',
    )
  }

  const published = await publishReview({
    identifier,
    appPassword,
    subject: listing.uri,
    rating,
    text,
  })
  if (json) printJson(published)
  else printPublished(published)
}
