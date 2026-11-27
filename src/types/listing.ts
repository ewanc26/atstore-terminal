export interface ListingLink {
  uri: string
  type?: string
  label?: string
}

export interface ListingSummary {
  uri: string
  name: string
  tagline?: string
  description?: string
  iconUrl?: string
  heroImageUrl?: string
  category?: string
  categorySlug?: string
  categorySlugs?: string[]
  accent?: string
  rating?: string
  reviewCount?: number
  priceLabel?: string
  productAccountHandle?: string
  appTags?: string[]
  listingType?: 'app' | 'game' | string
  externalUrl?: string
  updatedAt?: string
  createdAt?: string
}

export interface ListingDetail extends ListingSummary {
  externalUrl: string
  sourceUrl?: string
  repoDid?: string
  productAccountDid?: string
  isStoreManaged?: boolean
  sourceTagline?: string
  sourceFullDescription?: string
  screenshots?: string[]
  links?: ListingLink[]
}

/** Current XRPC shape: card under `listing`, detail fields at the root.
 * Older deployments put the extra fields inside `listing`; the client merges both. */
export interface GetListingResponse {
  listing: ListingSummary
  isStoreManaged?: boolean
  repoDid?: string | null
  productAccountDid?: string | null
  sourceTagline?: string | null
  sourceFullDescription?: string | null
  screenshots?: string[]
  externalUrl?: string | null
  sourceUrl?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  links?: ListingLink[]
}

export interface GetListingParams {
  uri?: string
  externalUrl?: string
}
