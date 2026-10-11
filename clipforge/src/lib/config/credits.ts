/**
 * Credits configuration — the single place to change pricing.
 */
import type { Duration, ModelId } from "./models";

/** Keep in sync with `bonus` in supabase/migrations/0001_init.sql (handle_new_user). */
export const SIGNUP_BONUS_CREDITS = 20;

/** Credits charged per successful generation, by model and duration. */
export const GENERATION_COSTS: Record<ModelId, Record<Duration, number>> = {
  "kling-v3": { 5: 8, 10: 16 },
  "hailuo-2.3": { 5: 6, 10: 10 },
  "wan-2.7": { 5: 4, 10: 8 },
};

/** Extra credits for image-to-video (set to 0 to price both modes the same). */
export const IMAGE_TO_VIDEO_SURCHARGE = 0;

export function generationCost(model: string, duration: Duration, mode: "text" | "image"): number {
  const prices = GENERATION_COSTS[model as ModelId];
  if (!prices) throw new Error(`No price configured for model "${model}"`);
  return prices[duration] + (mode === "image" ? IMAGE_TO_VIDEO_SURCHARGE : 0);
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  /** Price in cents (USD). */
  priceCents: number;
  highlight?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", name: "Starter", credits: 50, priceCents: 500 },
  { id: "creator", name: "Creator", credits: 150, priceCents: 1200, highlight: true },
  { id: "studio", name: "Studio", credits: 500, priceCents: 3500 },
];

export function getPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

/** Generation limits (per user). */
export const LIMITS = {
  /** Max jobs a user can have queued/processing at once. */
  maxActiveJobs: 3,
  /** Max generation submissions per window. */
  generateWindowSeconds: 60,
  generateMaxPerWindow: 5,
  /** Max prompt-enhancer calls per window. */
  enhanceWindowSeconds: 60,
  enhanceMaxPerWindow: 10,
  /** Max prompt length in characters. */
  maxPromptLength: 2000,
};
