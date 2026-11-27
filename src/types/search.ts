import type { ListingSummary } from './listing.js'

export const SORTS = [
  'popular',
  'rating',
  'reviews',
  'favorites',
  'newest',
  'updated',
  'alphabetical',
] as const

export const EXTRAS = ['open-source', 'donations', 'official'] as const
export const MIN_RATINGS = ['3', '4', '4.5'] as const

export type Sort = (typeof SORTS)[number]
export type Extra = (typeof EXTRAS)[number]
export type MinRating = (typeof MIN_RATINGS)[number]

export interface SearchParams {
  q?: string
  sort?: Sort
  tag?: string[]
  category?: string[]
  data?: string[]
  minRating?: MinRating
  has?: Extra[]
  limit?: number
  cursor?: string
}

export interface SearchResult {
  listings: ListingSummary[]
  cursor?: string
}
