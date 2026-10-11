# ClipForge

An AI video generator for short product and social videos, in the spirit of Higgsfield. Write a prompt or upload a
product photo, pick a model and a camera move, and get a 5–10 second clip in 9:16, 1:1 or 16:9.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (auth, Postgres, storage) ·
fal.ai (Kling, Hailuo/MiniMax, Wan) · Claude API (prompt enhancer) · Stripe (credit packs)

## Features

| Feature | Where |
| --- | --- |
| Text-to-video: prompt + model + aspect ratio (9:16 / 1:1 / 16:9) + duration (5s / 10s) | `/create` |
| Image-to-video: upload a product photo and animate it | `/create` → *Image to video* |
| Camera presets: dolly in, orbit, crane up, handheld, zoom out, product spin | `src/lib/config/camera-presets.ts` |
| Prompt enhancer: turns a short idea into a detailed cinematic prompt (Claude) | *Enhance* button, `/api/enhance-prompt` |
| Templates gallery (6 seeded presets) | `/templates`, `supabase/seed.sql` |
| Async generation queue with progress and notifications (toast + browser notification) | queue panel, sidebar |
| My Library: play, download MP4, delete, remix | `/library` |
| Credits: 20 free on signup, charged only on success, Stripe credit packs | `/credits` |

## Folder structure

```
clipforge/
├── supabase/
│   ├── migrations/0001_init.sql   # tables, RLS, storage buckets, credit functions
│   └── seed.sql                   # 6 templates
├── src/
│   ├── app/
│   │   ├── page.tsx               # landing page
│   │   ├── login/                 # magic link + Google sign-in
│   │   ├── auth/                  # OAuth/magic-link callback, sign-out
│   │   ├── (app)/                 # signed-in shell: create, templates, library, credits
│   │   └── api/
│   │       ├── generate/          # POST: validate, rate-limit, reserve credits, submit to fal.ai
│   │       ├── status/[id]/       # GET: sync a job with fal.ai, return progress
│   │       ├── enhance-prompt/    # POST: Claude prompt rewrite
│   │       ├── generations/       # GET list (paginated) · DELETE /[id]
│   │       ├── checkout/          # POST: Stripe Checkout session for a credit pack
│   │       ├── me/                # GET: credit balance
│   │       └── webhooks/
│   │           ├── fal/           # fal.ai job-finished callback
│   │           └── stripe/        # Stripe payment confirmation
│   ├── components/                # ui/ (shadcn), create/, library/, templates/, credits/, layout/
│   └── lib/
│       ├── config/
│       │   ├── models.ts          # ← video model registry (add models here)
│       │   ├── credits.ts         # ← prices, packs, rate limits (one file)
│       │   └── camera-presets.ts  # ← camera motion presets
│       ├── generations.ts         # job lifecycle: sync with fal, store video, settle credits
│       ├── generation-logic.ts    # pure helpers (validation, pricing, progress)
│       ├── fal.ts / claude.ts / stripe.ts
│       └── supabase/              # browser, server, admin clients + middleware
├── tests/                         # unit, integration (real Postgres), e2e smoke (Playwright)
└── scripts/test-db.sh
```

## Setup

You need Node.js 18.18+ (20+ recommended) and accounts on Supabase, fal.ai, Anthropic and Stripe.

### 1. Install

```bash
cd clipforge
npm install
cp .env.example .env.local
```

### 2. Create the Supabase project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor** and run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`.
   With the Supabase CLI you can instead run `supabase link --project-ref <ref>`, then `supabase db push`, then
   `psql "<connection string>" -f supabase/seed.sql`.
   The migration creates the tables, row-level security, the private `inputs` and `videos` storage buckets, and the
   credit functions.
3. **Authentication → URL Configuration**: set *Site URL* to `http://localhost:3000` and add
   `http://localhost:3000/auth/callback` to *Redirect URLs*. Add your production URLs later.
4. Email magic links work out of the box. For Google sign-in, enable **Authentication → Providers → Google**.
5. **Project Settings → API**: copy the Project URL, the `anon` key and the `service_role` key into `.env.local`.

### 3. Get a fal.ai key

Create a key at [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys), add billing, and set `FAL_KEY`.

### 4. Get an Anthropic key (prompt enhancer)

