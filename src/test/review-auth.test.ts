import assert from 'node:assert/strict'
import test from 'node:test'
import type { FileOAuthStore } from '../oauth/index.js'
import {
  AtprotoError,
  oauthTransport,
  publishReview,
  resolveReviewAuth,
  type AuthorizedPdsSession,
} from '../review/index.js'

const subject = 'at://did:plc:test/fyi.atstore.listing.detail/abc'
const did = 'did:plc:test'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function fakeStore(currentDid?: string): FileOAuthStore {
  return { getCurrentDid: async () => currentDid } as unknown as FileOAuthStore
}

function fakeSession(
  handler: (pathname: string, init?: RequestInit) => Promise<Response>,
): AuthorizedPdsSession & { did: string } {
  return { did, fetchHandler: handler }
}

test('review auth prefers a stored OAuth session', async () => {
  const session = fakeSession(async () => jsonResponse({}))
  const auth = await resolveReviewAuth({
    store: fakeStore(did),
    restore: async () => session,
  })

  assert.equal(auth.kind, 'oauth')
  if (auth.kind === 'oauth') assert.equal(auth.session, session)
})

test('review auth falls back to environment credentials', async () => {
  const auth = await resolveReviewAuth({
    env: {
      ATPROTO_IDENTIFIER: 'user.example',
      ATPROTO_APP_PASSWORD: 'placeholder',
    },
    store: fakeStore(),
  })

  assert.deepEqual(auth, {
    kind: 'password',
    identifier: 'user.example',
    appPassword: 'placeholder',
  })
})

test('review auth explains how to sign in when nothing is configured', async () => {
  await assert.rejects(() => resolveReviewAuth({ env: {}, store: fakeStore() }), /atstore login/)
})

test('OAuth publishing uses the session transport and skips an existing profile', async () => {
  const paths: string[] = []
  const session = fakeSession(async (pathname) => {
    paths.push(pathname)
    if (pathname.startsWith('/xrpc/com.atproto.repo.getRecord')) {
      return jsonResponse({ uri: `at://${did}/fyi.atstore.profile/self` })
    }
    return jsonResponse({ uri: `${subject}.review`, cid: 'review-cid' })
  })

  const result = await publishReview({
    auth: { kind: 'oauth', session },
    subject,
    rating: 5,
    text: 'Lovely client',
  })

  assert.deepEqual(result, { uri: `${subject}.review`, cid: 'review-cid', profileCreated: false })
  assert.equal(paths.length, 2)
  assert.match(paths[0] ?? '', /com\.atproto\.repo\.getRecord/)
  assert.match(paths[1] ?? '', /com\.atproto\.repo\.createRecord/)
})

test('OAuth publishing creates the ATStore profile when missing', async () => {
  const paths: string[] = []
  const session = fakeSession(async (pathname) => {
    paths.push(pathname)
    if (pathname.startsWith('/xrpc/com.atproto.repo.getRecord')) {
      return jsonResponse({ error: 'RecordNotFound', message: 'missing' }, 404)
    }
    return jsonResponse({ uri: `${subject}.review`, cid: 'review-cid' })
  })

  const result = await publishReview({
    auth: { kind: 'oauth', session },
    subject,
    rating: 4,
  })

  assert.equal(result.profileCreated, true)
  assert.equal(paths.length, 3)
  assert.match(paths[1] ?? '', /com\.atproto\.repo\.putRecord/)
})

test('OAuth transport maps XRPC errors to AtprotoError', async () => {
  const transport = oauthTransport(
    fakeSession(async () => jsonResponse({ error: 'InvalidToken', message: 'expired' }, 401)),
  )

  await assert.rejects(
    () => transport.post('com.atproto.repo.createRecord', {}),
    (error: unknown) => {
      assert.ok(error instanceof AtprotoError)
      assert.equal(error.status, 401)
      assert.equal(error.code, 'InvalidToken')
      assert.equal(error.message, 'expired')
      return true
    },
  )
})
