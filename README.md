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
TypeScript — no LLM calls, no backend. It runs client-side against whatever
listing copy is in the form.

## Stack

Vite + React 18 + TypeScript + Tailwind CSS v3 + hand-rolled shadcn-style UI
primitives (Radix + `class-variance-authority`) + Vitest.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm test         # run the engine test suite
npm run build    # type-check + production build
```

Click **Load EnergyBud demo** in the app to seed the form with the sample
listing and 3 competitor listings, then **Run audit**.
