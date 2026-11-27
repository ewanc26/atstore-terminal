import { ATStoreClient } from '../../client/index.js'
import { printDescribe, printJson } from '../output.js'

export async function describeCommand(client: ATStoreClient, json: boolean): Promise<void> {
  const described = await client.describe()
  if (json) printJson(described)
  else printDescribe(described, client.baseUrl)
}
