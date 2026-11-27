import process from 'node:process'
import { AtprotoError } from './error.js'
import { DEFAULT_PDS, type PublishResult, type ReviewAuth } from './options.js'
import { oauthTransport, passwordTransport, postJson, type PdsTransport } from './pds.js'
import { buildReviewRecord } from './record.js'

interface Session {
  did: string
  handle?: string
  accessJwt: string
}

/**
 * Publish a review to the author's own PDS. ATStore requires an
 * `fyi.atstore.profile` at rkey `self`, so create it when missing.
 *
 * OAuth is preferred; app passwords remain available through the environment.
 */
export async function publishReview(options: {
  auth: ReviewAuth
  subject: string
  rating: number
  text?: string
}): Promise<PublishResult> {
  const record = buildReviewRecord(options.subject, options.rating, options.text)
  const { transport, did, displayName } = await resolveAuth(options.auth)

  const profileCreated = await ensureProfile(transport, did, displayName)
  const created = await transport.post<{ uri: string; cid: string }>(
    'com.atproto.repo.createRecord',
    {
      repo: did,
      collection: 'fyi.atstore.listing.review',
      validate: false,
      record,
    },
  )

  if (!created.uri || !created.cid) {
    throw new Error('The PDS did not return a record URI and CID.')
  }
  return { uri: created.uri, cid: created.cid, profileCreated }
}

async function resolveAuth(
  auth: ReviewAuth,
): Promise<{ transport: PdsTransport; did: string; displayName: string }> {
  if (auth.kind === 'oauth') {
    return {
      transport: oauthTransport(auth.session),
      did: auth.session.did,
      displayName: auth.session.did,
    }
  }

  const pds = (auth.pds ?? process.env.ATPROTO_PDS ?? DEFAULT_PDS).replace(/\/+$/, '')
  const session = await postJson<Session>(pds, 'com.atproto.server.createSession', {
    identifier: auth.identifier,
    password: auth.appPassword,
  })
  if (!session.accessJwt || !session.did) {
    throw new Error('The PDS session response did not include an access token and DID.')
  }

  return {
    transport: passwordTransport(pds, session.accessJwt),
    did: session.did,
    displayName: session.handle ?? auth.identifier,
  }
}

async function ensureProfile(
  transport: PdsTransport,
  did: string,
  displayName: string,
): Promise<boolean> {
  try {
    await transport.get('com.atproto.repo.getRecord', {
      repo: did,
      collection: 'fyi.atstore.profile',
      rkey: 'self',
    })
    return false
  } catch (error) {
    if (!(error instanceof AtprotoError) || !error.isRecordNotFound) throw error
  }

  await transport.post('com.atproto.repo.putRecord', {
    repo: did,
    collection: 'fyi.atstore.profile',
    rkey: 'self',
    validate: false,
    record: {
      $type: 'fyi.atstore.profile',
      displayName,
    },
  })
  return true
}
