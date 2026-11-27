export interface Review {
  id: string
  authorDid: string
  rating: number
  text: string | null
  reviewCreatedAt: string
  authorDisplayName?: string | null
  authorHandle?: string | null
  authorAvatarUrl?: string | null
  replyCount?: number
  canReply?: boolean
}

export interface ReviewResult {
  reviews: Review[]
  cursor?: string
}

export interface ListReviewsParams {
  uri: string
  limit?: number
  cursor?: string
}
