import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
import type { NodeSavedSession, NodeSavedState } from '@atproto/oauth-client-node'
import { FileOAuthStore } from '../oauth/index.js'

const state = {
  iss: 'https://pds.example',
  dpopJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
  authMethod: { method: 'none' },
  verifier: 'verifier',
} as unknown as NodeSavedState

const session = {
  dpopJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
  authMethod: { method: 'none' },
  tokenSet: {
    iss: 'https://pds.example',
    sub: 'did:plc:test',
    aud: 'https://pds.example',
    scope: 'atproto transition:generic',
    access_token: 'token',
    token_type: 'DPoP',
  },
} as unknown as NodeSavedSession

async function tempFile(): Promise<{ file: string; cleanup: () => Promise<void> }> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'atstore-oauth-'))
  return {
    file: path.join(directory, 'oauth.json'),
    cleanup: () => fs.rm(directory, { recursive: true, force: true }),
  }
}

test('OAuth store persists state and sessions across instances', async () => {
  const { file, cleanup } = await tempFile()
  try {
    const store = new FileOAuthStore(file)
    await store.setState('state-key', state)
    await store.setSession('did:plc:test', session)

    const reloaded = new FileOAuthStore(file)
    assert.deepEqual(await reloaded.getState('state-key'), state)
    assert.deepEqual(await reloaded.getSession('did:plc:test'), session)
    assert.equal(await reloaded.getCurrentDid(), 'did:plc:test')
    assert.deepEqual(await reloaded.listSessions(), ['did:plc:test'])
  } finally {
    await cleanup()
  }
})

test('OAuth store keeps the loopback URI used by each session', async () => {
  const { file, cleanup } = await tempFile()
  try {
    const store = new FileOAuthStore(file)
    await store.setRedirectUri('http://127.0.0.1:1111/callback')
    await store.setSession('did:plc:first', session)
    await store.setRedirectUri('http://127.0.0.1:2222/callback')
    await store.setSession('did:plc:second', session)

    assert.equal(
      await store.getClientRedirectUri('did:plc:first'),
      'http://127.0.0.1:1111/callback',
    )
    assert.equal(
      await store.getClientRedirectUri('did:plc:second'),
      'http://127.0.0.1:2222/callback',
    )
    assert.equal(await store.getCurrentDid(), 'did:plc:second')
  } finally {
    await cleanup()
  }
})

test('OAuth store replaces the current DID when that session is removed', async () => {
  const { file, cleanup } = await tempFile()
  try {
    const store = new FileOAuthStore(file)
    await store.setRedirectUri('http://127.0.0.1:1111/callback')
    await store.setSession('did:plc:first', session)
    await store.setSession('did:plc:second', session)
    await store.delSession('did:plc:second')

    assert.equal(await store.getCurrentDid(), 'did:plc:first')
    assert.deepEqual(await store.listSessions(), ['did:plc:first'])
  } finally {
    await cleanup()
  }
})

test('OAuth store rejects an invalid session file', async () => {
  const { file, cleanup } = await tempFile()
  try {
    await fs.writeFile(file, '{"version":2}', 'utf8')
    await assert.rejects(() => new FileOAuthStore(file).getCurrentDid(), /invalid/)
  } finally {
    await cleanup()
  }
})

test(
  'OAuth session file is owner-readable only',
  { skip: process.platform === 'win32' },
  async () => {
    const { file, cleanup } = await tempFile()
    try {
      await new FileOAuthStore(file).setSession('did:plc:test', session)
      const { mode } = await fs.stat(file)
      assert.equal(mode & 0o777, 0o600)
    } finally {
      await cleanup()
    }
  },
)
