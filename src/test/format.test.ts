import assert from 'node:assert/strict'
import test from 'node:test'
import {
  detailLines,
  listingTable,
  rating,
  reviewLines,
  truncate,
  visibleWidth,
} from '../format/index.js'
import type { ListingDetail, ListingSummary, Review } from '../types/index.js'

const listing: ListingDetail = {
  uri: 'at://did:plc:test/fyi.atstore.listing.detail/abc',
  name: 'Example',
  tagline: 'A small example',
  description: 'A description that is long enough to wrap across lines in a narrow terminal.',
  externalUrl: 'https://example.com/',
  updatedAt: '2026-11-20T10:00:00.000Z',
  appTags: ['social', 'developer'],
  rating: '4.5',
  reviewCount: 12,
  links: [{ uri: 'https://example.com/docs', label: 'Docs' }],
}

test('rating formats stars and counts', () => {
  assert.equal(rating(12, '4.5'), '4.5 ★ (12)')
  assert.equal(rating(undefined, '5'), '5.0 ★')
  assert.equal(rating(0, undefined), '—')
})

test('visibleWidth and truncate handle wide characters', () => {
  assert.equal(visibleWidth('abc'), 3)
  assert.equal(visibleWidth('漢字'), 4)
  const shortened = truncate('abcdefghij', 6)
  assert.equal(visibleWidth(shortened), 6)
  assert.equal(shortened, 'abcde…')
})

test('listing table keeps columns aligned', () => {
  const rows = listingTable([{ ...listing, productAccountHandle: 'example.com' }], 90)
  assert.equal(rows.length, 3)
  assert.match(rows[0], /NAME/)
  assert.match(rows[2], /Example/)
  assert.match(rows[1], /^─{20,}  ─{10,}/)
})

test('detail lines include description, links and reviews', () => {
  const reviews: Review[] = [
    {
      id: '1',
      authorDid: 'did:plc:a',
      rating: 5,
      text: 'Lovely',
      reviewCreatedAt: '2026-11-25T10:00:00.000Z',
      authorHandle: 'a.test',
    },
  ]
  const lines = detailLines(listing, reviews)
  const joined = lines.join('\n')
  assert.match(joined, /https:\/\/example.com\//)
  assert.match(joined, /ABOUT/)
  assert.match(joined, /https:\/\/example.com\/docs/)
  assert.match(joined, /★★★★★  a.test/)
  assert.ok(reviewLines(reviews).length > 0)
})

test('listing type accepts summary-shaped rows', () => {
  const summary: ListingSummary = { uri: listing.uri, name: 'Example' }
  assert.equal(listingTable([summary])[2]?.includes('Example'), true)
})
