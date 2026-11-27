import { close, fixed, grow, open, text, type Op } from '@bomb.sh/tty'
import { truncate } from '../format/index.js'
import { stateLines, title, visibleCount, type State } from './state.js'
import { ACCENT, BACKGROUND, FG, HIGHLIGHT, MUTED, PANEL, STAR } from './theme.js'

/** Render the current state into bomb.sh tty ops; no I/O happens here. */
export function buildFrame(state: State, width: number, height: number): Op[] {
  const ops: Op[] = []
  const innerWidth = Math.max(20, width - 4)

  ops.push(
    open('root', {
      layout: { width: grow(), height: grow(), direction: 'ttb', padding: { left: 1, right: 1 } },
      bg: BACKGROUND,
    }),
  )

  ops.push(
    open('header', {
      layout: {
        width: grow(),
        height: fixed(2),
        direction: 'ltr',
        padding: { left: 1, right: 1, top: 1 },
        gap: 2,
      },
      bg: PANEL,
    }),
  )
  ops.push(text('at·store', { color: ACCENT }))
  ops.push(text(' / ', { color: MUTED }))
  ops.push(text(truncate(title(state), innerWidth - 14), { color: FG }))
  ops.push(close())

  ops.push(
    open('content', {
      layout: {
        width: grow(),
        height: grow(),
        direction: 'ttb',
        padding: { top: 1, left: 1, right: 1 },
      },
      clip: { vertical: true },
    }),
  )

  const lines = stateLines(state)
  for (let index = 0; index < visibleCount(height); index += 1) {
    const line = lines[state.scroll + index]
    if (line === undefined) break
    const selected = state.view === 'list' && state.scroll + index === state.selected
    ops.push(
      open(`line-${index}`, {
        layout: { width: grow(), height: fixed(1), padding: { left: 1, right: 1 } },
        bg: selected ? HIGHLIGHT : undefined,
      }),
    )
    ops.push(
      text(truncate(line, innerWidth - 2), {
        color: selected ? ACCENT : line.includes('★') ? STAR : FG,
      }),
    )
    ops.push(close())
  }
  ops.push(close())

  ops.push(
    open('footer', {
      layout: {
        width: grow(),
        height: fixed(2),
        direction: 'ltr',
        padding: { left: 1, right: 1, top: 1 },
      },
      bg: PANEL,
    }),
  )
  const footer = state.typing ? `> ${state.buffer}▌` : `${state.loading ? '… ' : ''}${state.status}`
  ops.push(text(truncate(footer, innerWidth - 2), { color: state.typing ? ACCENT : MUTED }))
  ops.push(close())

  ops.push(close())
  return ops
}
