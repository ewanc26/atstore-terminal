import { intro, isCancel, log, outro, select } from '@clack/prompts'
import { ATStoreClient } from '../client/index.js'
import { bold, cyan, dim } from '../style.js'
import { runTui } from '../tui/index.js'
import { searchFlow, tagFlow } from './flows.js'

type Action = 'browse' | 'search' | 'tags' | 'quit'

/** Clack prompts for the friendly, one-command experience. */
export async function runInteractive(client: ATStoreClient): Promise<void> {
  intro(`${bold('at·store')} ${dim('· browse the Atmosphere')}`)

  try {
    while (true) {
      const action = await select<Action>({
        message: 'Where to?',
        options: [
          { value: 'browse', label: 'Browse directory', hint: 'full-screen TUI' },
          { value: 'search', label: 'Search listings', hint: 'prompt-driven' },
          { value: 'tags', label: 'Explore tags', hint: "see what's popular" },
          { value: 'quit', label: 'Quit' },
        ],
      })
      if (isCancel(action) || action === 'quit') break

      if (action === 'browse') {
        await runTui(client)
        break
      }
      if (action === 'search') await searchFlow(client)
      if (action === 'tags') await tagFlow(client)
    }
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error))
  } finally {
    outro('See you in the Atmosphere.')
  }
}

export function interactiveHelp(): string[] {
  return [
    `${cyan('↑/↓')} move   ${cyan('enter')} detail   ${cyan('r')} reviews`,
    `${cyan('/')} search   ${cyan('o')} open site   ${cyan('esc')} back   ${cyan('q')} quit`,
  ]
}
