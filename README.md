# Listing Auditor

A single-page, single-tenant demo that audits the EnergyBud 1 Gallon Water
Bottle Amazon listing (ASIN B085LL6253) and produces:

- A deterministic score across 3 dimensions — AI Assistant Readability
  (Alexa for Shopping), Search-Intent Alignment, and Keyword Naturalness —
  with explainable submetrics.
- Up to 10 prioritized, claim-safe fix recommendations with before → after
  rewrites and source citations.
- A refactored, compliant rewrite of the title and 5 bullets.
- A semantic-gap analysis vs. 3 seeded competitor listings.
- A Methodology tab citing all 11 knowledge-base sources.

The entire analysis engine (`src/engine/analysis.ts`) is pure, deterministic
TypeScript — no LLM calls. It runs client-side against whatever listing copy
is in the form; scoring itself never touches a network.

## Stack

Vite + React 18 + TypeScript + Tailwind CSS v3 + hand-rolled shadcn-style UI
primitives (Radix + `class-variance-authority`) + Vitest, deployed to Vercel
for the one live backend endpoint described below.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm test         # run the engine test suite
npm run build    # type-check + production build
```

Click **Load EnergyBud demo** in the app to seed the form with the sample
listing and 3 competitor listings, then **Run audit**.

## Live ASIN lookup (Keepa)

Instead of pasting a title and bullets by hand, you can enter an ASIN and
click **Fetch from Amazon** to pull the real listing copy via the
[Keepa](https://keepa.com/#!api) product API. This is the app's only
network-dependent feature and the only reason it has a backend at all:

- `src/server/keepa.ts` — pure fetch + response-mapping logic (ASIN
  validation, title/brand/bullet extraction, error handling).
- `api/lookup-asin.ts` — a Vercel serverless function that calls Keepa with
  a server-side `KEEPA_API_KEY`, so the key never reaches the browser.
- `vite.keepa-dev-plugin.ts` — mirrors the same endpoint as Vite dev
  middleware, so `npm run dev` exercises the real flow locally.

**Setup:**

1. Get a Keepa API key (requires a Keepa subscription with API access).
2. Copy `.env.example` to `.env.local` and set `KEEPA_API_KEY=...` for local
   development.
3. When deploying to Vercel, add `KEEPA_API_KEY` as an environment variable
   in the project's settings (Settings → Environment Variables) — it must be
   set there separately; `.env.local` is git-ignored and never deployed.

If the key is missing or Keepa has no cached data for an ASIN, the lookup
fails gracefully with an inline error and you can still fill in the listing
manually.
