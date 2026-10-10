/**
 * End-to-end test of the generation pipeline: the real route handlers and the
 * real Postgres schema/functions, with fal.ai mocked. Run with `npm run test:db`.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { balance, h, newUser } from "../helpers/harness";

const { pool, fake, falJobs, falSubmissions } = h;

const { POST: generate } = await import("@/app/api/generate/route");
const { GET: status } = await import("@/app/api/status/[id]/route");
const { POST: falWebhook } = await import("@/app/api/webhooks/fal/route");
const { DELETE: deleteGeneration } = await import("@/app/api/generations/[id]/route");

function post(body: unknown) {
  return generate(
    new NextRequest("https://clipforge.test/api/generate", { method: "POST", body: JSON.stringify(body) }),
  );
}

async function poll(id: string) {
  const res = await status(new Request(`https://clipforge.test/api/status/${id}`), { params: { id } });
  return { res, body: await res.json() };
}

async function falRequestId(id: string) {
  const { rows } = await pool.query("select fal_request_id, webhook_token from public.generations where id = $1", [id]);
  return rows[0] as { fal_request_id: string; webhook_token: string };
}

const kling = { mode: "text", prompt: "A sneaker on a neon-lit podium", model: "kling-v3", aspectRatio: "9:16", duration: 5 };

// --- setup -----------------------------------------------------------------
beforeAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://clipforge.test";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]), { status: 200 })),
  );
});
afterAll(async () => {
  vi.unstubAllGlobals();
  await pool.end();
});
beforeEach(() => {
  falSubmissions.length = 0;
});

// --- tests -----------------------------------------------------------------
describe("text-to-video end to end", () => {
  it("rejects anonymous users", async () => {
    h.user = null;
    const res = await post(kling);
    expect(res.status).toBe(401);
  });

  it("queues a job, polls through to completion, and charges only on success", async () => {
    h.user = await newUser();
    expect(await balance(h.user!.id)).toEqual({ credits: 20, reserved: 0 });

    const res = await post({ ...kling, cameraPreset: "dolly-in" });
    expect(res.status).toBe(201);
    const job = await res.json();
    expect(job).toMatchObject({ status: "queued", model: "kling-v3", cost: 8, queuePosition: 3 });

    // what was sent to fal.ai
    expect(falSubmissions).toHaveLength(1);
    const sub = falSubmissions[0];
    expect(sub.endpoint).toBe("fal-ai/kling-video/v3/standard/text-to-video");
    expect(sub.input).toMatchObject({ aspect_ratio: "9:16", duration: "5", generate_audio: false });
    expect(sub.input.prompt).toContain("A sneaker on a neon-lit podium.");
    expect(sub.input.prompt).toContain("dolly-in");
    const { webhook_token } = await falRequestId(job.id);
    expect(sub.webhookUrl).toBe(`https://clipforge.test/api/webhooks/fal?id=${job.id}&token=${webhook_token}`);

    // credits are reserved, not spent
    expect(await balance(h.user!.id)).toEqual({ credits: 20, reserved: 8 });

    // queued -> processing
    const { fal_request_id } = await falRequestId(job.id);
    falJobs.set(fal_request_id, { status: "IN_PROGRESS" });
    let polled = await poll(job.id);
    expect(polled.body.status).toBe("processing");
    expect(polled.body.progress).toBeGreaterThanOrEqual(10);
    expect(polled.body.progress).toBeLessThan(100);

    // processing -> completed
    falJobs.set(fal_request_id, { status: "COMPLETED", result: { ok: true, url: "https://v3.fal.media/out.mp4" } });
    polled = await poll(job.id);
    expect(polled.body).toMatchObject({ status: "completed", progress: 100 });
    expect(polled.body.videoUrl).toBe(`https://storage.test/videos/${h.user!.id}/${job.id}.mp4?token=x`);
    expect(polled.body.downloadUrl).toContain("download=");
    expect(fake.storage._objects.has(`videos/${h.user!.id}/${job.id}.mp4`)).toBe(true);
    expect(await balance(h.user!.id)).toEqual({ credits: 12, reserved: 0 });

    // polling again (or a late webhook) never charges twice
    await poll(job.id);
    const { token } = { token: webhook_token };
    await falWebhook(
      new NextRequest(`https://clipforge.test/api/webhooks/fal?id=${job.id}&token=${token}`, {
        method: "POST",
        body: JSON.stringify({ request_id: fal_request_id, status: "OK" }),
      }),
    );
    expect(await balance(h.user!.id)).toEqual({ credits: 12, reserved: 0 });

    const { rows } = await pool.query(
      "select type, amount from public.credit_transactions where user_id = $1 order by created_at",
      [h.user!.id],
    );
    expect(rows).toEqual([
      { type: "signup_bonus", amount: 20 },
      { type: "generation", amount: -8 },
    ]);
  });

  it("refunds (charges nothing) when the model fails", async () => {
    h.user = await newUser();
    const job = await (await post(kling)).json();
    const { fal_request_id } = await falRequestId(job.id);
    falJobs.set(fal_request_id, {
      status: "COMPLETED",
      result: { ok: false, transient: false, message: "Content policy violation" },
    });
    const { body } = await poll(job.id);
    expect(body).toMatchObject({ status: "failed", error: "Content policy violation" });
    expect(await balance(h.user!.id)).toEqual({ credits: 20, reserved: 0 });
  });

  it("keeps the job running on transient provider errors", async () => {
    h.user = await newUser();
    const job = await (await post(kling)).json();
    const { fal_request_id } = await falRequestId(job.id);
    falJobs.set(fal_request_id, { status: "COMPLETED", result: { ok: false, transient: true, message: "503" } });
    const { body } = await poll(job.id);
    expect(body.status).toBe("queued");
    expect(await balance(h.user!.id)).toEqual({ credits: 20, reserved: 8 });
  });

  it("releases the reservation if fal.ai rejects the submission", async () => {
    h.user = await newUser();
    h.failNextSubmit = true;
    const res = await post(kling);
    expect(res.status).toBe(502);
    expect(await balance(h.user!.id)).toEqual({ credits: 20, reserved: 0 });
  });

  it("refuses jobs the user cannot afford (counting in-flight reservations)", async () => {
    h.user = await newUser();
    expect((await post({ ...kling, duration: 10 })).status).toBe(201); // 16 of 20 reserved
    const res = await post(kling); // needs 8, only 4 free
    expect(res.status).toBe(402);
    expect((await res.json()).code).toBe("insufficient_credits");
  });

  it("validates input", async () => {
    h.user = await newUser();
    expect((await post({ ...kling, model: "nope" })).status).toBe(400);
    expect((await post({ ...kling, prompt: "" })).status).toBe(400);
    expect((await post({ ...kling, aspectRatio: "4:5" })).status).toBe(400);
    // Hailuo only renders 16:9 for text-to-video
    expect((await post({ ...kling, model: "hailuo-2.3", aspectRatio: "9:16" })).status).toBe(400);
    expect((await post({ ...kling, mode: "image" })).status).toBe(400); // no image
    expect(
      (await post({ ...kling, mode: "image", imagePath: `${randomUUID()}/someone-elses.png` })).status,
    ).toBe(400);
  });

  it("rate limits bursts per user", async () => {
    h.user = await newUser();
    await pool.query("update public.users set credits = 500 where id = $1", [h.user!.id]);
    const results: { status: number; error?: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await post({ ...kling, model: "wan-2.7" });
      results.push({ status: res.status, error: (await res.json()).error });
    }
    // 1-3 succeed, 4-5 hit the active-job cap, 6+ hit the per-minute rate limiter
    expect(results.slice(0, 3).map((r) => r.status)).toEqual([201, 201, 201]);
    expect(results[3].error).toMatch(/up to 3 videos at once/);
    expect(results[5]).toMatchObject({ status: 429, error: expect.stringMatching(/too fast/) });
    expect(results[6]).toMatchObject({ status: 429, error: expect.stringMatching(/too fast/) });
  });

  it("does not leak other users' jobs", async () => {
    h.user = await newUser();
    const job = await (await post(kling)).json();
    h.user = await newUser();
    const { res } = await poll(job.id);
    expect(res.status).toBe(404);
  });

  it("webhook requires the per-job token", async () => {
    h.user = await newUser();
    const job = await (await post(kling)).json();
    const { fal_request_id, webhook_token } = await falRequestId(job.id);
    falJobs.set(fal_request_id, { status: "COMPLETED", result: { ok: true, url: "https://v3.fal.media/w.mp4" } });

    const bad = await falWebhook(
      new NextRequest(`https://clipforge.test/api/webhooks/fal?id=${job.id}&token=wrong`, {
        method: "POST",
        body: "{}",
      }),
    );
    expect(bad.status).toBe(404);
    expect(await balance(h.user!.id)).toEqual({ credits: 20, reserved: 8 });

    const good = await falWebhook(
      new NextRequest(`https://clipforge.test/api/webhooks/fal?id=${job.id}&token=${webhook_token}`, {
        method: "POST",
        body: JSON.stringify({ request_id: fal_request_id, status: "OK" }),
      }),
    );
    expect(await good.json()).toEqual({ ok: true, status: "completed" });
    expect(await balance(h.user!.id)).toEqual({ credits: 12, reserved: 0 });
  });

  it("deletes finished videos (and their file) but not running ones", async () => {
    h.user = await newUser();
    const job = await (await post(kling)).json();
    const del = (id: string) =>
      deleteGeneration(new Request(`https://clipforge.test/api/generations/${id}`, { method: "DELETE" }), {
        params: { id },
      });
    expect((await del(job.id)).status).toBe(409);

    const { fal_request_id } = await falRequestId(job.id);
    falJobs.set(fal_request_id, { status: "COMPLETED", result: { ok: true, url: "https://v3.fal.media/d.mp4" } });
    await poll(job.id);
    expect(fake.storage._objects.has(`videos/${h.user!.id}/${job.id}.mp4`)).toBe(true);

    expect((await del(job.id)).status).toBe(200);
    expect(fake.storage._objects.has(`videos/${h.user!.id}/${job.id}.mp4`)).toBe(false);
    const { rows } = await pool.query("select count(*)::int as n from public.generations where id = $1", [job.id]);
    expect(rows[0].n).toBe(0);
    // ledger survives deletion
    expect(await balance(h.user!.id)).toEqual({ credits: 12, reserved: 0 });
  });
});
