import process from 'node:process'
import {
  alternateBuffer,
  createInput,
  createTerm,
  cursor,
  settings,
  type InputEvent,
} from '@bomb.sh/tty'
import { ATStoreClient } from '../client/index.js'
import { detailLines, reviewLines } from '../format/index.js'
import type { SearchParams } from '../types/index.js'
import { openInBrowser } from './browser.js'
import { HELP, parseCommand } from './commands.js'
import { buildFrame } from './frame.js'
import { createState, visibleCount } from './state.js'

/** Full-screen browser built on @bomb.sh/tty's renderer and input parser. */
export async function runTui(
  client: ATStoreClient,
  initialQuery = '',
  focusUri?: string,
): Promise<void> {
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    throw new Error(
      'The full-screen browser needs an interactive terminal. Use `atstore search` instead.',
    )
  }

  const input = await createInput({ escLatency: 30 })
  let width = Math.max(50, process.stdout.columns || 100)
  let height = Math.max(12, process.stdout.rows || 24)
  const term = await createTerm({ width, height })
  const state = createState(initialQuery)
  const mode = settings(alternateBuffer({ clear: true }), cursor(false))

  let generation = 0
  let escTimer: ReturnType<typeof setTimeout> | undefined
  let closed = false
  let resolveDone: (() => void) | undefined
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve
  })

  const write = (bytes: Uint8Array): void => {
    process.stdout.write(Buffer.from(bytes))
  }
  const render = (): void => {
    const result = term.render(buildFrame(state, width, height))
    write(result.output)
    if (result.errors.length) state.status = `render: ${result.errors[0]?.message ?? 'error'}`
  }
  const redraw = (): void => {
    if (!closed) render()
  }

  const load = async (params: SearchParams, status: string): Promise<void> => {
    const mine = ++generation
    state.loading = true
    state.status = status
    redraw()

    try {
      const result = await client.search({ limit: 100, sort: 'popular', ...params })
      if (mine !== generation) return
      state.listings = result.listings
      state.selected = 0
      state.scroll = 0
      state.view = 'list'
      state.query = params.q ?? ''
      state.status = `${result.listings.length} listing${result.listings.length === 1 ? '' : 's'}${result.cursor ? ' · more via CLI' : ''}`
    } catch (error) {
      if (mine === generation) state.status = errorText(error)
    } finally {
      if (mine === generation) state.loading = false
      redraw()
    }
  }

  const focus = async (uri: string): Promise<void> => {
    const mine = ++generation
    state.loading = true
    state.status = 'Loading listing…'
    redraw()

    try {
      const listing = (await client.getListing({ uri })).listing
      const reviews = (await client.listReviews({ uri, limit: 20 })).reviews
      if (mine !== generation) return
      state.detail = listing
      state.detailLines = detailLines(listing, reviews)
      state.reviewLines = reviews.length ? reviewLines(reviews) : ['No reviews yet.']
      state.view = 'detail'
      state.scroll = 0
      state.status = listing.name
    } catch (error) {
      if (mine === generation) state.status = errorText(error)
    } finally {
      if (mine === generation) state.loading = false
      redraw()
    }
  }

  const move = (delta: number): void => {
    const visible = visibleCount(height)
    if (state.view === 'list') {
      if (!state.listings.length) return
      state.selected = Math.min(state.listings.length - 1, Math.max(0, state.selected + delta))
      if (state.selected < state.scroll) state.scroll = state.selected
      if (state.selected >= state.scroll + visible) state.scroll = state.selected - visible + 1
    } else {
      const lines = state.view === 'reviews' ? state.reviewLines : state.detailLines
      state.scroll = Math.min(
        Math.max(0, lines.length - visible),
        Math.max(0, state.scroll + delta),
      )
    }
    redraw()
  }

  const goBack = (): void => {
    if (state.view === 'list') return
    state.view = 'list'
    state.scroll = 0
    state.status = state.query || 'Directory'
    redraw()
  }

  const submitBuffer = (): void => {
    const raw = state.buffer.trim()
    state.typing = false
    state.buffer = ''
    if (!raw) {
      redraw()
      return
    }

    const command = parseCommand(raw)
    if (command.kind === 'help') {
      state.status = HELP[0] ?? 'Keyboard shortcuts'
      redraw()
      return
    }
    if (command.kind === 'tag') {
      void load({ tag: command.tag ? [command.tag] : [] }, `Tagged: ${command.tag || 'all'}`)
      return
    }

    void load(command.params, `Searching: ${command.params.q || 'all listings'}`)
  }

  const openDetail = (): void => {
    const listing = state.listings[state.selected]
    if (listing) void focus(listing.uri)
  }

  const toggleReviews = (): void => {
    if (state.view === 'reviews') {
      goBack()
      return
    }
    if (state.view !== 'detail') {
      openDetail()
      return
    }
    state.view = 'reviews'
    state.scroll = 0
    state.status = 'Reviews'
    redraw()
  }

  const openSite = (): void => {
    const listing = state.view === 'list' ? state.listings[state.selected] : state.detail
    if (!listing?.externalUrl) {
      state.status = 'This listing has no storefront URL.'
      redraw()
      return
    }
    state.status = `Opening ${listing.externalUrl}`
    redraw()
    openInBrowser(listing.externalUrl)
  }

  const closeTui = (): void => {
    if (closed) return
    closed = true
    generation += 1
    if (escTimer) clearTimeout(escTimer)
    process.stdin.off('data', onData)
    process.stdout.off('resize', onResize)
    process.off('SIGINT', closeTui)
    if (process.stdin.isRaw) process.stdin.setRawMode(false)
    process.stdin.pause()
    write(mode.revert)
    process.stdout.write('\u001b[0m')
    resolveDone?.()
  }

  const handle = (events: readonly InputEvent[]): void => {
    const updates = term.update(events)
    if (updates.length) write(updates)

    for (const event of events) {
      if (event.type === 'resize') {
        width = Math.max(50, event.width)
        height = Math.max(12, event.height)
        continue
      }
      if (event.type !== 'keydown' && event.type !== 'keyrepeat') continue
      if (event.ctrl && event.code === 'c') {
        closeTui()
        return
      }

      if (state.typing) {
        if (event.code === 'Escape') {
          state.typing = false
          state.buffer = ''
        } else if (event.code === 'Enter') {
          submitBuffer()
        } else if (event.code === 'Backspace') {
          state.buffer = state.buffer.slice(0, -1)
        } else {
          const char = event.text ?? (event.key.length === 1 ? event.key : '')
          if (char) state.buffer += char
        }
        redraw()
        continue
      }

      switch (event.code) {
        case 'ArrowDown':
        case 'j':
          move(1)
          break
        case 'ArrowUp':
        case 'k':
          move(-1)
          break
        case 'PageDown':
          move(10)
          break
        case 'PageUp':
          move(-10)
          break
        case 'Enter':
          openDetail()
          break
        case 'r':
          toggleReviews()
          break
        case 'o':
          openSite()
          break
        case '/':
        case 's':
          state.typing = true
          state.buffer = ''
          redraw()
          break
        case 'Escape':
        case 'Backspace':
          goBack()
          break
        case 'q':
          closeTui()
          break
        default:
          break
      }
    }
    if (!closed) redraw()
  }

  const onData = (chunk: Buffer): void => {
    if (closed) return
    if (escTimer) clearTimeout(escTimer)
    const scanned = input.scan(new Uint8Array(chunk))
    handle(scanned.events)
    if (scanned.pending) {
      escTimer = setTimeout(() => {
        handle(input.scan().events)
      }, scanned.pending.delay)
    }
  }

  const onResize = (): void => {
    width = Math.max(50, process.stdout.columns || width)
    height = Math.max(12, process.stdout.rows || height)
    handle([{ type: 'resize', width, height }])
  }

  write(mode.apply)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('data', onData)
  process.stdout.on('resize', onResize)
  process.once('SIGINT', closeTui)

  render()
  await load(
    { q: initialQuery || undefined },
    initialQuery ? `Searching: ${initialQuery}` : 'Loading the directory…',
  )
  if (focusUri && !closed) await focus(focusUri)
  await done
}

function errorText(error: unknown): string {
  return `Error: ${error instanceof Error ? error.message : String(error)}`
}
