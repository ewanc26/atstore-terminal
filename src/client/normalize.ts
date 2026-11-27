import type { GetListingResponse, ListingDetail } from '../types/index.js'

/**
 * The current deployment puts detail fields at the response root while older
 * ones put them inside `listing`; merge both into one usable detail object.
 */
export function mergeListingDetail(response: GetListingResponse): ListingDetail {
  const legacy = response.listing as ListingDetail

  return {
    ...response.listing,
    externalUrl: response.externalUrl ?? legacy.externalUrl ?? '',
    sourceUrl: response.sourceUrl ?? legacy.sourceUrl,
    repoDid: response.repoDid ?? legacy.repoDid ?? undefined,
    productAccountDid: response.productAccountDid ?? legacy.productAccountDid ?? undefined,
    isStoreManaged: response.isStoreManaged ?? legacy.isStoreManaged,
    sourceTagline: response.sourceTagline ?? legacy.sourceTagline ?? undefined,
    description: response.sourceFullDescription ?? legacy.description,
    createdAt: response.createdAt ?? legacy.createdAt ?? undefined,
    updatedAt: response.updatedAt ?? legacy.updatedAt ?? undefined,
    screenshots: response.screenshots ?? legacy.screenshots ?? [],
    links: response.links ?? legacy.links ?? [],
  }
}
