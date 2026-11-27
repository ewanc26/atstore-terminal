import { ATStoreError } from './error.js'

export function xrpcUrl(baseUrl: string, nsid: string, params: Record<string, unknown>): URL {
  const url = new URL(`/xrpc/${nsid}`, baseUrl)

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, String(item))
    } else {
      url.searchParams.set(key, String(value))
    }
  }

  return url
}

export async function requestJson<T>(
  fetchFn: typeof fetch,
  url: URL,
  timeoutMs: number,
  baseUrl: string,
): Promise<T> {
  let response: Response
  try {
    response = await fetchFn(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new ATStoreError(`ATStore request timed out after ${timeoutMs}ms`, {
        code: 'timeout',
        details: error,
      })
    }
    throw new ATStoreError(`Could not reach ATStore at ${baseUrl}`, {
      code: 'network',
      details: error,
    })
  }

  const body = await readBody(response)

  if (!response.ok) {
    const record = isRecord(body) ? body : {}
    const code = typeof record.error === 'string' ? record.error : `http_${response.status}`
    const message =
      typeof record.message === 'string' ? record.message : `ATStore returned ${response.status}`
    throw new ATStoreError(message, { status: response.status, code, details: body })
  }

  if (!isRecord(body)) {
    throw new ATStoreError('ATStore returned an unexpected response.', { details: body })
  }

  return body as T
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
