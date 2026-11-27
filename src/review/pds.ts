import type { AuthorizedPdsSession } from './options.js'
import { AtprotoError } from './error.js'

const TIMEOUT_MS = 15_000

/** Minimal transport used by review publishing, implemented by both auth paths. */
export interface PdsTransport {
  post<T>(nsid: string, body: unknown): Promise<T>
  get<T>(nsid: string, params: Record<string, string>): Promise<T>
}

export function pdsUrl(pds: string, nsid: string): string {
  return `${pds.replace(/\/+$/, '')}/xrpc/${nsid}`
}

export function passwordTransport(pds: string, token: string): PdsTransport {
  return {
    post: <T>(nsid: string, body: unknown) => postJson<T>(pds, nsid, body, token),
    get: <T>(nsid: string, params: Record<string, string>) => getJson<T>(pds, nsid, params, token),
  }
}

/** OAuth access tokens require a fresh DPoP proof on every request. */
export function oauthTransport(session: AuthorizedPdsSession): PdsTransport {
  const send = async <T>(pathname: string, init: RequestInit): Promise<T> =>
    parseResponse<T>(await session.fetchHandler(pathname, init))

  return {
    post: <T>(nsid: string, body: unknown) =>
      send<T>(`/xrpc/${nsid}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    get: <T>(nsid: string, params: Record<string, string>) => {
      const query = new URLSearchParams(params)
      const suffix = query.size ? `?${query.toString()}` : ''
      return send<T>(`/xrpc/${nsid}${suffix}`, { headers: { accept: 'application/json' } })
    },
  }
}

export async function postJson<T>(
  pds: string,
  nsid: string,
  body: unknown,
  token?: string,
): Promise<T> {
  const response = await fetch(pdsUrl(pds, nsid), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  return parseResponse<T>(response)
}

export async function getJson<T>(
  pds: string,
  nsid: string,
  params: Record<string, string>,
  token?: string,
): Promise<T> {
  const url = new URL(pdsUrl(pds, nsid))
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  return parseResponse<T>(response)
}

async function parseResponse<T>(response: Response): Promise<T> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }

  if (!response.ok) {
    const record = isRecord(body) ? body : {}
    const code = typeof record.error === 'string' ? record.error : undefined
    const message =
      typeof record.message === 'string' ? record.message : `PDS returned ${response.status}`
    throw new AtprotoError(message, response.status, code)
  }

  return body as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
