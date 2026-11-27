/** An error returned by an XRPC endpoint or by the network layer. */
export class ATStoreError extends Error {
  readonly status?: number
  readonly code?: string
  readonly details?: unknown

  constructor(
    message: string,
    options: { status?: number; code?: string; details?: unknown } = {},
  ) {
    super(message)
    this.name = 'ATStoreError'
    this.status = options.status
    this.code = options.code
    this.details = options.details
  }
}
