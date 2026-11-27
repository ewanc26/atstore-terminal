import { ATStoreClient } from '../../client/index.js'
import { countTags } from '../../directory/index.js'
import { printJson, printTags } from '../output.js'

export async function tagsCommand(
  client: ATStoreClient,
  pages: number,
  json: boolean,
): Promise<void> {
  const listings = await client.collect({}, pages)
  const tags = countTags(listings)

  if (json) printJson({ scanned: listings.length, tags })
  else printTags(listings.length, tags)
}
