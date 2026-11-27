import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import type { NodeSavedSession, NodeSavedState } from '@atproto/oauth-client-node'

export const DEFAULT_REDIRECT_URI = 'http://127.0.0.1/callback'

interface OAuthFile {
  version: 1
  redirectUri?: string
  current?: string
  states: Record<string, NodeSavedState>
  sessions: Record<string, NodeSavedSession>
  /** Loopback client metadata is bound to the port used at login time. */
  clients: Record<string, string>
}

function emptyFile(): OAuthFile {
  return { version: 1, states: {}, sessions: {}, clients: {} }
}

/** Default config location: outside the repo, never committed. */
export function oauthConfigPath(): string {
  const configured = process.env.ATSTORE_CONFIG_DIR
  if (configured) return path.join(configured, 'oauth.json')

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'atstore', 'oauth.json')
  }
  if (process.platform === 'win32') {
    const base = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(base, 'atstore', 'oauth.json')
  }
  const base = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config')
  return path.join(base, 'atstore', 'oauth.json')
}

/**
 * File-backed OAuth state and sessions. Contains private DPoP keys and access
 * tokens, so the file is written atomically with 0600 permissions on POSIX.
 */
export class FileOAuthStore {
  readonly file: string
  #data?: Promise<OAuthFile>

  constructor(file = oauthConfigPath()) {
    this.file = file
  }

  #load(): Promise<OAuthFile> {
    this.#data ??= this.#read()
    return this.#data
  }

  async #read(): Promise<OAuthFile> {
    let raw: string
    try {
      raw = await fs.readFile(this.file, 'utf8')
    } catch (error) {
      if (isNotFound(error)) return emptyFile()
      throw error
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isOAuthFile(parsed)) {
      throw new Error(
        `OAuth session file ${this.file} is invalid. Run \`atstore logout\` to reset it.`,
      )
    }
    return { ...parsed, clients: parsed.clients ?? {} }
  }

  async #mutate(mutator: (data: OAuthFile) => void): Promise<void> {
    const data = await this.#load()
    mutator(data)
    await this.#write(data)
  }

  async #write(data: OAuthFile): Promise<void> {
    const directory = path.dirname(this.file)
    await fs.mkdir(directory, { recursive: true, mode: 0o700 })
    const temp = path.join(directory, `.oauth.${randomUUID()}.tmp`)
    await fs.writeFile(temp, JSON.stringify(data, null, 2), { flag: 'wx', mode: 0o600 })
    await fs.rename(temp, this.file)
    await fs.chmod(this.file, 0o600).catch(() => undefined)
  }

  async getState(key: string): Promise<NodeSavedState | undefined> {
    return (await this.#load()).states[key]
  }

  async setState(key: string, value: NodeSavedState): Promise<void> {
    await this.#mutate((data) => {
      data.states[key] = value
    })
  }

  async delState(key: string): Promise<void> {
    await this.#mutate((data) => {
      delete data.states[key]
    })
  }

  async getSession(key: string): Promise<NodeSavedSession | undefined> {
    return (await this.#load()).sessions[key]
  }

  async setSession(key: string, value: NodeSavedSession): Promise<void> {
    await this.#mutate((data) => {
      data.sessions[key] = value
      if (data.redirectUri) data.clients[key] = data.redirectUri
      data.current = key
    })
  }

  async delSession(key: string): Promise<void> {
    await this.#mutate((data) => {
      delete data.sessions[key]
      delete data.clients[key]
      if (data.current === key) data.current = firstKey(data.sessions)
    })
  }

  async listSessions(): Promise<string[]> {
    return Object.keys((await this.#load()).sessions)
  }

  async getCurrentDid(): Promise<string | undefined> {
    return (await this.#load()).current
  }

  async setCurrentDid(did: string | undefined): Promise<void> {
    await this.#mutate((data) => {
      data.current = did
    })
  }

  async getRedirectUri(): Promise<string | undefined> {
    const data = await this.#load()
    return data.redirectUri ?? DEFAULT_REDIRECT_URI
  }

  /** Per-session URI keeps older sessions usable after a new login. */
  async getClientRedirectUri(did: string): Promise<string | undefined> {
    const data = await this.#load()
    return data.clients[did] ?? data.redirectUri ?? DEFAULT_REDIRECT_URI
  }

  async setRedirectUri(uri: string): Promise<void> {
    await this.#mutate((data) => {
      data.redirectUri = uri
    })
  }

  async clear(): Promise<void> {
    await this.#mutate((data) => {
      Object.assign(data, emptyFile())
    })
  }
}

let singleton: FileOAuthStore | undefined

export function defaultOAuthStore(): FileOAuthStore {
  singleton ??= new FileOAuthStore()
  return singleton
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

function firstKey(record: Record<string, unknown>): string | undefined {
  return Object.keys(record)[0]
}

function isOAuthFile(value: unknown): value is OAuthFile {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Partial<OAuthFile>
  return (
    data.version === 1 &&
    isRecord(data.states) &&
    isRecord(data.sessions) &&
    (data.clients === undefined || isRecord(data.clients)) &&
    (data.current === undefined || typeof data.current === 'string') &&
    (data.redirectUri === undefined || typeof data.redirectUri === 'string')
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
