import { parse as parseArgs } from '@bomb.sh/args'
import { MIN_RATINGS, SORTS, type MinRating, type SearchParams, type Sort } from '../types/index.js'

export const HELP = [
  '↑/↓ or j/k  move      enter  listing details      r  reviews',
  '/  search (flags work, e.g. /bluesky --tag social)      o  open site',
  'esc  back      q or ctrl-c  quit',
]

export type Command =
  { kind: 'help' } | { kind: 'tag'; tag?: string } | { kind: 'search'; params: SearchParams }

/** Parse the TUI command bar with the same bomb.sh args parser as the CLI flags. */
export function parseCommand(raw: string): Command {
  const command = raw.replace(/^[:/]/, '').trim()
  const [head, ...rest] = command.split(/\s+/)

  if (head === 'help') return { kind: 'help' }
  if (head === 'tag') return { kind: 'tag', tag: rest.join(' ') || undefined }

  if (head === 'search') {
    const parsed = parseArgs(rest, {
      string: ['sort', 'min-rating'],
      array: ['tag', 'category', 'data'],
      alias: { q: 'query' },
    })
    const q = asString(parsed.query) ?? parsed._.map(String).join(' ')

    return {
      kind: 'search',
      params: {
        q: q || undefined,
        tag: asStrings(parsed.tag),
        category: asStrings(parsed.category),
        data: asStrings(parsed.data),
        sort: isSort(parsed.sort) ? parsed.sort : undefined,
        minRating: isMinRating(parsed['min-rating']) ? parsed['min-rating'] : undefined,
      },
    }
  }

  return { kind: 'search', params: { q: command } }
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

function asStrings(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value]
  return values.map(asString).filter((item): item is string => Boolean(item))
}

function isSort(value: unknown): value is Sort {
  return typeof value === 'string' && (SORTS as readonly string[]).includes(value)
}

function isMinRating(value: unknown): value is MinRating {
  return typeof value === 'string' && (MIN_RATINGS as readonly string[]).includes(value)
}
