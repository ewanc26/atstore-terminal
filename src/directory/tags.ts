import type { ListingSummary } from '../types/index.js'

export interface TagCount {
  tag: string
  count: number
}

/** Count normalised tags across listings, most common first. */
export function countTags(listings: ListingSummary[]): TagCount[] {
  const counts = new Map<string, number>()

  for (const listing of listings) {
    for (const tag of listing.appTags ?? []) {
      const key = tag.trim().toLowerCase()
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}
