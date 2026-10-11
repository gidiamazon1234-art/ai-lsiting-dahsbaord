/**
 * Image-to-video, prompt enhancer, and Stripe credit purchases against the
 * real schema. External APIs (fal.ai, Anthropic, Stripe network calls) are mocked;
 * Stripe webhook signatures are verified for real with the Stripe SDK.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { balance, h, newUser } from "../helpers/harness";

// --- Anthropic mock ----------------------------------------------------------
const claudeCalls: Record<string, unknown>[] = [];
let claudeReply: { stop_reason: string; text: string } = { stop_reason: "end_turn", text: "" };
vi.mock("@/lib/claude", () => ({
  ENHANCER_MODEL: "claude-opus-5-5",
  anthropic: () => ({
    beta: {
      messages: {
        create: async (params: Record<string, unknown>) => {
          claudeCalls.push(params);
          return {
            stop_reason: claudeReply.stop_reason,
            content: claudeReply.text ? [{ type: "text", text: claudeReply.text }] : [],
          };
        },
      },
    },
  }),
}));

process.env.STRIPE_SECRET_KEY = "sk_test_clipforge";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_clipforge_test";
process.env.NEXT_PUBLIC_APP_URL = "https://clipforge.test";

const { POST: generate } = await import("@/app/api/generate/route");
const { POST: enhance } = await import("@/app/api/enhance-prompt/route");
const { POST: checkout } = await import("@/app/api/checkout/route");
const { POST: stripeWebhook } = await import("@/app/api/webhooks/stripe/route");
const { stripe } = await import("@/lib/stripe");

const json = (url: string, body: unknown) =>
  new NextRequest(`https://clipforge.test${url}`, { method: "POST", body: JSON.stringify(body) });

afterAll(async () => {
  await h.pool.end();
});

describe("image-to-video", () => {
  it("sends the uploaded photo to the model's image endpoint", async () => {
    h.user = await newUser();
    const imagePath = `${h.user.id}/product.png`;
    await h.fake.storage.from("inputs").upload(imagePath, new Uint8Array([1]));

    const res = await generate(
      json("/api/generate", {
        mode: "image",
        prompt: "The bottle slowly rotates on a mirror",
        model: "wan-2.7",
        aspectRatio: "9:16",
        duration: 5,
        cameraPreset: "product-spin",
        imagePath,
      }),
    );
    expect(res.status).toBe(201);
    const dto = await res.json();
    expect(dto.mode).toBe("image");
    expect(dto.imageUrl).toContain(`/inputs/${imagePath}`);

    const sub = h.falSubmissions.at(-1)!;
    expect(sub.endpoint).toBe("fal-ai/wan/v2.7/image-to-video");
    expect(sub.input.image_url).toBe(`https://storage.test/inputs/${imagePath}?token=x`);
    expect(sub.input).not.toHaveProperty("aspect_ratio");
    expect(sub.input.prompt).toMatch(/turntable/);
  });

  it("refuses a path that was never uploaded", async () => {
    h.user = await newUser();
    const res = await generate(
      json("/api/generate", {
        mode: "image",
        prompt: "animate it",
        model: "kling-v3",
        aspectRatio: "9:16",
        duration: 5,
        imagePath: `${h.user.id}/missing.png`,
      }),
    );
    expect(res.status).toBe(400);
    expect(await balance(h.user.id)).toEqual({ credits: 20, reserved: 0 });
  });
});

describe("prompt enhancer", () => {
  it("rewrites an idea with Claude, passing mode/camera context", async () => {
    h.user = await newUser();
    claudeReply = { stop_reason: "end_turn", text: '"A frosted perfume bottle on black marble, golden light."' };
    const res = await enhance(
      json("/api/enhance-prompt", { idea: "perfume luxury", mode: "text", aspectRatio: "9:16", cameraPreset: "orbit" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ prompt: "A frosted perfume bottle on black marble, golden light." });

    const call = claudeCalls.at(-1)!;
    expect(call).toMatchObject({
      model: "claude-opus-5-5",
      output_config: { effort: "low" },
      fallbacks: "default",
      betas: ["server-side-fallback-2026-07-01"],
    });
    expect(call).not.toHaveProperty("thinking");
    const content = (call.messages as { content: string }[])[0].content;
    expect(content).toContain("Idea: perfume luxury");
    expect(content).toContain("Orbit");
    expect(content).toContain("9:16 vertical");
  });

  it("handles refusals and empty input", async () => {
    h.user = await newUser();
    claudeReply = { stop_reason: "refusal", text: "" };
    expect((await enhance(json("/api/enhance-prompt", { idea: "something" }))).status).toBe(422);
    expect((await enhance(json("/api/enhance-prompt", { idea: "" }))).status).toBe(400);
  });

  it("requires sign-in", async () => {
    h.user = null;
    expect((await enhance(json("/api/enhance-prompt", { idea: "x y z" }))).status).toBe(401);
  });
});

describe("Stripe credit packs", () => {
  beforeAll(() => {
    vi.spyOn(stripe().checkout.sessions, "create").mockImplementation((async (params: Record<string, any>) => ({
      id: "cs_test_mock",
      url: "https://checkout.stripe.test/c/pay/cs_test_mock",
      ...params,
    })) as never);
  });

  it("creates a checkout session for a known pack", async () => {
    h.user = await newUser();
    const res = await checkout(json("/api/checkout", { packId: "creator" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.test/c/pay/cs_test_mock" });
    const params = vi.mocked(stripe().checkout.sessions.create).mock.calls.at(-1)![0]!;
    expect(params).toMatchObject({
      mode: "payment",
      client_reference_id: h.user.id,
      metadata: { user_id: h.user.id, pack_id: "creator", credits: "150" },
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 1200 } }],
    });
    expect((await checkout(json("/api/checkout", { packId: "free-money" }))).status).toBe(400);
  });

  function signedEvent(session: Record<string, unknown>, type = "checkout.session.completed") {
    const payload = JSON.stringify({ id: `evt_${Math.random()}`, object: "event", type, data: { object: session } });
    const signature = stripe().webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });
    return new NextRequest("https://clipforge.test/api/webhooks/stripe", {
      method: "POST",
      body: payload,
      headers: { "stripe-signature": signature },
    });
  }

  it("grants credits once per paid session, and only for the right amount", async () => {
    const user = await newUser();
    const session = {
      id: `cs_test_${user.id}`,
      object: "checkout.session",
      payment_status: "paid",
      amount_total: 1200,
      client_reference_id: user.id,
      metadata: { user_id: user.id, pack_id: "creator", credits: "150" },
    };

    let res = await stripeWebhook(signedEvent(session));
    expect(await res.json()).toMatchObject({ received: true, applied: true });
    expect(await balance(user.id)).toEqual({ credits: 170, reserved: 0 });

    // Stripe retries / duplicate deliveries
    res = await stripeWebhook(signedEvent(session));
    expect(await res.json()).toMatchObject({ applied: false });
    expect(await balance(user.id)).toEqual({ credits: 170, reserved: 0 });

    // amount doesn't match the pack price -> ignored
    res = await stripeWebhook(signedEvent({ ...session, id: "cs_tampered", amount_total: 1 }));
    expect(await res.json()).toMatchObject({ ignored: true });

    // unpaid (async payment pending) -> wait
    res = await stripeWebhook(signedEvent({ ...session, id: "cs_pending", payment_status: "unpaid" }));
    expect(await res.json()).toMatchObject({ pending: true });
    expect(await balance(user.id)).toEqual({ credits: 170, reserved: 0 });

    const { rows } = await h.pool.query(
      "select type, amount, reference from public.credit_transactions where user_id = $1 and type = 'purchase'",
      [user.id],
    );
    expect(rows).toEqual([{ type: "purchase", amount: 150, reference: session.id }]);
  });

  it("rejects unsigned or forged webhooks", async () => {
    const forged = new NextRequest("https://clipforge.test/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({ type: "checkout.session.completed" }),
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
    });
    expect((await stripeWebhook(forged)).status).toBe(400);
    const unsigned = new NextRequest("https://clipforge.test/api/webhooks/stripe", { method: "POST", body: "{}" });
    expect((await stripeWebhook(unsigned)).status).toBe(400);
  });
});
