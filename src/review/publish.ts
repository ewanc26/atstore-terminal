import { AtprotoError } from './error.js'
import { DEFAULT_PDS, type PublishReviewOptions, type PublishResult } from './options.js'
import { getJson, postJson } from './pds.js'
import { buildReviewRecord } from './record.js'

interface Session {
  did: string
  handle?: string
  accessJwt: string
  refreshJwt?: string
}

/**
 * Publish a review to the author's own PDS. ATStore requires an
 * `fyi.atstore.profile` at rkey `self`, so create it when missing.
 *
 * App passwords are deliberately read from the environment, never argv.
 */
export async function publishReview(options: PublishReviewOptions): Promise<PublishResult> {
  const pds = (options.pds ?? process.env.ATPROTO_PDS ?? DEFAULT_PDS).replace(/\/+$/, '')
  const record = buildReviewRecord(options.subject, options.rating, options.text)

  const session = await postJson<Session>(pds, 'com.atproto.server.createSession', {
    identifier: options.identifier,
    password: options.appPassword,
  })
  if (!session.accessJwt || !session.did) {
    throw new Error('The PDS session response did not include an access token and DID.')
  }

  const profileCreated = await ensureProfile(pds, session, options.identifier)
  const created = await postJson<{ uri: string; cid: string }>(
    pds,
    'com.atproto.repo.createRecord',
    {
      repo: session.did,
      collection: 'fyi.atstore.listing.review',
      validate: false,
      record,
    },
    session.accessJwt,
  )

  if (!created.uri || !created.cid) {
    throw new Error('The PDS did not return a record URI and CID.')
  }
  return { uri: created.uri, cid: created.cid, profileCreated }
}

async function ensureProfile(pds: string, session: Session, identifier: string): Promise<boolean> {
  try {
    await getJson(
      pds,
      'com.atproto.repo.getRecord',
      { repo: session.did, collection: 'fyi.atstore.profile', rkey: 'self' },
      session.accessJwt,
    )
    return false
  } catch (error) {
    if (!(error instanceof AtprotoError) || !error.isRecordNotFound) throw error
  }

  await postJson(
    pds,
    'com.atproto.repo.putRecord',
    {
      repo: session.did,
      collection: 'fyi.atstore.profile',
      rkey: 'self',
      validate: false,
      record: {
        $type: 'fyi.atstore.profile',
        displayName: session.handle ?? identifier,
      },
    },
    session.accessJwt,
  )
  return true
}
