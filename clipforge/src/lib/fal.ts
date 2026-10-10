import "server-only";
import { ApiError, createFalClient, type QueueStatus } from "@fal-ai/client";
import { serverEnv } from "@/lib/env";

let client: ReturnType<typeof createFalClient> | null = null;

function fal() {
  client ??= createFalClient({ credentials: serverEnv.falKey() });
  return client;
}

export async function submitToFal(endpoint: string, input: Record<string, unknown>, webhookUrl?: string) {
  // Endpoint ids come from our own registry; the typed overloads only matter for literals.
  const res = await fal().queue.submit(endpoint as never, { input: input as never, webhookUrl });
  return { requestId: res.request_id, queuePosition: res.queue_position ?? null };
}

export async function getFalStatus(endpoint: string, requestId: string): Promise<QueueStatus> {
  return fal().queue.status(endpoint, { requestId, logs: false });
}

export interface FalVideoResult {
  videoUrl: string;
}

/**
 * Fetch a finished job's output. Returns `{ ok: false, transient }` on error so
 * callers can tell "the job failed" (charge nothing, release credits) apart from
 * "fal's API hiccuped" (try again on the next poll).
 */
export async function getFalResult(
  endpoint: string,
  requestId: string,
): Promise<{ ok: true; result: FalVideoResult } | { ok: false; transient: boolean; message: string }> {
  try {
    const res = await fal().queue.result(endpoint as never, { requestId });
    const data = res.data as { video?: { url?: string } } | undefined;
    const url = data?.video?.url;
    if (!url) return { ok: false, transient: false, message: "The model returned no video." };
    return { ok: true, result: { videoUrl: url } };
  } catch (err) {
    return { ok: false, ...classifyFalError(err) };
  }
}

export function classifyFalError(err: unknown): { transient: boolean; message: string } {
  if (err instanceof ApiError) {
    const transient = err.status === 429 || err.status === 502 || err.status === 503 || err.status === 504;
    return { transient, message: falErrorMessage(err) };
  }
  // Network errors etc.
  return { transient: true, message: err instanceof Error ? err.message : "Unknown error" };
}

function falErrorMessage(err: ApiError<unknown>): string {
  const body = err.body as { detail?: unknown } | undefined;
  const detail = body?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string; loc?: unknown[] };
    if (first?.msg) return `${first.msg}${first.loc ? ` (${first.loc.join(".")})` : ""}`;
  }
  return err.message || `fal.ai error ${err.status}`;
}
