import { describe, expect, it } from "vitest";
import { MODELS, getModel } from "@/lib/config/models";
import { GENERATION_COSTS, generationCost } from "@/lib/config/credits";
import { CAMERA_PRESETS, composePrompt } from "@/lib/config/camera-presets";
import {
  estimateProgress,
  generateRequestSchema,
  isOwnImagePath,
  isTimedOut,
  prepareGeneration,
} from "@/lib/generation-logic";

describe("model registry", () => {
  it("has a price for every model and duration", () => {
    for (const m of MODELS) {
      expect(GENERATION_COSTS[m.id]).toBeDefined();
      expect(generationCost(m.id, 5, "text")).toBeGreaterThan(0);
      expect(generationCost(m.id, 10, "text")).toBeGreaterThan(generationCost(m.id, 5, "text"));
    }
  });

  it("maps text-to-video requests onto each endpoint's schema", () => {
    const req = { prompt: "p", aspectRatio: "9:16" as const, duration: 10 as const };
    expect(getModel("kling-v3")!.buildInput("text", req)).toMatchObject({ prompt: "p", aspect_ratio: "9:16", duration: "10" });
    expect(getModel("wan-2.7")!.buildInput("text", req)).toMatchObject({ aspect_ratio: "9:16", duration: "10", resolution: "720p" });
    const hailuo = getModel("hailuo-2.3")!.buildInput("text", { ...req, duration: 5 });
    expect(hailuo).toEqual({ prompt: "p", duration: "6", prompt_optimizer: false });
  });

  it("maps image-to-video requests (image field names differ per model)", () => {
    const req = { prompt: "p", aspectRatio: "1:1" as const, duration: 5 as const, imageUrl: "https://x/img.png" };
    expect(getModel("kling-v3")!.buildInput("image", req)).toMatchObject({ start_image_url: "https://x/img.png" });
    expect(getModel("kling-v3")!.buildInput("image", req)).not.toHaveProperty("aspect_ratio");
    expect(getModel("hailuo-2.3")!.buildInput("image", req)).toMatchObject({ image_url: "https://x/img.png" });
    expect(getModel("wan-2.7")!.buildInput("image", req)).toMatchObject({ image_url: "https://x/img.png" });
  });

  it("uses distinct text and image endpoints", () => {
    for (const m of MODELS) {
      expect(m.endpoints.text).toMatch(/^fal-ai\/.+text-to-video$/);
      expect(m.endpoints.image).toMatch(/^fal-ai\/.+image-to-video$/);
    }
  });
});

describe("camera presets", () => {
  it("covers the six required moves", () => {
    expect(CAMERA_PRESETS.map((p) => p.id)).toEqual([
      "dolly-in",
      "orbit",
      "crane-up",
      "handheld",
      "zoom-out",
      "product-spin",
    ]);
  });

  it("appends tuned wording to the prompt", () => {
    expect(composePrompt("A red sneaker", "orbit")).toMatch(/^A red sneaker\. Camera: smooth 180-degree orbit/);
    expect(composePrompt("A red sneaker.", "orbit")).toMatch(/^A red sneaker\. Camera:/);
    expect(composePrompt("  A red sneaker  ", null)).toBe("A red sneaker");
    expect(composePrompt("A red sneaker", "unknown")).toBe("A red sneaker");
  });
});

describe("request validation", () => {
  const base = { mode: "text", prompt: "a cat", model: "kling-v3", aspectRatio: "9:16", duration: 5 };

  it("accepts a valid request and prices it", () => {
    const req = generateRequestSchema.parse({ ...base, cameraPreset: "orbit" });
    const prepared = prepareGeneration(req);
    expect(prepared).toMatchObject({ cost: 8, endpoint: "fal-ai/kling-video/v3/standard/text-to-video" });
    expect(prepared.finalPrompt).toContain("orbit");
  });

  it("rejects bad input", () => {
    expect(generateRequestSchema.safeParse({ ...base, duration: 7 }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ ...base, cameraPreset: "barrel-roll" }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ ...base, mode: "image" }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ ...base, prompt: "x".repeat(2001) }).success).toBe(false);
  });

  it("only accepts the user's own upload paths", () => {
    expect(isOwnImagePath("u1/abc.png", "u1")).toBe(true);
    expect(isOwnImagePath("u2/abc.png", "u1")).toBe(false);
    expect(isOwnImagePath("u1/../u2/abc.png", "u1")).toBe(false);
    expect(isOwnImagePath("u1/nested/abc.png", "u1")).toBe(false);
  });
});

describe("progress + timeouts", () => {
  const now = Date.parse("2026-10-10T12:00:00Z");
  const ago = (s: number) => new Date(now - s * 1000).toISOString();

  it("climbs while rendering but never claims 100% early", () => {
    const at = (s: number) =>
      estimateProgress({ status: "processing", queuePosition: null, startedAt: ago(s), modelId: "kling-v3", duration: 5, now });
    expect(at(0)).toBe(10);
    expect(at(60)).toBeGreaterThan(at(10));
    expect(at(10_000)).toBe(95);
    expect(estimateProgress({ status: "completed", queuePosition: null, startedAt: null, modelId: "x", duration: 5 })).toBe(100);
  });

  it("times out stuck jobs", () => {
    expect(isTimedOut(ago(60), true, now)).toBe(false);
    expect(isTimedOut(ago(31 * 60), true, now)).toBe(true);
    expect(isTimedOut(ago(3 * 60), false, now)).toBe(true);
  });
});
