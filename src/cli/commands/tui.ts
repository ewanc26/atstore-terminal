import { ATStoreClient } from '../../client/index.js'
import { runTui } from '../../tui/index.js'
import { printJson } from '../output.js'

export async function tuiCommand(
  client: ATStoreClient,
  query: string | undefined,
  json: boolean,
): Promise<void> {
  if (json) {
    printJson(await client.search({ q: query, limit: 100 }))
    return
  }
  await runTui(client, query ?? '')
}
