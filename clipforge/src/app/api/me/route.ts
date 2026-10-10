import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import type { AccountDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, supabase, response } = await requireUser();
  if (!user) return response;

  const { data, error } = await supabase
    .from("users")
    .select("id, email, credits, reserved_credits")
    .eq("id", user.id)
    .single();
  if (error || !data) return jsonError("Account not found", 404);

  const body: AccountDTO = {
    id: data.id,
    email: data.email,
    credits: data.credits,
    reservedCredits: data.reserved_credits,
  };
  return NextResponse.json(body);
}
