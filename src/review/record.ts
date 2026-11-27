export interface ReviewRecord {
  $type: 'fyi.atstore.listing.review'
  subject: string
  rating: number
  createdAt: string
  text?: string
}

/** Build the record without publishing it, for inspection or `--dry-run`. */
export function buildReviewRecord(subject: string, rating: number, text?: string): ReviewRecord {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be an integer from 1 to 5.')
  }

  return {
    $type: 'fyi.atstore.listing.review',
    subject,
    rating,
    createdAt: new Date().toISOString(),
    ...(text?.trim() ? { text: text.trim() } : {}),
  }
}
