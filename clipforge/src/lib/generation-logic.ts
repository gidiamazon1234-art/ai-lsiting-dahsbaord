/**
 * Pure helpers for the generation pipeline (no I/O), unit-tested in tests/.
 */
import { z } from "zod";
import { ASPECT_RATIOS, getModel, type AspectRatio, type Duration, type ModelId } from "@/lib/config/models";
import { generationCost, LIMITS } from "@/lib/config/credits";
import { CAMERA_PRESETS, composePrompt } from "@/lib/config/camera-presets";
import type { GenerationStatus } from "@/lib/types";

export const generateRequestSchema = z
  .object({
    mode: z.enum(["text", "image"]),
    prompt: z.string().trim().min(3, "Prompt is too short").max(LIMITS.maxPromptLength, "Prompt is too long"),
    model: z.string().refine((id) => !!getModel(id), "Unknown model"),
    aspectRatio: z.enum(ASPECT_RATIOS),
    duration: z.union([z.literal(5), z.literal(10)]),
    cameraPreset: z
      .string()
      .nullish()
      .refine((id) => !id || CAMERA_PRESETS.some((p) => p.id === id), "Unknown camera preset"),
    templateId: z.string().max(100).nullish(),
    imagePath: z.string().max(500).nullish(),
  })
  .refine((v) => v.mode === "text" || !!v.imagePath, {
    message: "Upload an image for image-to-video",
    path: ["imagePath"],
  });

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export interface PreparedGeneration {
  model: ModelId;
  endpoint: string;
  finalPrompt: string;
  cost: number;
  aspectRatio: AspectRatio;
  duration: Duration;
}

/** Resolve model, endpoint, final prompt and cost. Throws on unsupported combos. */
export function prepareGeneration(req: GenerateRequest): PreparedGeneration {
  const model = getModel(req.model);
  if (!model) throw new Error("Unknown model");
  if (req.mode === "text" && !model.aspectRatios.includes(req.aspectRatio)) {
    throw new Error(`${model.label} does not support ${req.aspectRatio}`);
  }
  return {
    model: model.id as ModelId,
    endpoint: model.endpoints[req.mode],
    finalPrompt: composePrompt(req.prompt, req.cameraPreset),
    cost: generationCost(model.id, req.duration, req.mode),
    aspectRatio: req.aspectRatio,
    duration: req.duration,
  };
}

/** Is an uploaded image path owned by this user? Paths are "<userId>/<file>". */
export function isOwnImagePath(path: string, userId: string) {
  return path.startsWith(`${userId}/`) && !path.includes("..") && path.split("/").length === 2;
}

/**
 * Progress estimate (0-100). fal.ai doesn't report percentages for these models,
 * so we use queue position while queued and an asymptotic curve while rendering.
 */
export function estimateProgress(opts: {
  status: GenerationStatus;
  queuePosition: number | null;
  startedAt: string | null;
  modelId: string;
  duration: number;
  now?: number;
}): number {
  const { status } = opts;
  if (status === "completed") return 100;
  if (status === "failed") return 0;
  if (status === "queued" || !opts.startedAt) {
    const pos = opts.queuePosition ?? 0;
    return Math.max(2, 8 - Math.min(pos, 6));
  }
  const typical = (getModel(opts.modelId)?.typicalSeconds ?? 120) * (opts.duration >= 10 ? 1.8 : 1);
  const elapsed = Math.max(0, ((opts.now ?? Date.now()) - new Date(opts.startedAt).getTime()) / 1000);
  const pct = 10 + 85 * (1 - Math.exp((-1.6 * elapsed) / typical));
  return Math.min(95, Math.round(pct));
}

/** Jobs stuck longer than this are failed (and their credits released). */
export const JOB_TIMEOUT_MS = 30 * 60 * 1000;
/** A job that never got a fal request id (crash mid-submit) is abandoned after this. */
export const SUBMIT_TIMEOUT_MS = 2 * 60 * 1000;

export function isTimedOut(createdAt: string, hasRequestId: boolean, now = Date.now()) {
  const age = now - new Date(createdAt).getTime();
  return hasRequestId ? age > JOB_TIMEOUT_MS : age > SUBMIT_TIMEOUT_MS;
}
