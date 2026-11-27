import * as z from 'zod'
import {
  EXTRAS,
  MIN_RATINGS,
  SORTS,
  type Extra,
  type MinRating,
  type SearchParams,
  type Sort,
} from '../types/index.js'

export const packageVersion = '0.1.0'

export const limitSchema = z.coerce.number().int().min(1).max(100).default(24)
export const tagList = z.array(z.string()).default([])
export const extraList = z.array(z.enum(EXTRAS)).default([])

export const sortSchema = z.enum(SORTS).default('popular')
export const minRatingSchema = z.enum(MIN_RATINGS)
export const pagesSchema = z.coerce.number().int().min(1).max(20).default(4)
export const ratingSchema = z.coerce.number().int().min(1).max(5).default(5)
export const reviewLimitSchema = z.coerce.number().int().min(1).max(100).default(5)

export interface SearchModel {
  query?: string
  tag: string[]
  category: string[]
  data: string[]
  sort: Sort
  minRating?: MinRating
  has: Extra[]
  limit: number
  cursor?: string
}

export function toSearchParams(model: SearchModel): SearchParams {
  return {
    q: model.query?.trim() || undefined,
    sort: model.sort,
    tag: model.tag,
    category: model.category,
    data: model.data,
    minRating: model.minRating,
    has: model.has,
    limit: model.limit,
    cursor: model.cursor,
  }
}
