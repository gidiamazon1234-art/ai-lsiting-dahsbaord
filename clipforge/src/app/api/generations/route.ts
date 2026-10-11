import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { toDTOs } from "@/lib/generations";
import type { GenerationRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

/** GET /api/generations?active=1 | ?before=<iso timestamp> */
export async function GET(request: NextRequest) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const admin = createAdminClient();
  const params = request.nextUrl.searchParams;
  let query = admin
    .from("generations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (params.get("active") === "1") query = query.in("status", ["queued", "processing"]);
  const before = params.get("before");
  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load videos" }, { status: 500 });

  const rows = (data ?? []) as GenerationRow[];
  return NextResponse.json({
    generations: await toDTOs(admin, rows),
    nextCursor: rows.length === PAGE_SIZE ? rows[rows.length - 1].created_at : null,
  });
}
