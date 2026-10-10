/**
 * Video model registry.
 *
 * To add a model: add an entry to MODELS with its fal.ai endpoint ids and a
 * `buildInput` that maps ClipForge's normalized request onto that endpoint's
 * input schema, then add its prices in ./credits.ts. Nothing else needs to change.
 *
 * Endpoint ids and input fields come from the fal.ai model API pages
 * (and the typed schemas shipped in @fal-ai/client).
 */

export const ASPECT_RATIOS = ["9:16", "1:1", "16:9"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const DURATIONS = [5, 10] as const;
export type Duration = (typeof DURATIONS)[number];

export type GenerationMode = "text" | "image";

export interface NormalizedRequest {
  prompt: string;
  aspectRatio: AspectRatio;
  duration: Duration;
  /** Publicly fetchable URL of the source image (image-to-video only). */
  imageUrl?: string;
  negativePrompt?: string;
}

export interface VideoModel {
  id: string;
  label: string;
  family: "Kling" | "Hailuo" | "Wan";
  description: string;
  badge?: string;
  endpoints: {
    text: string;
    image: string;
  };
  /** Aspect ratios the model can honour. Others are disabled in the UI. */
  aspectRatios: readonly AspectRatio[];
  /** Whether aspect ratio applies to image-to-video (most models follow the source image). */
  imageModeUsesAspectRatio: boolean;
  /** Displayed duration for each ClipForge duration (some models snap, e.g. 5s -> 6s). */
  durationLabel: Record<Duration, string>;
  buildInput: (mode: GenerationMode, req: NormalizedRequest) => Record<string, unknown>;
}

const DEFAULT_NEGATIVE = "blur, distort, low quality, watermark, text artifacts, deformed hands";

export const MODELS = [
  {
    id: "kling-v3",
    label: "Kling 3.0",
    family: "Kling",
    description: "Best motion realism and prompt adherence. Great for product hero shots.",
    badge: "Best quality",
    endpoints: {
      text: "fal-ai/kling-video/v3/standard/text-to-video",
      image: "fal-ai/kling-video/v3/standard/image-to-video",
    },
    aspectRatios: ASPECT_RATIOS,
    imageModeUsesAspectRatio: false,
    durationLabel: { 5: "5s", 10: "10s" },
    buildInput: (mode, req) => {
      const base = {
        prompt: req.prompt,
        duration: String(req.duration),
        negative_prompt: req.negativePrompt ?? DEFAULT_NEGATIVE,
        generate_audio: false,
      };
      return mode === "image"
        ? { ...base, start_image_url: req.imageUrl }
        : { ...base, aspect_ratio: req.aspectRatio };
    },
  },
  {
    id: "hailuo-2.3",
    label: "Hailuo 2.3",
    family: "Hailuo",
    description: "MiniMax's model. Strong physics and dynamic camera work, 768p.",
    badge: "Dynamic",
    endpoints: {
      text: "fal-ai/minimax/hailuo-2.3/standard/text-to-video",
      image: "fal-ai/minimax/hailuo-2.3/standard/image-to-video",
    },
    // Hailuo renders a fixed 16:9 frame for text-to-video.
    aspectRatios: ["16:9"],
    imageModeUsesAspectRatio: false,
    durationLabel: { 5: "6s", 10: "10s" },
    buildInput: (mode, req) => {
      const base = {
        prompt: req.prompt,
        // Hailuo supports 6s or 10s only.
        duration: req.duration === 10 ? "10" : "6",
        prompt_optimizer: false,
      };
      return mode === "image" ? { ...base, image_url: req.imageUrl } : base;
    },
  },
  {
    id: "wan-2.7",
    label: "Wan 2.7",
    family: "Wan",
    description: "Fast and affordable open model. Good for drafts and social loops.",
    badge: "Cheapest",
    endpoints: {
      text: "fal-ai/wan/v2.7/text-to-video",
      image: "fal-ai/wan/v2.7/image-to-video",
    },
    aspectRatios: ASPECT_RATIOS,
    imageModeUsesAspectRatio: false,
    durationLabel: { 5: "5s", 10: "10s" },
    buildInput: (mode, req) => {
      const base = {
        prompt: req.prompt,
        duration: String(req.duration),
        resolution: "720p",
        negative_prompt: req.negativePrompt ?? DEFAULT_NEGATIVE,
        enable_prompt_expansion: false,
        enable_safety_checker: true,
      };
      return mode === "image"
        ? { ...base, image_url: req.imageUrl }
        : { ...base, aspect_ratio: req.aspectRatio };
    },
  },
] as const satisfies readonly VideoModel[];

export type ModelId = (typeof MODELS)[number]["id"];

export const DEFAULT_MODEL_ID: ModelId = "kling-v3";

export function getModel(id: string): VideoModel | undefined {
  return (MODELS as readonly VideoModel[]).find((m) => m.id === id);
}

export function isModelId(id: string): id is ModelId {
  return getModel(id) !== undefined;
}
