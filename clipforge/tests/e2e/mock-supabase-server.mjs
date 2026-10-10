/**
 * Minimal HTTP mock of the Supabase endpoints the app touches, for browser
 * smoke tests of signed-in pages without a real Supabase project.
 *
 *   node tests/e2e/mock-supabase-server.mjs   # listens on :54321
 *
 * Point NEXT_PUBLIC_SUPABASE_URL at http://127.0.0.1:54321 and set the cookie
 * printed by `sessionCookie()` (see tests/e2e/smoke.mjs).
 */
import http from "node:http";

export const USER = {
  id: "5b3c9a52-6f0e-4d7a-9a71-2f6a4f1f0a11",
  aud: "authenticated",
  role: "authenticated",
  email: "demo@clipforge.dev",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-10-01T10:00:00Z",
};

export function sessionCookie() {
  const session = {
    access_token: "mock-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "mock-refresh-token",
    user: USER,
  };
  return { name: "sb-127-auth-token", value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url") };
}

const SAMPLE_VIDEO = "https://storage.test/sample.mp4";
const now = Date.now();
const iso = (minsAgo) => new Date(now - minsAgo * 60000).toISOString();

const generations = [
  ["completed", "kling-v3", "9:16", "Matte black wireless earbuds rising out of a glossy charging case, neon rim light", 12],
  ["completed", "wan-2.7", "1:1", "Skincare serum bottle on pastel linen with eucalyptus sprigs, soft daylight", 40],
  ["failed", "hailuo-2.3", "16:9", "Sports car drifting through a rainy neon city at night", 90],
  ["completed", "hailuo-2.3", "16:9", "Cold brew coffee bottle on wet black slate, condensation dripping", 300],
  ["completed", "kling-v3", "9:16", "Hands unboxing a minimalist smartwatch on a wooden desk, warm light", 1500],
].map(([status, model, aspect_ratio, prompt, mins], i) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  user_id: USER.id,
  mode: "text",
  prompt,
  final_prompt: prompt,
  model,
  settings: { aspect_ratio, duration: 5, camera_preset: i % 2 ? "orbit" : "dolly-in", template_id: null, image_path: null },
  status,
  fal_endpoint: "x",
  fal_request_id: `req_${i}`,
  webhook_token: "t",
  queue_position: null,
  started_at: iso(mins + 2),
  video_path: status === "completed" ? `${USER.id}/${i}.mp4` : null,
  video_url: status === "completed" ? SAMPLE_VIDEO : null,
  cost: 8,
  error: status === "failed" ? "The model could not render this prompt." : null,
  created_at: iso(mins),
  updated_at: iso(mins),
  completed_at: iso(mins - 2),
}));

const TEMPLATE_GRADIENTS = [
  "from-sky-500/40 via-cyan-500/20 to-transparent",
  "from-amber-500/40 via-orange-500/20 to-transparent",
  "from-yellow-500/40 via-amber-600/20 to-transparent",
  "from-rose-500/40 via-pink-500/20 to-transparent",
  "from-blue-500/40 via-indigo-500/20 to-transparent",
  "from-emerald-500/40 via-teal-500/20 to-transparent",
];
const templates = [
  ["amazon-product-showcase", "Amazon product showcase", "E-commerce", "image", "product-spin", "1:1", "kling-v3"],
  ["ugc-unboxing", "UGC unboxing", "Social", "text", "handheld", "9:16", "kling-v3"],
  ["luxury-reveal", "Luxury reveal", "Luxury", "text", "dolly-in", "9:16", "kling-v3"],
  ["lifestyle-in-use", "Lifestyle in use", "E-commerce", "text", "orbit", "9:16", "hailuo-2.3"],
  ["splash-hero", "Splash hero shot", "Ads", "text", "crane-up", "9:16", "wan-2.7"],
  ["flat-lay-story", "Flat-lay story", "Social", "text", "zoom-out", "1:1", "wan-2.7"],
].map(([id, title, category, mode, camera_preset, aspect_ratio, model], i) => ({
  id,
  title,
  description: "Ready-made preset with a tuned prompt and camera move.",
  category,
  mode,
  prompt: `Example prompt for ${title.toLowerCase()} with cinematic lighting and crisp product detail.`,
  camera_preset,
  aspect_ratio,
  duration: 5,
  model,
  cover_gradient: TEMPLATE_GRADIENTS[i],
  sort_order: i,
}));

const transactions = [
  { id: "t1", user_id: USER.id, amount: 20, type: "signup_bonus", generation_id: null, reference: null, description: "Welcome bonus", balance_after: 20, created_at: iso(3000) },
  { id: "t2", user_id: USER.id, amount: 150, type: "purchase", generation_id: null, reference: "cs_1", description: "Creator pack", balance_after: 170, created_at: iso(2000) },
  { id: "t3", user_id: USER.id, amount: -8, type: "generation", generation_id: null, reference: null, description: "Video generation (kling-v3)", balance_after: 162, created_at: iso(1490) },
  { id: "t4", user_id: USER.id, amount: 0, type: "refund", generation_id: null, reference: null, description: "Generation failed - 6 reserved credits released, nothing charged", balance_after: 162, created_at: iso(88) },
];

function filterRows(rows, url) {
  let out = rows;
  for (const [key, raw] of url.searchParams) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    const [op, ...rest] = raw.split(".");
    const val = rest.join(".");
    if (op === "eq") out = out.filter((r) => String(r[key]) === val);
    if (op === "in") {
      const list = val.replace(/^\(|\)$/g, "").split(",");
      out = out.filter((r) => list.includes(String(r[key])));
    }
    if (op === "lt") out = out.filter((r) => String(r[key]) < val);
  }
  const limit = Number(url.searchParams.get("limit") ?? 1000);
  return out.slice(0, limit);
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:54321");
  const path = url.pathname;
  const single = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  let body = "";
  for await (const chunk of req) body += chunk;

  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" });
    return res.end();
  }
  if (path === "/auth/v1/user") return send(res, 200, USER);
  if (path === "/auth/v1/logout") return send(res, 204, {});
  if (path === "/auth/v1/otp") return send(res, 200, {});

  if (path.startsWith("/rest/v1/")) {
    const table = path.slice("/rest/v1/".length);
    const data = {
      users: [{ id: USER.id, email: USER.email, credits: 162, reserved_credits: 0 }],
      generations,
      templates,
      credit_transactions: transactions,
    }[table];
    if (!data) return send(res, 200, table.startsWith("rpc/") ? true : []);
    const rows = filterRows(data, url);
    return send(res, 200, single ? rows[0] ?? null : rows);
  }

  if (path.startsWith("/storage/v1/object/sign/")) {
    const parsed = body ? JSON.parse(body) : {};
    if (parsed.paths) return send(res, 200, parsed.paths.map((p) => ({ path: p, signedURL: `/object/sign/x/${p}?token=t`, error: null })));
    return send(res, 200, { signedURL: `/object/sign/x?token=t` });
  }
  if (path.startsWith("/storage/v1/object/")) return send(res, 200, { Key: path });

  send(res, 404, { message: `mock: no route for ${req.method} ${path}` });
});

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(54321, "127.0.0.1", () => console.log("mock supabase on :54321"));
}
export { server };
