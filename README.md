# tel.seanbehan.ca

Marketing site for **Tel**, the token-efficient language for AI-authored code —
written in Tel, compiled by
[`tel-token-efficient-lang`](https://github.com/codebam/tel) (published as
`@codebam/tel`), and deployed to a Cloudflare Worker.

Run the language with no install step:

```bash
npx @codebam/tel --version
npx @codebam/tel run main.tel
```

## What runs where

| Piece | Source | Output | Runtime |
|---|---|---|---|
| Page + JSON APIs | `src/worker.tel`, `src/site.tel`, `src/content.tel` | `dist/worker-entry.mjs` | Cloudflare Workers / Node >= 20 |
| Browser island | `src/app.tel`, `src/highlight.tel`, `src/estimate.tel` | `public/assets/app.mjs` | any modern browser |
| Static shell | `public/assets/site.css`, `tel.svg`, `_headers` | `public/` | Workers static assets |

The Worker is compiled with `--target web` (the browser runtime is the only
Tel target without `node:*` imports), then a generated ESM entry
re-exports the Tel `fetch` function as Cloudflare's `export default { fetch }`.
No Node compatibility flags are required.

## Build

```bash
# The compiler is resolved from $TEL_BIN (a bin/tel.mjs path), $TEL_REPO,
# the sibling ../tel-token-efficient-lang checkout, or the published package
# via `npx --yes @codebam/tel` as the final fallback.
npm run check        # tel check over every project .tel file
npm run build        # compile Worker + browser island into dist/ and public/assets/
npm test             # build, then run the Worker route tests
npm run dev          # build and serve http://127.0.0.1:8787 with the Worker code path
```

`scripts/dev.mjs` mirrors Cloudflare static-asset routing locally: `/assets/*`
comes from `public/`, everything else goes through `dist/worker-entry.mjs`.

## Deploy

```bash
npx wrangler login
npm run deploy       # or: npx wrangler deploy
```

`wrangler.jsonc` binds the Worker to `tel-seanbehan-ca` and serves `./public`
as static assets. To attach the `tel.seanbehan.ca` custom domain, add it to the
`routes` array:

```jsonc
"routes": [{ "pattern": "tel.seanbehan.ca", "custom_domain": true }]
```

## Verification

At the time of writing, the site is **842 lines / 9,336 cl100k tokens** of Tel
source (`npx @codebam/tel tokens src/*.tel main.tel`)
plus the stylesheet and two Node scripts.

- `npm run check` passes `tel check` for every source file (including `main.tel`).
- The published package was exercised directly: `npx @codebam/tel --version`,
  `init`, `run`, `check` and `build` all work against `@codebam/tel@0.2.0`.
- The npx fallback was exercised from a copy without the sibling checkout:
  `build: no local Tel checkout found; using npx --yes @codebam/tel`, followed
  by a passing check and a full Worker + browser build.
- `npm test` (9 tests) exercises `/`, HEAD `/`, `/api/health`, `/api/benchmarks`,
  `/api/estimate` (GET + POST), `/robots.txt`, `/sitemap.xml`, the 404 page and
  missing assets.
- `npm run dry-run` bundles the exact deploy artifact locally:
  `Total Upload: 192.96 KiB / gzip: 42.54 KiB`, with `env.ASSETS` and
  `env.SITE_NAME` bindings.
- `npm run dev` was exercised inside Cloudflare's `workerd` runtime via
  `wrangler dev`; `/api/health` reports `"runtime":"cloudflare-workers"`.
- The browser island was driven in headless Chromium: tabs switch samples and
  the estimator returns `9 tokens · 24 chars · 2 lines` for a two-line Tel
  function with no console errors.

Token and benchmark claims are the measured v0.2 numbers from the Tel
repository's `docs/TOKENS.md` (exact `cl100k_base` BPE counts). The interactive
estimator is a deliberately rough, code-aware proxy; `tel tokens FILE` is the
exact counter.
