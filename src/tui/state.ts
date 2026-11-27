import { rating as formatRating } from '../format/index.js'
import type { ListingDetail, ListingSummary } from '../types/index.js'

export type View = 'list' | 'detail' | 'reviews'

export interface State {
  view: View
  listings: ListingSummary[]
  selected: number
  scroll: number
  query: string
  typing: boolean
  buffer: string
  status: string
  loading: boolean
  detail?: ListingDetail
  detailLines: string[]
  reviewLines: string[]
}

export function createState(initialQuery: string): State {
  return {
    view: 'list',
    listings: [],
    selected: 0,
    scroll: 0,
    query: initialQuery,
    typing: false,
    buffer: '',
    status: 'Loading the directory…',
    loading: true,
    detailLines: [],
    reviewLines: [],
  }
}

export function visibleCount(height: number): number {
  return Math.max(1, height - 5)
}

export function stateLines(state: State): string[] {
  if (state.view === 'list') {
    if (!state.listings.length) return ['No listings found.', 'Press / to search.']
    return state.listings.map((listing, index) => {
      const marker = index === state.selected ? '›' : ' '
      const handle = listing.productAccountHandle ? `@${listing.productAccountHandle}` : ''
      const score = formatRating(listing.reviewCount, listing.rating)
      const tags = listing.appTags?.slice(0, 3).join(', ') ?? listing.category ?? ''
      return `${marker} ${listing.name.padEnd(24).slice(0, 24)}  ${handle.padEnd(22).slice(0, 22)}  ${score.padEnd(14)}  ${tags}`
    })
  }

  if (state.view === 'reviews') return state.reviewLines
  return state.detailLines.length ? state.detailLines : ['No details loaded.']
}

export function title(state: State): string {
  if (state.view === 'detail' && state.detail) return `${state.detail.name} · details`
  if (state.view === 'reviews' && state.detail) return `${state.detail.name} · reviews`
  return state.query ? `search: ${state.query}` : 'directory'
}
