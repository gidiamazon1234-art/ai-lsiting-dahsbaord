import { NextResponse, type NextRequest } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModel } from "@/lib/config/models";
import { LIMITS } from "@/lib/config/credits";
import { generateRequestSchema, isOwnImagePath, prepareGeneration } from "@/lib/generation-logic";
import { failGeneration, toDTOs } from "@/lib/generations";
import { submitToFal } from "@/lib/fal";
import { rateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";
import type { GenerationRow, GenerationSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

/** fal.ai needs to fetch the source image while the job sits in its queue. */
const INPUT_IMAGE_URL_TTL_SECONDS = 60 * 60 * 24;

export async function POST(request: NextRequest) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const parsed = generateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }
  const req = parsed.data;

  const admin = createAdminClient();
  const allowed = await rateLimit(admin, `generate:${user.id}`, LIMITS.generateWindowSeconds, LIMITS.generateMaxPerWindow);
  if (!allowed) return jsonError("You're generating too fast. Please wait a minute and try again.", 429);

  let prepared;
  try {
    prepared = prepareGeneration(req);
  } catch (err) {
    return jsonError((err as Error).message, 400);
  }

  let imageUrl: string | undefined;
  if (req.mode === "image") {
    if (!req.imagePath || !isOwnImagePath(req.imagePath, user.id)) return jsonError("Invalid image", 400);
    const { data, error } = await admin.storage
      .from("inputs")
      .createSignedUrl(req.imagePath, INPUT_IMAGE_URL_TTL_SECONDS);
    if (error || !data) return jsonError("Uploaded image not found. Please upload it again.", 400);
    imageUrl = data.signedUrl;
  }

  const settings: GenerationSettings = {
    aspect_ratio: prepared.aspectRatio,
    duration: prepared.duration,
    camera_preset: req.cameraPreset ?? null,
    template_id: req.templateId ?? null,
    image_path: req.mode === "image" ? req.imagePath : null,
  };

  // Atomically reserve credits + create the job row.
  const { data: created, error: createError } = await admin.rpc("create_generation", {
    p_user_id: user.id,
    p_mode: req.mode,
    p_prompt: req.prompt,
    p_final_prompt: prepared.finalPrompt,
    p_model: prepared.model,
    p_settings: settings,
    p_cost: prepared.cost,
    p_max_active: LIMITS.maxActiveJobs,
  });
  if (createError) {
    if (createError.message.includes("insufficient_credits")) {
      return jsonError(`Not enough credits. This video costs ${prepared.cost} credits.`, 402, { code: "insufficient_credits" });
    }
    if (createError.message.includes("too_many_active_jobs")) {
      return jsonError(`You can run up to ${LIMITS.maxActiveJobs} videos at once. Wait for one to finish.`, 429);
    }
    console.error("create_generation failed", createError);
    return jsonError("Could not start the generation.", 500);
  }
  const generation = created as GenerationRow;

  // Submit to fal.ai's queue.
  const model = getModel(prepared.model)!;
  const input = model.buildInput(req.mode, {
    prompt: prepared.finalPrompt,
    aspectRatio: prepared.aspectRatio,
    duration: prepared.duration,
    imageUrl,
  });

  const appUrl = serverEnv.appUrl();
  // fal.ai can't call back into localhost; polling via /api/status covers that case.
  const webhookUrl = appUrl.startsWith("https://")
    ? `${appUrl}/api/webhooks/fal?id=${generation.id}&token=${generation.webhook_token}`
    : undefined;

  try {
    const { requestId, queuePosition } = await submitToFal(prepared.endpoint, input, webhookUrl);
    const { data: updated } = await admin
      .from("generations")
      .update({ fal_endpoint: prepared.endpoint, fal_request_id: requestId, queue_position: queuePosition })
      .eq("id", generation.id)
      .select("*")
      .single();
    const [dto] = await toDTOs(admin, [(updated as GenerationRow) ?? generation]);
    return NextResponse.json(dto, { status: 201 });
  } catch (err) {
    console.error(`[generation ${generation.id}] fal submit failed`, err);
    await failGeneration(admin, generation.id, "The video provider rejected the request.");
    return jsonError("The video provider rejected the request. No credits were charged.", 502);
  }
}
