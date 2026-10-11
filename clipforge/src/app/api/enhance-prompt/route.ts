import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, requireUser } from "@/lib/api";
import { anthropic, ENHANCER_MODEL } from "@/lib/claude";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { LIMITS } from "@/lib/config/credits";
import { getCameraPreset } from "@/lib/config/camera-presets";
import { ASPECT_RATIOS } from "@/lib/config/models";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const bodySchema = z.object({
  idea: z.string().trim().min(2, "Write a short idea first").max(1000),
  mode: z.enum(["text", "image"]).default("text"),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
  cameraPreset: z.string().nullish(),
});

const SYSTEM_PROMPT = `You are a director of photography who writes prompts for AI video models (Kling, Hailuo, Wan).
Rewrite the user's short idea into one detailed, cinematic prompt for a 5-10 second product or social video.

Write a single paragraph of 50-90 words, in plain English, describing:
- the subject and its key visual details (materials, colors, textures, branding kept generic)
- the setting and background
- lighting (direction, quality, color temperature) and mood
- one clear, physically plausible action or motion that fits in a few seconds
- visual style (e.g. premium commercial, authentic UGC, editorial)

Rules: keep everything the user specified. Do not invent brand names, logos or on-screen text. Describe one continuous shot, not a sequence of scenes. No lists, no headings, no quotation marks, no preamble. Output only the prompt.`;

export async function POST(request: NextRequest) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  const { idea, mode, aspectRatio, cameraPreset } = parsed.data;

  const allowed = await rateLimit(
    createAdminClient(),
    `enhance:${user.id}`,
    LIMITS.enhanceWindowSeconds,
    LIMITS.enhanceMaxPerWindow,
  );
  if (!allowed) return jsonError("Too many enhance requests. Try again in a minute.", 429);

  const preset = getCameraPreset(cameraPreset);
  const context = [
    mode === "image"
      ? "The video animates an uploaded product photo: describe motion and atmosphere that build on the image rather than re-describing a different product."
      : null,
    aspectRatio ? `Frame: ${aspectRatio}${aspectRatio === "9:16" ? " vertical, for TikTok/Reels" : ""}.` : null,
    preset
      ? `Camera movement is added separately (${preset.label}), so do not describe camera movement.`
      : "Include a simple camera movement that suits the shot.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const message = await anthropic().beta.messages.create({
      model: ENHANCER_MODEL,
      max_tokens: 2000,
      output_config: { effort: "low" },
      // If a safety classifier declines, retry on a fallback model server-side.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `${context}\n\nIdea: ${idea}` }],
    });

    if (message.stop_reason === "refusal") {
      return jsonError("This idea can't be enhanced. Try rephrasing it.", 422);
    }
    const text = message.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!text) return jsonError("The enhancer returned nothing. Please try again.", 502);

    return NextResponse.json({ prompt: text });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return jsonError("The prompt enhancer is busy. Try again in a moment.", 503);
    }
    if (err instanceof Anthropic.APIError) {
      console.error("enhance-prompt: Anthropic API error", err.status, err.message);
      return jsonError("The prompt enhancer is unavailable right now.", 502);
    }
    console.error("enhance-prompt failed", err);
    return jsonError("The prompt enhancer is unavailable right now.", 502);
  }
}
