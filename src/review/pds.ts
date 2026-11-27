import { AtprotoError } from './error.js'

const TIMEOUT_MS = 15_000

export function pdsUrl(pds: string, nsid: string): string {
  return `${pds.replace(/\/+$/, '')}/xrpc/${nsid}`
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