Create a key at [console.anthropic.com](https://console.anthropic.com/settings/keys) and set `ANTHROPIC_API_KEY`.
The enhancer uses `claude-opus-5-5` at low effort, with server-side refusal fallback enabled.

### 5. Set up Stripe (test mode)

1. Copy your test **secret key** into `STRIPE_SECRET_KEY`. Credit packs use inline `price_data`, so you don't need
   to create products in the dashboard.
2. For local webhooks, install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`.
3. Pay with test card `4242 4242 4242 4242`, any future expiry date and any CVC.

### 6. Run locally

```bash
npm run dev
```

Open http://localhost:3000, sign in, and you start with 20 credits.

> fal.ai can't send webhooks to `localhost`. Locally, the app finishes jobs by polling `/api/status/[id]`, which
> asks fal.ai directly, so generation works without a tunnel. In production, the webhook and polling both run;
> whichever arrives first settles the job.

## Deploy to Vercel

1. Push the repo to GitHub and import it on [vercel.com/new](https://vercel.com/new).
   Set **Root Directory** to `clipforge` (the framework is detected as Next.js).
2. Add every variable from `.env.example` under **Settings → Environment Variables**. Set `NEXT_PUBLIC_APP_URL` to
   your production URL, e.g. `https://clipforge.vercel.app`.
3. Deploy.
4. In **Supabase → Authentication → URL Configuration**, set *Site URL* to the production URL and add
   `https://<your-domain>/auth/callback` to *Redirect URLs*.
5. In **Stripe → Developers → Webhooks**, add an endpoint at `https://<your-domain>/api/webhooks/stripe` for the
   events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Put its signing secret in
   `STRIPE_WEBHOOK_SECRET` on Vercel and redeploy.
6. If you use Google sign-in, add the production callback in the Google Cloud console too.

Route handlers that finish jobs (`/api/status/[id]`, `/api/webhooks/fal`) set `maxDuration = 60` so there's time to
copy the MP4 into storage.

## How it works

### Credits: charged only on success

```
submit ──► create_generation()      reserve cost (credits - reserved must cover it)
              │
     fal.ai renders (poll + webhook both call syncGeneration)
              │
   ┌──────────┴──────────┐
success                failure / timeout (30 min)
complete_generation()  fail_generation()
deduct the cost        release the reservation, log a 0-credit "refund" entry
```

- All credit changes go through Postgres functions (`supabase/migrations/0001_init.sql`). They lock the user row and
  are idempotent, so a webhook racing a poll can't charge twice.
- Reserving at submit stops users from queueing more jobs than they can pay for. The reservation only becomes a
  deduction when the video succeeds.
- `credit_transactions` is an append-only ledger: signup bonus, purchases, generations and refunds.
- Stripe purchases are idempotent on the Checkout session id, and the webhook checks the amount paid against the
  pack price.

### Generation queue

1. `POST /api/generate` submits to fal.ai's queue (`fal.queue.submit`) with a webhook URL that carries a random
   per-job token.
2. The browser polls `GET /api/status/[id]` every 4 seconds. This also asks fal.ai for status, so jobs finish even
   if no webhook arrives.
3. When a job completes, the MP4 is copied into the private `videos` bucket, because fal.ai URLs aren't permanent.
   The browser gets short-lived signed URLs.
4. The fal.ai webhook never trusts its payload. It only triggers the same sync, which reads the result from fal.ai
   with the server key.
5. Progress is an estimate: queue position while queued, then a curve based on each model's typical render time.
   fal.ai doesn't report percentages for these models.

### Rate limits and safety

- Per user: 5 generation submissions per minute, at most 3 jobs running at once, 10 enhancer calls per minute
  (`LIMITS` in `src/lib/config/credits.ts`). Counters live in Postgres, so they hold across serverless instances.
- All API keys are server-only. Only the Supabase URL and anon key reach the browser, and row-level security limits
  each user to their own rows and storage folder.
- Uploads go straight from the browser to the `inputs` bucket under `<user_id>/`. The server checks that the path is
  the user's own before signing it for fal.ai.

## Customizing

**Add a video model**: add an entry to `MODELS` in `src/lib/config/models.ts` with its fal.ai endpoint ids and a
`buildInput` that maps the normalized request onto that endpoint's input schema. Then add its prices to
`GENERATION_COSTS` in `src/lib/config/credits.ts`. The UI, validation and pricing pick it up automatically.

```ts
{
  id: "kling-v2.6-pro",
  label: "Kling 2.6 Pro",
  family: "Kling",
  description: "Premium tier.",
  endpoints: {
    text: "fal-ai/kling-video/v2.6/pro/text-to-video",
    image: "fal-ai/kling-video/v2.6/pro/image-to-video",
  },
  aspectRatios: ASPECT_RATIOS,
  imageModeUsesAspectRatio: false,
  typicalSeconds: 180,
  durationLabel: { 5: "5s", 10: "10s" },
  buildInput: (mode, req) => ({ /* fields from the endpoint's API page */ }),
}
```

**Change prices or packs**: edit `src/lib/config/credits.ts`. If you change the signup bonus, also change `bonus`
in `handle_new_user()` in the migration.

**Add a camera preset**: add an entry to `CAMERA_PRESETS` in `src/lib/config/camera-presets.ts`.

**Add templates**: insert rows into `public.templates` (see `supabase/seed.sql` for the shape).

## Testing

```bash
npm run typecheck && npm run lint
npm test          # unit tests (pure logic)
npm run test:db   # spins up a throwaway local Postgres, applies the migration + seed, runs SQL assertions,
                  # then integration tests of the real API route handlers (fal.ai / Anthropic / Stripe mocked)
npm run test:e2e  # Playwright smoke test of the signed-in UI (see the header of tests/e2e/smoke.mjs)
```

`test:db` needs Postgres server binaries (`initdb`, `pg_ctl`). The integration suite covers the full credit
lifecycle (reserve → settle or release), webhook idempotency and token checks, rate limits, ownership checks,
image-to-video, the prompt enhancer request, and Stripe webhooks with real signature verification.
