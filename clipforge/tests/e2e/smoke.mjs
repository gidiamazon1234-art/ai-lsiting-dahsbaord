/**
 * Browser smoke test for signed-in pages. Requires:
 *   1. `node tests/e2e/mock-supabase-server.mjs` running (port 54321)
 *   2. `next dev` running with NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
 *   3. Playwright installed (npx playwright / global); set PLAYWRIGHT=<path> if not resolvable.
 *
 *   node tests/e2e/smoke.mjs [screenshotDir]
 *
 * Generation API calls are stubbed in the browser; the real route handlers
 * are covered by tests/integration (npm run test:db).
 */
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { sessionCookie } from "./mock-supabase-server.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? "playwright");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.argv[2] ?? "/tmp";

const browser = await chromium.launch();
const results = [];

async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await ctx.addCookies([{ ...sessionCookie(), url: BASE }]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // Fixture media lives on a fake host, so those fetches are expected to fail.
    if (m.type() === "error" && !(m.location()?.url ?? "").includes("storage.test")) errors.push(m.text());
  });
  return { ctx, page, errors };
}

async function step(name, fn) {
  try {
    await fn();
    results.push(`✅ ${name}`);
  } catch (err) {
    results.push(`❌ ${name}: ${err.message}`);
  }
}

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1366, height: 900 };

// --- Create: text-to-video happy path ---------------------------------------
await step("create: submit text-to-video, watch it render, get notified", async () => {
  const { ctx, page, errors } = await newPage(DESKTOP);
  let polls = 0;
  let submitted = null;
  const job = {
    id: "11111111-2222-4333-8444-555555555555",
    mode: "text",
    prompt: "",
    model: "kling-v3",
    settings: { aspect_ratio: "9:16", duration: 5 },
    status: "queued",
    queuePosition: 2,
    progress: 6,
    cost: 8,
    error: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    videoUrl: null,
    downloadUrl: null,
    imageUrl: null,
  };
  await page.route("**/api/generate", async (route) => {
    submitted = JSON.parse(route.request().postData());
    job.prompt = submitted.prompt;
    await route.fulfill({ status: 201, json: job });
  });
  await page.route("**/api/status/*", async (route) => {
    polls++;
    const state =
      polls < 2
        ? { ...job, status: "processing", queuePosition: null, progress: 42 }
        : { ...job, status: "completed", progress: 100, videoUrl: "https://storage.test/v.mp4", downloadUrl: "https://storage.test/v.mp4?download=" };
    await route.fulfill({ json: state });
  });

  await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/create-desktop.png`, fullPage: true });
  await page.getByLabel("Prompt").fill("A sneaker floating above a neon podium, slow motion");
  await page.getByRole("radio", { name: /16:9/ }).click();
  await page.getByRole("radio", { name: /10s/ }).click();
  await page.getByRole("button", { name: "Generate" }).click();

  await page.getByText("Rendering").waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${OUT}/create-rendering.png` });
  await page.getByText("Your video is ready").waitFor({ timeout: 15000 });
  await page.getByRole("link", { name: /Download MP4/ }).first().waitFor();
  await page.screenshot({ path: `${OUT}/create-done.png` });

  assert.deepEqual(
    { ...submitted, prompt: undefined },
    { mode: "text", prompt: undefined, model: "kling-v3", aspectRatio: "16:9", duration: 10, templateId: null },
  );
  assert.deepEqual(errors, []);
  await ctx.close();
});

await step("create: mobile layout", async () => {
  const { ctx, page, errors } = await newPage(MOBILE);
  await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/create-mobile.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.equal(overflow, 0, "page scrolls horizontally on mobile");
  // Hailuo only does 16:9 for text-to-video: selecting it must lock the ratio
  await page.getByRole("radio", { name: /Hailuo/ }).click();
  assert.equal(await page.getByRole("radio", { name: /9:16/ }).isDisabled(), true);
  assert.equal(await page.getByRole("radio", { name: /16:9/ }).getAttribute("aria-checked"), "true");
  assert.equal(await page.getByRole("radio", { name: "6s" }).count(), 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await browser.close();
console.log(results.join("\n"));
if (results.some((r) => r.startsWith("❌"))) process.exit(1);
