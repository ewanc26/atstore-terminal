import type {
  GetListingParams,
  GetListingResponse,
  ListReviewsParams,
  ListingDetail,
  ReviewResult,
  SearchParams,
  SearchResult,
  ServerDescription,
} from '../types/index.js'
import { ATStoreError } from './error.js'
import { mergeListingDetail } from './normalize.js'
import { resolveBaseUrl, type ATStoreClientOptions } from './options.js'
import { requestJson, xrpcUrl } from './request.js'

/**
 * Small, dependency-free client for the public ATStore XRPC API.
 *
 * The four registered methods are documented at
 * https://atstore.fyi/developers/atproto and discoverable through
 * `fyi.atstore.server.describe`.
 */
export class ATStoreClient {
  readonly baseUrl: string

  readonly #fetch: typeof fetch
  readonly #timeoutMs: number

  constructor(options: ATStoreClientOptions = {}) {
    this.baseUrl = resolveBaseUrl(options.baseUrl)
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.#timeoutMs = options.timeoutMs ?? 15_000
  }

  describe(): Promise<ServerDescription> {
    return this.#get<ServerDescription>('fyi.atstore.server.describe')
  }

  search(params: SearchParams = {}): Promise<SearchResult> {
    return this.#get<SearchResult>('fyi.atstore.directory.searchListings', {
      q: params.q,
      sort: params.sort,
      tag: params.tag,
      category: params.category,
      data: params.data,
      minRating: params.minRating,
      has: params.has,
      limit: params.limit,
      cursor: params.cursor,
    })
  }

  async getListing(
    params: GetListingParams,
  ): Promise<GetListingResponse & { listing: ListingDetail }> {
    if (Boolean(params.uri) === Boolean(params.externalUrl)) {
      throw new ATStoreError('Pass exactly one of `uri` or `externalUrl`.')
    }

    const response = await this.#get<GetListingResponse>('fyi.atstore.directory.getListing', {
      ...params,
    })
    return { ...response, listing: mergeListingDetail(response) }
  }

  listReviews(params: ListReviewsParams): Promise<ReviewResult> {
    return this.#get<ReviewResult>('fyi.atstore.reviews.listForListing', { ...params })
  }

  /** Collect listings across pages. Stops at `maxPages`, an empty page, or a missing cursor. */
  async collect(params: SearchParams = {}, maxPages = 5): Promise<ListingDetail[]> {
    const collected: ListingDetail[] = []
    let cursor: string | undefined

    for (let page = 0; page < maxPages; page += 1) {
      const result = await this.search({ ...params, limit: params.limit ?? 100, cursor })
      collected.push(...(result.listings as ListingDetail[]))
      if (!result.cursor || result.listings.length === 0) break
      cursor = result.cursor
    }

    return collected
  }

  #get<T>(nsid: string, params: Record<string, unknown> = {}): Promise<T> {
    return requestJson<T>(
      this.#fetch,
      xrpcUrl(this.baseUrl, nsid, params),
      this.#timeoutMs,
      this.baseUrl,
    )
  }
}
