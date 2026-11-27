import type { PublishResult } from '../review/index.js'
import type { ReviewRecord } from '../review/index.js'
import { detailLines, listingTable, rating, reviewLines, tagTable } from '../format/index.js'
import { bold, cyan, dim, green } from '../style.js'
import type {
  ListingDetail,
  ListingSummary,
  Review,
  SearchResult,
  ServerDescription,
} from '../types/index.js'

interface TagCountLike {
  tag: string
  count: number
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2))
}

export function printDescribe(description: ServerDescription, baseUrl: string): void {
  console.log(bold(description.service))
  console.log(`base URL:     ${cyan(baseUrl)}`)
  console.log(`public reads: ${description.publicReads ? green('yes') : 'no'}`)
  console.log(
    `reviews:      ${description.reviewsWrittenOnAuthorRepo ? "on the author's PDS" : 'centralized'}`,
  )
  console.log(
    `limits:       ${description.defaultListingLimit} listings, max ${description.maxListingLimit}`,
  )
  console.log('methods:')
  for (const method of description.methods) console.log(`  ${dim(method)}`)
}

export function printSearch(result: SearchResult, width: number): void {
  console.log(listingTable(result.listings, width).join('\n'))
  console.log(
    dim(
      `\n${result.listings.length} listing${result.listings.length === 1 ? '' : 's'}${result.cursor ? ` · more: --cursor ${result.cursor}` : ''}`,
    ),
  )
  const first = result.listings[0]
  if (first) {
    const target = first.productAccountHandle ? `@${first.productAccountHandle}` : first.name
    console.log(dim(`Details: atstore show ${JSON.stringify(target)}`))
  }
}

export function printDetail(listing: ListingDetail, reviews: Review[], tip?: string): void {
  for (const line of detailLines(listing, reviews)) console.log(line)
  if (tip) console.log(dim(`\n${tip}`))
}

export function printReviews(listing: ListingSummary, reviews: Review[]): void {
  console.log(bold(`${listing.name} — reviews`))
  console.log(dim(`${rating(listing.reviewCount, listing.rating)} · ${listing.uri}`))
  console.log()
  if (!reviews.length) console.log(dim('No reviews yet.'))
  else console.log(reviewLines(reviews).join('\n'))
}

export function printTags(scanned: number, tags: TagCountLike[]): void {
  console.log(dim(`Scanned ${scanned} listings`))
  console.log(tagTable(tags.slice(0, 40)).join('\n'))
}

export function printReviewDraft(listing: ListingSummary, record: ReviewRecord): void {
  console.log(bold('Review record draft'))
  console.log(dim(`Subject: ${listing.name} — ${listing.uri}`))
  console.log()
  printJson(record)
  console.log()
  console.log(dim('Add --post and set ATPROTO_IDENTIFIER / ATPROTO_APP_PASSWORD to publish.'))
}

export function printPublished(result: PublishResult): void {
  console.log(green('Review published to your PDS.'))
  console.log(`  ${result.uri}`)
  if (result.profileCreated) console.log(dim('  Created your fyi.atstore.profile record.'))
  console.log(dim('  Directory ingestion may take a moment to surface it.'))
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function completionScript(): string {
  return `atstore commands:
  tui [query]        search [query] [flags]
  list [query]       show <target> [--reviews]
  reviews <target>   tags [--pages N]
  describe           review <target> [--rating N] [--text "..."] [--post]
  login <handle>     logout             whoami

Common flags:
  --json  --tag  --category  --data  --sort  --min-rating  --has
  --limit  --cursor  --reviews  --all  --post  --base-url

Zsh example: compdef '_arguments "*: :((tui search list show reviews tags describe review login logout whoami completions))"' atstore
`
}
