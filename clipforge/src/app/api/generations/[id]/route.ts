import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { isActive } from "@/lib/generations";
import type { GenerationRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const admin = createAdminClient();
  const { data } = await admin
    .from("generations")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const generation = data as GenerationRow | null;
  if (!generation) return jsonError("Not found", 404);
  if (isActive(generation)) return jsonError("This video is still generating. Delete it once it finishes.", 409);

  if (generation.video_path) {
    await admin.storage.from("videos").remove([generation.video_path]);
  }
  const { error } = await admin.from("generations").delete().eq("id", generation.id).eq("user_id", user.id);
  if (error) return jsonError("Could not delete the video", 500);

  return NextResponse.json({ ok: true });
}
