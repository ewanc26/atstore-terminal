# AGENTS.md

## What this is

A standalone TypeScript CLI/TUI client for the public ATStore XRPC API, built with bomb.sh and Clack.

- Default branch: `main`
- Package manager: npm
- Node.js: >= 22

## Read first

- `README.md` — user-facing commands and environment variables
- `src/client/` — the XRPC client, request building and response normalisation
- `src/cli/` — command routing, handlers and output
- `src/tui/` — full-screen renderer, input parsing and session handling

## Working rules

- Use feature branches (`feat/`, `fix/`, `docs/`, `chore/`) and open pull requests.
- Format with `npm run format`; keep Prettier's single quotes and no semicolons.
- Commit as `type(scope): lower-case imperative summary`, e.g. `fix(client): merge root-level listing detail fields`.
- Squash PRs so the final commit subject ends with `(#N)` when a PR number exists.
- Never put credentials in argv, source, tests, or commits. `ATPROTO_APP_PASSWORD` is read from the environment only.
- Prefer the public XRPC methods listed by `fyi.atstore.server.describe`; do not scrape the website.

## Validation

Run before committing:

```sh
npm run format:check
npm run check
npm test
npm run build
```

`npm test` builds first and runs the compiled Node tests in `dist/test`.
