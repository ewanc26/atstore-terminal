export class AtprotoError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'AtprotoError'
    this.status = status
    this.code = code
  }

  get isRecordNotFound(): boolean {
    return this.status === 404 || this.code === 'RecordNotFound'
  }
}
