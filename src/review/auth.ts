import process from 'node:process'
import { defaultOAuthStore, restoreOAuthSession } from '../oauth/index.js'
import type { FileOAuthStore } from '../oauth/index.js'
import type { AuthorizedPdsSession, ReviewAuth } from './options.js'

export interface AuthEnvironment {
  ATPROTO_IDENTIFIER?: string
  ATPROTO_APP_PASSWORD?: string
}

export interface ResolveReviewAuthOptions {
  env?: AuthEnvironment
  store?: FileOAuthStore
  restore?: (did: string, store: FileOAuthStore) => Promise<AuthorizedPdsSession & { did: string }>
}

/**
 * Prefer the stored OAuth session; fall back to the legacy app-password
 * environment variables. Credentials are only ever read from the environment.
 */
export async function resolveReviewAuth(
  options: ResolveReviewAuthOptions = {},
): Promise<ReviewAuth> {
  const env = options.env ?? process.env
  const store = options.store ?? defaultOAuthStore()
  const restore = options.restore ?? restoreOAuthSession

  const did = await store.getCurrentDid()
  if (did) {
    return { kind: 'oauth', session: await restore(did, store) }
  }

  const identifier = env.ATPROTO_IDENTIFIER
  const appPassword = env.ATPROTO_APP_PASSWORD
  if (identifier && appPassword) {
    return { kind: 'password', identifier, appPassword }
  }

  throw new Error(
    'Run `atstore login <handle>` first, or set ATPROTO_IDENTIFIER and ATPROTO_APP_PASSWORD.',
  )
}
