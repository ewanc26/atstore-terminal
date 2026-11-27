import assert from 'node:assert/strict'
import test from 'node:test'
import { buildReviewRecord } from '../review/index.js'

const subject = 'at://did:plc:test/fyi.atstore.listing.detail/abc'

test('review drafts use the ATStore lexicon and omit empty text', () => {
  const record = buildReviewRecord(subject, 4, '  ')
  assert.equal(record.$type, 'fyi.atstore.listing.review')
  assert.equal(record.subject, subject)
  assert.equal(record.rating, 4)
  assert.equal('text' in record, false)
  assert.match(record.createdAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('review drafts trim text and reject invalid ratings', () => {
  const record = buildReviewRecord(subject, 5, '  Lovely app  ')
  assert.equal(record.text, 'Lovely app')
  assert.throws(() => buildReviewRecord(subject, 0), /1 to 5/)
  assert.throws(() => buildReviewRecord(subject, 6), /1 to 5/)
  assert.throws(() => buildReviewRecord(subject, 4.5), /1 to 5/)
})
