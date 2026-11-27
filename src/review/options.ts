export const DEFAULT_PDS = 'https://bsky.social'

export interface PublishReviewOptions {
  identifier: string
  appPassword: string
  pds?: string
  subject: string
  rating: number
  text?: string
}

export interface PublishResult {
  uri: string
  cid: string
  profileCreated: boolean
}
