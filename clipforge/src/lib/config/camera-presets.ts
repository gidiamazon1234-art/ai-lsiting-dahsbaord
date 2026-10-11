/**
 * Camera motion presets. Each preset appends tuned wording to the user's prompt.
 * Add a preset by adding an entry here; the UI picks it up automatically.
 */
export interface CameraPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** Appended to the prompt sent to the model. */
  promptSuffix: string;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: "dolly-in",
    label: "Dolly In",
    emoji: "🎯",
    description: "Smooth push toward the subject",
    promptSuffix:
      "Camera: slow, smooth dolly-in toward the subject on a stabilized track, steady forward motion, subject grows in frame, shallow depth of field, cinematic.",
  },
  {
    id: "orbit",
    label: "Orbit",
    emoji: "🪐",
    description: "Arc around the subject",
    promptSuffix:
      "Camera: smooth 180-degree orbit around the subject at eye level, constant distance, subject stays centered, parallax in the background, cinematic.",
  },
  {
    id: "crane-up",
    label: "Crane Up",
    emoji: "🏗️",
    description: "Rise up and reveal",
    promptSuffix:
      "Camera: crane shot rising vertically from low angle to high angle, gradually revealing the scene, smooth and weightless motion, epic reveal.",
  },
  {
    id: "handheld",
    label: "Handheld",
    emoji: "🤳",
    description: "Authentic UGC feel",
    promptSuffix:
      "Camera: handheld smartphone footage, subtle natural shake and micro-movements, authentic user-generated content feel, slight focus breathing.",
  },
  {
    id: "zoom-out",
    label: "Zoom Out",
    emoji: "🔭",
    description: "Pull back to wide",
    promptSuffix:
      "Camera: slow continuous zoom out from a tight close-up to a wide shot, revealing the full environment around the subject, smooth optical zoom.",
  },
  {
    id: "product-spin",
    label: "Product Spin",
    emoji: "🔄",
    description: "360° turntable",
    promptSuffix:
      "Camera: locked-off static camera, the product rotates 360 degrees on a turntable at a slow constant speed, centered in frame, clean studio lighting, seamless background.",
  },
];

export function getCameraPreset(id: string | null | undefined): CameraPreset | undefined {
  if (!id) return undefined;
  return CAMERA_PRESETS.find((p) => p.id === id);
}

/** Combine the user prompt with the preset's tuned wording. */
export function composePrompt(prompt: string, cameraPresetId?: string | null): string {
  const trimmed = prompt.trim();
  const preset = getCameraPreset(cameraPresetId);
  if (!preset) return trimmed;
  const sep = /[.!?]$/.test(trimmed) ? " " : ". ";
  return `${trimmed}${sep}${preset.promptSuffix}`;
}
