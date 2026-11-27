import assert from 'node:assert/strict'
import test from 'node:test'
import { CALLBACK_PAGE_HTML } from '../oauth/index.js'

test('OAuth callback page is a self-contained signed-in confirmation', () => {
  assert.match(CALLBACK_PAGE_HTML, /<title>Signed in · atstore-terminal<\/title>/)
  assert.match(CALLBACK_PAGE_HTML, /<h1>Signed in<\/h1>/)
  assert.match(CALLBACK_PAGE_HTML, /return to your terminal/)
  assert.doesNotMatch(CALLBACK_PAGE_HTML, /https?:\/\//)
  assert.doesNotMatch(CALLBACK_PAGE_HTML, /<script/)
})
