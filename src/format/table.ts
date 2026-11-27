import type { ListingSummary } from '../types/index.js'
import { rating } from './detail.js'
import { pad, padLeft, truncate } from './width.js'

export interface Column<T> {
  header: string
  get: (row: T) => string
  width: number
  align?: 'left' | 'right'
}

export function table<T>(rows: T[], columns: Array<Column<T>>): string[] {
  const widths = columns.map((column) => column.width)
  const rule = widths.map((width) => '─'.repeat(width)).join('  ')
  const lines: string[] = []

  const cells = (values: string[]) =>
    columns
      .map((column, index) => {
        const value = truncate(values[index] ?? '', widths[index])
        return column.align === 'right' ? padLeft(value, widths[index]) : pad(value, widths[index])
      })
      .join('  ')

  lines.push(cells(columns.map((column) => column.header)))
  lines.push(rule)
  for (const row of rows) lines.push(cells(columns.map((column) => column.get(row))))
  return lines
}

export function listingTable(listings: ListingSummary[], totalWidth = 100): string[] {
  const width = Math.max(70, totalWidth)
  const nameWidth = Math.min(30, Math.max(16, Math.round(width * 0.26)))
  const handleWidth = Math.min(28, Math.max(14, Math.round(width * 0.22)))
  const ratingWidth = 16
  const tagsWidth = Math.max(12, width - nameWidth - handleWidth - ratingWidth - 6)

  return table(listings, [
    {
      header: 'NAME',
      width: nameWidth,
      get: (listing) => `${listing.name}${listing.listingType === 'game' ? ' [game]' : ''}`,
    },
    {
      header: 'HANDLE',
      width: handleWidth,
      get: (listing) => (listing.productAccountHandle ? `@${listing.productAccountHandle}` : '—'),
    },
    {
      header: 'RATING',
      width: ratingWidth,
      align: 'right',
      get: (listing) => rating(listing.reviewCount, listing.rating),
    },
    {
      header: 'TAGS',
      width: tagsWidth,
      get: (listing) => listing.appTags?.join(', ') || listing.category || '—',
    },
  ])
}

export function tagTable(tags: Array<{ tag: string; count: number }>): string[] {
  return table(tags, [
    { header: 'TAG', width: 28, get: (row) => row.tag },
    { header: 'APPS', width: 8, align: 'right', get: (row) => String(row.count) },
  ])
}
