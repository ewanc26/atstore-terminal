import process from 'node:process'
import {
  argument,
  command,
  description,
  multiple,
  name,
  option,
  parse,
  printErrors,
  printHelp,
  printVersion,
  schema,
  toggle,
  version,
} from '@bomb.sh/router'
import * as z from 'zod'
import { ATStoreClient, ATStoreError } from '../client/index.js'
import { runInteractive } from '../interactive/index.js'
import { dim, yellow } from '../style.js'
import {
  completionsCommand,
  describeCommand,
  loginCommand,
  logoutCommand,
  reviewCommand,
  reviewsCommand,
  searchCommand,
  showCommand,
  tagsCommand,
  tuiCommand,
  whoamiCommand,
} from './commands/index.js'
import { errorMessage, printJson } from './output.js'
import {
  extraList,
  limitSchema,
  minRatingSchema,
  packageVersion,
  pagesSchema,
  ratingSchema,
  reviewLimitSchema,
  sortSchema,
  tagList,
  type SearchModel,
} from './schemas.js'

const app = command(
  name('atstore'),
  description('Browse, search, and review Atmosphere apps from your terminal.'),
  version(packageVersion),
  toggle(name('json'), description('Emit machine-readable JSON')),
  option(
    name('baseUrl'),
    description('Override the ATStore base URL'),
    schema(z.string().optional()),
  ),

  command(
    name('tui'),
    description('Open the full-screen browser'),
    argument(name('query'), schema(z.string().optional())),
  ),

  command(
    name('search'),
    description('Search public ATStore listings'),
    argument(name('query'), schema(z.string().optional())),
    option(name('tag'), description('Match any tag (repeatable)'), multiple(), schema(tagList)),
    option(
      name('category'),
      description('Match a category path (repeatable)'),
      multiple(),
      schema(tagList),
    ),
    option(
      name('data'),
      description('Match lexicon producer, e.g. app.bsky (repeatable)'),
      multiple(),
      schema(tagList),
    ),
    option(name('sort'), schema(sortSchema)),
    option(name('minRating'), schema(minRatingSchema.optional())),
    option(name('has'), multiple(), schema(extraList)),
    option(name('limit'), schema(limitSchema)),
    option(name('cursor'), schema(z.string().optional())),
  ),

  command(
    name('list'),
    description('Alias for search'),
    argument(name('query'), schema(z.string().optional())),
    option(name('tag'), multiple(), schema(tagList)),
    option(name('category'), multiple(), schema(tagList)),
    option(name('data'), multiple(), schema(tagList)),
    option(name('sort'), schema(sortSchema)),
    option(name('minRating'), schema(minRatingSchema.optional())),
    option(name('has'), multiple(), schema(extraList)),
    option(name('limit'), schema(limitSchema)),
    option(name('cursor'), schema(z.string().optional())),
  ),

  command(
    name('show'),
    description('Show a listing and its reviews'),
    argument(
      name('target'),
      schema(z.string()),
      description('Name, handle, at:// URI, or storefront URL'),
    ),
    toggle(name('reviews'), description('Include recent reviews')),
    option(name('reviewLimit'), schema(reviewLimitSchema)),
  ),

  command(
    name('reviews'),
    description('List reviews for a listing'),
    argument(name('target'), schema(z.string())),
    option(name('limit'), schema(limitSchema)),
    toggle(name('all'), description('Fetch every page')),
  ),

  command(
    name('tags'),
    description('Show the most common tags in the directory'),
    option(name('pages'), schema(pagesSchema)),
  ),

  command(name('describe'), description('Show ATStore server capabilities')),

  command(
    name('review'),
    description('Draft or publish an ATStore review'),
    argument(name('target'), schema(z.string())),
    option(name('rating'), schema(ratingSchema)),
    option(name('text'), schema(z.string().optional())),
    toggle(
      name('post'),
      description('Publish to your PDS (uses `atstore login`, or app-password env vars)'),
    ),
  ),

  command(
    name('login'),
    description('Sign in with OAuth, opening your PDS in the browser'),
    argument(name('handle'), schema(z.string()), description('Your ATProto handle or DID')),
  ),

  command(name('logout'), description('Remove the stored OAuth session')),

  command(name('whoami'), description('Show the stored OAuth session')),

  command(name('completions'), description('Print shell setup for tab completion')),
)

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const result = parse(app, { argv })

  if (!result.ok) {
    console.error(printErrors(result))
    return 1
  }
  if (result.method === 'help') {
    console.log(printHelp(result))
    return 0
  }
  if (result.method === 'version') {
    console.log(printVersion(result))
    return 0
  }

  const root = result.models['/']
  const json = root?.json ?? false
  const client = new ATStoreClient({ baseUrl: root?.baseUrl })

  try {
    switch (result.route) {
      case '/':
        if (json) printJson(await client.describe())
        else await runInteractive(client)
        return 0

      case '/tui':
        await tuiCommand(client, result.model.query, json)
        return 0

      case '/search':
      case '/list':
        await searchCommand(client, result.model as SearchModel, json)
        return 0

      case '/show':
        await showCommand(
          client,
          result.model.target,
          result.model.reviews,
          result.model.reviewLimit,
          json,
        )
        return 0

      case '/reviews':
        await reviewsCommand(
          client,
          result.model.target,
          result.model.limit,
          result.model.all,
          json,
        )
        return 0

      case '/tags':
        await tagsCommand(client, result.model.pages, json)
        return 0

      case '/describe':
        await describeCommand(client, json)
        return 0

      case '/review':
        await reviewCommand(
          client,
          result.model.target,
          result.model.rating,
          result.model.text,
          result.model.post,
          json,
        )
        return 0

      case '/login':
        await loginCommand(result.model.handle)
        return 0

      case '/logout':
        await logoutCommand()
        return 0

      case '/whoami':
        await whoamiCommand()
        return 0

      case '/completions':
        completionsCommand()
        return 0
    }
  } catch (error) {
    console.error(yellow(`atstore: ${errorMessage(error)}`))
    if (error instanceof ATStoreError && error.status) {
      console.error(dim(`  ${error.code} · HTTP ${error.status}`))
    }
    return 1
  }
}
