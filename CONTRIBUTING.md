# Contributing

Thanks for helping improve the ATStore terminal client.

## Setup

```sh
npm install
npm run build
npm test
```

Node.js 22 or newer is required.

## Changes

1. Create a branch from `main`, e.g. `fix(tui)` or `feat(search)`.
2. Keep changes focused. Add or update a test in `src/test/` when behaviour changes.
3. Run `npm run format`, `npm run check`, and `npm test`.
4. Open a pull request with a conventional subject such as `feat(search): add lexicon filtering`.

Pull requests are squashed, so the final commit message should be the PR title with `(#N)` appended.

## Reporting bugs

Include the command you ran, the ATStore URL if overridden (`ATSTORE_URL`), your Node version, and the full error. Do not include app passwords or access tokens.
