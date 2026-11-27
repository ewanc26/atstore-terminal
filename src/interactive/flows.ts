import { autocomplete, confirm, isCancel, log, note, select, spinner, text } from '@clack/prompts'
import { ATStoreClient } from '../client/index.js'
import { countTags } from '../directory/index.js'
import { detailLines, rating, relativeDate } from '../format/index.js'
import { dim } from '../style.js'
import {
  SORTS,
  type ListingDetail,
  type ListingSummary,
  type Review,
  type Sort,
} from '../types/index.js'
import { runTui } from '../tui/index.js'

export async function searchFlow(client: ATStoreClient): Promise<void> {
  const query = await text({
    message: 'Search apps, clients, feeds, games…',
    placeholder: 'Bluesky client',
    validate: (value) => (value?.trim() ? undefined : 'Type something to search for.'),
  })
  if (isCancel(query)) return

  const sort = await select<Sort>({
    message: 'Sort by',
    options: SORTS.map((value) => ({ value, label: value })),
    initialValue: 'popular',
  })
  if (isCancel(sort)) return

  const loading = spinner()
  loading.start(`Searching for ${query}`)
  let listings: ListingSummary[]
  try {
    listings = (await client.search({ q: query, sort, limit: 50 })).listings
  } catch (error) {
    loading.error('Search failed')
    log.error(errorText(error))
    return
  }
  loading.stop(`${listings.length} listing${listings.length === 1 ? '' : 's'}`)

  if (!listings.length) {
    log.warn('Nothing found. Try a broader search.')
    return
  }
  await pickListing(client, listings, query)
}

export async function tagFlow(client: ATStoreClient): Promise<void> {
  const loading = spinner()
  loading.start('Reading directory tags')

  try {
    const tags = countTags(await client.collect({}, 3)).slice(0, 40)
    loading.stop(`${tags.length} tags`)

    const selected = await autocomplete<string>({
      message: 'Choose a tag',
      options: tags.map(({ tag, count }) => ({ value: tag, label: tag, hint: String(count) })),
      placeholder: 'social, developer, audio…',
    })
    if (isCancel(selected)) return

    const result = await client.search({ tag: [selected], limit: 50, sort: 'popular' })
    if (!result.listings.length) {
      log.warn(`No listings tagged ${selected}.`)
      return
    }
    await pickListing(client, result.listings, `tag:${selected}`)
  } catch (error) {
    loading.error('Could not load tags')
    log.error(errorText(error))
  }
}

export async function pickListing(
  client: ATStoreClient,
  listings: ListingSummary[],
  query: string,
): Promise<void> {
  const choice = await autocomplete<ListingSummary>({
    message: 'Pick a listing',
    options: listings.map((listing) => ({
      value: listing,
      label: listing.name,
      hint: `${rating(listing.reviewCount, listing.rating)} · ${listing.appTags?.slice(0, 2).join(', ') ?? ''}`,
    })),
    placeholder: 'Type to filter…',
    maxItems: 10,
  })
  if (isCancel(choice)) return

  const loading = spinner()
  loading.start(`Loading ${choice.name}`)
  let detail: ListingDetail
  let reviews: Review[] = []
  try {
    detail = (await client.getListing({ uri: choice.uri })).listing
    reviews = (await client.listReviews({ uri: choice.uri, limit: 3 })).reviews
  } catch (error) {
    loading.error('Could not load the listing')
    log.error(errorText(error))
    return
  }
  loading.stop(detail.name)

  const preview = detailLines(detail, reviews).slice(0, 16).join('\n')
  note(preview, `${detail.name} ${dim(`· ${relativeDate(detail.updatedAt)}`)}`)

  const open = await confirm({
    message: 'Open it in the full-screen browser?',
    initialValue: true,
  })
  if (!isCancel(open) && open) await runTui(client, query, detail.uri)
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
