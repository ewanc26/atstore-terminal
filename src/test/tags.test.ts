import assert from 'node:assert/strict'
import test from 'node:test'
import { countTags } from '../directory/index.js'
import type { ListingSummary } from '../types/index.js'

test('countTags normalises and sorts tags by frequency', () => {
  const listings: ListingSummary[] = [
    { uri: 'at://x/1', name: 'One', appTags: ['Social', 'Games', ' social '] },
    { uri: 'at://x/2', name: 'Two', appTags: ['social'] },
    { uri: 'at://x/3', name: 'Three' },
  ]

  assert.deepEqual(countTags(listings), [
    { tag: 'social', count: 3 },
    { tag: 'games', count: 1 },
  ])
})

test('countTags returns an empty list without tags', () => {
  assert.deepEqual(countTags([]), [])
})
