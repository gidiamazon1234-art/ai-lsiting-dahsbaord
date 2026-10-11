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
    { mode: "text", prompt: undefined, model: "kling-v3", aspectRatio: "16:9", duration: 10, cameraPreset: null, templateId: null, imagePath: null },
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

async function noHorizontalScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.equal(overflow, 0, "page scrolls horizontally");
}

// --- Templates -> Create ------------------------------------------------------
await step("templates: filter, then 'Use template' prefills the studio", async () => {
  const { ctx, page, errors } = await newPage(MOBILE);
  await page.goto(`${BASE}/templates`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/templates-mobile.png`, fullPage: true });
  await noHorizontalScroll(page);
  assert.equal(await page.getByRole("link", { name: /Use template/ }).count(), 6);
  await page.getByRole("button", { name: "Social", exact: true }).click();
  assert.equal(await page.getByRole("link", { name: /Use template/ }).count(), 2);

  await page.getByRole("article").filter({ hasText: "UGC unboxing" }).getByRole("link", { name: /Use template/ }).click();
  await page.waitForURL(/\/create\?template=ugc-unboxing/);
  await page.getByText("Template: UGC unboxing").waitFor();
  assert.match(await page.getByLabel(/Prompt/).inputValue(), /ugc unboxing/i);
  assert.equal(await page.getByRole("radio", { name: /Handheld/ }).getAttribute("aria-checked"), "true");
  assert.deepEqual(errors, []);
  await ctx.close();
});

// --- Enhance + camera + image mode -------------------------------------------
await step("create: enhance with undo, camera preset, image-to-video tab", async () => {
  const { ctx, page, errors } = await newPage(DESKTOP);
  let enhanceBody = null;
  await page.route("**/api/enhance-prompt", async (route) => {
    enhanceBody = JSON.parse(route.request().postData());
    await route.fulfill({ json: { prompt: "A frosted perfume bottle on black marble, a beam of golden light sweeps across it." } });
  });
  await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: /Crane Up/ }).click();
  const prompt = page.getByLabel(/Prompt/);
  await prompt.fill("perfume, luxury");
  await page.getByRole("button", { name: "Enhance" }).click();
  await page.getByRole("button", { name: "Undo" }).waitFor();
  assert.match(await prompt.inputValue(), /frosted perfume bottle/);
  assert.deepEqual(enhanceBody, { idea: "perfume, luxury", mode: "text", aspectRatio: "9:16", cameraPreset: "crane-up" });
  await page.screenshot({ path: `${OUT}/create-enhanced.png`, fullPage: true });
  await page.getByRole("button", { name: "Undo" }).click();
  assert.equal(await prompt.inputValue(), "perfume, luxury");

  await page.getByRole("tab", { name: /Image to video/ }).click();
  await page.getByText("Upload a product photo").waitFor();
  assert.equal(await page.getByRole("radio", { name: /9:16/ }).isDisabled(), true);
  await page.screenshot({ path: `${OUT}/create-image-mode.png`, fullPage: true });
  assert.deepEqual(errors, []);
  await ctx.close();
});

// --- Remix ----------------------------------------------------------------------
await step("create: remix prefills settings from a past video", async () => {
  const { ctx, page, errors } = await newPage(DESKTOP);
  await page.goto(`${BASE}/create?remix=00000000-0000-4000-8000-000000000001`, { waitUntil: "networkidle" });
  await page.getByText(/Remixing a previous video/).waitFor();
  assert.match(await page.getByLabel(/Prompt/).inputValue(), /Skincare serum/);
  assert.equal(await page.getByRole("radio", { name: /Wan 2.7/ }).getAttribute("aria-checked"), "true");
  assert.equal(await page.getByRole("radio", { name: /1:1/ }).getAttribute("aria-checked"), "true");
  assert.equal(await page.getByRole("radio", { name: /Orbit/ }).getAttribute("aria-checked"), "true");
  assert.deepEqual(errors, []);
  await ctx.close();
});

// --- Library ---------------------------------------------------------------------
await step("library: grid, play dialog, remix link, delete", async () => {
  const { ctx, page, errors } = await newPage(MOBILE);
  let deleted = null;
  await page.route("**/api/generations/*", async (route) => {
    if (route.request().method() === "DELETE") {
      deleted = route.request().url().split("/").pop();
      return route.fulfill({ json: { ok: true } });
    }
    return route.continue();
  });
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  await page.getByRole("article").first().waitFor();
  await page.screenshot({ path: `${OUT}/library-mobile.png`, fullPage: true });
  await noHorizontalScroll(page);
  assert.equal(await page.getByRole("article").count(), 5);
  await page.getByText("Failed · no credits charged").waitFor();
  assert.equal(await page.getByRole("link", { name: "Download MP4" }).count(), 4);
  assert.equal(
    await page.getByRole("link", { name: "Remix" }).first().getAttribute("href"),
    "/create?remix=00000000-0000-4000-8000-000000000000",
  );

  await page.getByRole("button", { name: "Play video" }).first().click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({ path: `${OUT}/library-dialog.png` });
  await page.keyboard.press("Escape");

  const card = page.getByRole("article").nth(1);
  await card.getByRole("button", { name: "Delete" }).click();
  await card.getByRole("button", { name: "Confirm delete" }).click();
  await page.getByText("Video deleted").waitFor();
  assert.equal(deleted, "00000000-0000-4000-8000-000000000001");
  assert.equal(await page.getByRole("article").count(), 4);
  assert.deepEqual(errors, []);
  await ctx.close();
});

// --- Credits -----------------------------------------------------------------------
await step("credits: balance, packs, history, checkout redirect", async () => {
  const { ctx, page, errors } = await newPage(MOBILE);
  let packId = null;
  await page.route("**/api/checkout", async (route) => {
    packId = JSON.parse(route.request().postData()).packId;
    await route.fulfill({ json: { url: `${BASE}/templates?from=stripe` } });
  });
  await page.goto(`${BASE}/credits`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/credits-mobile.png`, fullPage: true });
  await noHorizontalScroll(page);
  await page.getByText("Creator pack").waitFor();
  await page.getByText("+150").waitFor();
  await page.getByRole("button", { name: "Buy Creator" }).click();
  await page.waitForURL(/from=stripe/);
  assert.equal(packId, "creator");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await step("desktop screenshots", async () => {
  const { ctx, page } = await newPage(DESKTOP);
  for (const path of ["templates", "library", "credits"]) {
    await page.goto(`${BASE}/${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${path}-desktop.png`, fullPage: true });
  }
  await ctx.close();
});

await browser.close();
console.log(results.join("\n"));
if (results.some((r) => r.startsWith("❌"))) process.exit(1);
