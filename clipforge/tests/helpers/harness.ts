/**
 * Shared integration-test harness: real Postgres (DATABASE_URL) behind a
 * supabase-js look-alike, a switchable "signed-in user", and a scriptable
 * fake fal.ai queue. Import this before importing any route handler.
 */
import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { Pool } from "pg";
import { createFakeSupabase } from "./fake-supabase";

export type FalState =
  | { status: "IN_QUEUE"; queue_position: number }
  | { status: "IN_PROGRESS" }
  | { status: "COMPLETED"; result: { ok: true; url: string } | { ok: false; transient: boolean; message: string } };

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const h = {
  pool,
  fake: createFakeSupabase(pool),
  user: null as { id: string; email: string } | null,
  falJobs: new Map<string, FalState>(),
  falSubmissions: [] as { endpoint: string; input: Record<string, unknown>; webhookUrl?: string }[],
  failNextSubmit: false,
};

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => h.fake }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    requireUser: async () =>
      h.user
        ? { user: h.user, supabase: h.fake, response: null }
        : { user: null, supabase: h.fake, response: actual.jsonError("Not signed in", 401) },
  };
});

vi.mock("@/lib/fal", () => ({
  submitToFal: async (endpoint: string, input: Record<string, unknown>, webhookUrl?: string) => {
    if (h.failNextSubmit) {
      h.failNextSubmit = false;
      throw new Error("422 Unprocessable");
    }
    const requestId = `req_${randomUUID()}`;
    h.falSubmissions.push({ endpoint, input, webhookUrl });
    h.falJobs.set(requestId, { status: "IN_QUEUE", queue_position: 3 });
    return { requestId, queuePosition: 3 };
  },
  getFalStatus: async (_endpoint: string, requestId: string) => {
    const s = h.falJobs.get(requestId)!;
    return s.status === "IN_QUEUE" ? { status: s.status, queue_position: s.queue_position } : { status: s.status };
  },
  getFalResult: async (_endpoint: string, requestId: string) => {
    const s = h.falJobs.get(requestId)!;
    if (s.status !== "COMPLETED") throw new Error("not done");
    return s.result.ok ? { ok: true, result: { videoUrl: s.result.url } } : s.result;
  },
  classifyFalError: () => ({ transient: true, message: "network" }),
}));

export async function newUser() {
  const id = randomUUID();
  await pool.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@test.dev`]);
  return { id, email: `${id}@test.dev` };
}

export async function balance(userId: string) {
  const { rows } = await pool.query("select credits, reserved_credits from public.users where id = $1", [userId]);
  return { credits: rows[0].credits as number, reserved: rows[0].reserved_credits as number };
}

export async function jobRow(id: string) {
  const { rows } = await pool.query("select * from public.generations where id = $1", [id]);
  return rows[0];
}
