export const DEFAULT_ATSTORE_URL = 'https://atstore.fyi'

export interface ATStoreClientOptions {
  baseUrl?: string
  fetch?: typeof fetch
  timeoutMs?: number
}

export function resolveBaseUrl(baseUrl?: string): string {
  return (baseUrl ?? process.env.ATSTORE_URL ?? DEFAULT_ATSTORE_URL).replace(/\/+$/, '')
}
