import process from 'node:process'
import { ATStoreClient } from '../../client/index.js'
import { printJson, printSearch } from '../output.js'
import { toSearchParams, type SearchModel } from '../schemas.js'

export async function searchCommand(
  client: ATStoreClient,
  model: SearchModel,
  json: boolean,
): Promise<void> {
  const result = await client.search(toSearchParams(model))
  if (json) printJson(result)
  else printSearch(result, process.stdout.columns || 100)
}
