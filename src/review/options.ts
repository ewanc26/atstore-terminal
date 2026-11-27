export const DEFAULT_PDS = 'https://bsky.social'

/** The small surface of an OAuth session needed to write review records. */
export interface AuthorizedPdsSession {
  did: string
  fetchHandler(pathname: string, init?: RequestInit): Promise<Response>
}

export type ReviewAuth =
  | { kind: 'password'; identifier: string; appPassword: string; pds?: string }
  | { kind: 'oauth'; session: AuthorizedPdsSession }

export interface PublishReviewOptions {
  auth: ReviewAuth
  subject: string
  rating: number
  text?: string
}

export interface PublishResult {
  uri: string
  cid: string
  profileCreated: boolean
}
