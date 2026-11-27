export interface ServerDescription {
  service: string
  publicReads: boolean
  reviewsWrittenOnAuthorRepo: boolean
  defaultListingLimit: number
  maxListingLimit: number
  maxReviewLimit: number
  methods: string[]
}
