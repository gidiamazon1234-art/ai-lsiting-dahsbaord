import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGeneration, toDTOs } from "@/lib/generations";
import type { GenerationRow } from "@/lib/types";

export const dynamic = "force-dynamic";
// Completing a job copies the video into storage.
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const admin = createAdminClient();
  const { data } = await admin
    .from("generations")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return jsonError("Not found", 404);

  let generation = data as GenerationRow;
  try {
    generation = await syncGeneration(admin, generation);
  } catch (err) {
    // Report last known state; the next poll will retry.
    console.error(`[generation ${generation.id}] sync failed`, err);
  }

  const [dto] = await toDTOs(admin, [generation]);
  return NextResponse.json(dto);
}
