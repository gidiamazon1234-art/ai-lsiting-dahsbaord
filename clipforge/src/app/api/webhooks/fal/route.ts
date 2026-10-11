import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGeneration } from "@/lib/generations";
import type { GenerationRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function tokensMatch(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * fal.ai calls this when a queued job finishes.
 *
 * The URL carries a per-generation random token, and we never trust the
 * payload: the webhook only triggers a sync, which re-reads the job's status
 * and output straight from fal.ai's API with our server key.
 */
export async function POST(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const token = request.nextUrl.searchParams.get("token");
  if (!id || !token) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin.from("generations").select("*").eq("id", id).maybeSingle();
  const generation = data as GenerationRow | null;
  if (!generation || !tokensMatch(generation.webhook_token, token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { request_id?: string } | null;
  if (body?.request_id && generation.fal_request_id && body.request_id !== generation.fal_request_id) {
    return NextResponse.json({ error: "Request mismatch" }, { status: 400 });
  }

  try {
    const updated = await syncGeneration(admin, generation);
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (err) {
    console.error(`[generation ${id}] webhook sync failed`, err);
    // Non-2xx makes fal.ai retry the webhook.
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
