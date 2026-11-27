import type { ListingDetail, Review } from '../types/index.js'
import { visibleWidth } from './width.js'
import { wrap } from './wrap.js'

export function rating(reviewCount?: number, average?: string): string {
  if (!average || Number.isNaN(Number(average))) return '—'
  const stars = Number(average).toFixed(1)
  return reviewCount ? `${stars} ★ (${reviewCount})` : `${stars} ★`
}

export function relativeDate(value?: string | null): string {
  if (!value) return '—'
  const time = Date.parse(value)
  if (Number.isNaN(time)) return value

  const seconds = Math.round((time - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'long' })
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  if (Math.abs(seconds) < 60) return rtf.format(seconds, 'second')
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return value
}

export function detailLines(listing: ListingDetail, reviews: Review[] = []): string[] {
  const lines: string[] = [
    listing.name,
    '='.repeat(visibleWidth(listing.name)),
    '',
    listing.tagline ?? '',
  ]

  if (listing.productAccountHandle) lines.push(`@${listing.productAccountHandle}`)
  if (listing.externalUrl) lines.push(`site:    ${listing.externalUrl}`)
  lines.push(`rating:  ${rating(listing.reviewCount, listing.rating)}`)
  lines.push(`tagline: ${listing.tagline ?? '—'}`)
  lines.push(`tags:    ${listing.appTags?.join(', ') || '—'}`)
  lines.push(`record:  ${listing.uri}`)
  lines.push(`updated: ${relativeDate(listing.updatedAt)}`)

  if (listing.description) {
    lines.push('', 'ABOUT', '-----', ...wrap(listing.description, 88))
  }
  if (listing.links?.length) {
    lines.push(
      '',
      'LINKS',
      '-----',
      ...listing.links.map((link) => `  ${link.type ?? 'link'}: ${link.uri}`),
    )
  }
  if (reviews.length) {
    lines.push('', `REVIEWS (${reviews.length})`, '----------------', ...reviewLines(reviews))
  }
  return lines.filter((line, index) => line !== '' || lines[index - 1] !== '')
}

export function reviewLines(reviews: Review[]): string[] {
  const lines: string[] = []
  for (const review of reviews) {
    const who = review.authorDisplayName || review.authorHandle || review.authorDid
    const text = review.text?.trim()
    lines.push(
      `  ${'★'.repeat(review.rating)}${'☆'.repeat(Math.max(0, 5 - review.rating))}  ${who} · ${relativeDate(review.reviewCreatedAt)}`,
    )
    if (text) lines.push(...wrap(text, 84).map((line) => `    ${line}`))
    lines.push('')
  }
  return lines
}
