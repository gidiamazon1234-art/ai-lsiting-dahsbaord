import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Resolve the signed-in user for an API route, or return a 401 response. */
export async function requireUser() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { user: null, supabase, response: jsonError("Not signed in", 401) } as const;
  return { user: data.user, supabase, response: null } as const;
}
