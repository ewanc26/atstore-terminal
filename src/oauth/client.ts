import http from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  buildAtprotoLoopbackClientMetadata,
  NodeOAuthClient,
  requestLocalLock,
  type OAuthSession,
} from '@atproto/oauth-client-node'
import { openInBrowser } from '../tui/browser.js'
import { DEFAULT_REDIRECT_URI, defaultOAuthStore, type FileOAuthStore } from './store.js'

/**
 * `transition:generic` is the OAuth equivalent of an app password. Some
 * self-hosted PDSes do not yet advertise granular `repo:` scopes, so this
 * keeps review publishing working across the widest range of servers.
 */
export const REVIEW_SCOPE = 'atproto transition:generic'

const CALLBACK_PATH = '/callback'
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000

export function createOAuthClient(
  store: FileOAuthStore = defaultOAuthStore(),
  redirectUri = DEFAULT_REDIRECT_URI,
): NodeOAuthClient {
  return new NodeOAuthClient({
    clientMetadata: buildAtprotoLoopbackClientMetadata({
      scope: REVIEW_SCOPE,
      redirect_uris: [redirectUri],
    }),
    stateStore: {
      get: (key) => store.getState(key),
      set: (key, value) => store.setState(key, value),
      del: (key) => store.delState(key),
    },
    sessionStore: {
      get: (key) => store.getSession(key),
      set: (key, value) => store.setSession(key, value),
      del: (key) => store.delSession(key),
    },
    requestLock: requestLocalLock,
  })
}

/** Authorise against the handle's own PDS, including self-hosted servers. */
export async function loginWithOAuth(
  handle: string,
  store: FileOAuthStore = defaultOAuthStore(),
): Promise<OAuthSession> {
  const listener = await listenForCallback()
  await store.setRedirectUri(listener.redirectUri)
  const client = createOAuthClient(store, listener.redirectUri)

  try {
    const authUrl = await client.authorize(handle)
    openInBrowser(authUrl.toString())

    // The URL is single-use and safe to show if the browser did not open.
    console.error(`If the browser did not open, visit:\n${authUrl.toString()}`)

    const params = await listener.waitForCallback()
    const { session } = await client.callback(params)
    return session
  } finally {
    listener.close()
  }
}

/** Load the stored session, refreshing tokens only when needed. */
export async function restoreOAuthSession(
  did?: string,
  store: FileOAuthStore = defaultOAuthStore(),
): Promise<OAuthSession> {
  const subject = did ?? (await store.getCurrentDid())
  if (!subject) {
    throw new Error('No OAuth session is stored. Run `atstore login <handle>` first.')
  }

  const redirectUri = await store.getClientRedirectUri(subject)
  return createOAuthClient(store, redirectUri).restore(subject)
}

/** Revoke tokens and remove them from local storage. */
export async function signOutOAuth(
  store: FileOAuthStore = defaultOAuthStore(),
): Promise<{ did: string; revoked: boolean }> {
  const did = await store.getCurrentDid()
  if (!did) throw new Error('No OAuth session is stored.')

  const redirectUri = await store.getClientRedirectUri(did)
  let revoked = false
  try {
    const session = await createOAuthClient(store, redirectUri).restore(did, false)
    await session.signOut()
    revoked = true
  } catch {
    // Offline or revoked sessions should still be removed from this machine.
  } finally {
    await store.delSession(did)
    await store.setCurrentDid(undefined)
  }
  return { did, revoked }
}

export interface TokenInfo {
  did: string
  issuer: string
  audience: string
  scope: string
  expiresAt?: Date
}

export async function describeOAuthSession(
  did?: string,
  store: FileOAuthStore = defaultOAuthStore(),
): Promise<TokenInfo> {
  const session = await restoreOAuthSession(did, store)
  const info = await session.getTokenInfo()
  return {
    did: session.did,
    issuer: info.iss,
    audience: info.aud,
    scope: info.scope,
    expiresAt: info.expiresAt,
  }
}

interface CallbackListener {
  redirectUri: string
  waitForCallback: () => Promise<URLSearchParams>
  close: () => void
}

async function listenForCallback(): Promise<CallbackListener> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let closed = false
  let finish: ((params: URLSearchParams) => void) | undefined
  let fail: ((error: Error) => void) | undefined

  const callback = new Promise<URLSearchParams>((resolve, reject) => {
    finish = resolve
    fail = reject
  })

  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    if (url.pathname !== CALLBACK_PATH) {
      response.writeHead(404).end('Not found')
      return
    }

    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end('<h1>Authorised</h1><p>You can close this tab and return to the terminal.</p>')
    if (timer) clearTimeout(timer)
    finish?.(url.searchParams)
  })

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening)
      reject(error)
    }
    const onListening = () => {
      server.off('error', onError)
      resolve()
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(0, '127.0.0.1')
  })

  function close(): void {
    if (closed) return
    closed = true
    if (timer) clearTimeout(timer)
    server.close()
  }

  server.on('error', (error) => fail?.(error))
  const { port } = server.address() as AddressInfo
  timer = setTimeout(() => {
    close()
    fail?.(new Error('OAuth login timed out. Run `atstore login` again.'))
  }, LOGIN_TIMEOUT_MS)
  timer.unref?.()

  return {
    redirectUri: `http://127.0.0.1:${port}${CALLBACK_PATH}`,
    waitForCallback: () => callback,
    close,
  }
}
