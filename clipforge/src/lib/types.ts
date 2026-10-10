import type { AspectRatio, Duration, GenerationMode } from "@/lib/config/models";

export type GenerationStatus = "queued" | "processing" | "completed" | "failed";

export interface GenerationSettings {
  aspect_ratio: AspectRatio;
  duration: Duration;
  camera_preset?: string | null;
  template_id?: string | null;
  image_path?: string | null;
}

/** Row shape of public.generations. */
export interface GenerationRow {
  id: string;
  user_id: string;
  mode: GenerationMode;
  prompt: string;
  final_prompt: string;
  model: string;
  settings: GenerationSettings;
  status: GenerationStatus;
  fal_endpoint: string | null;
  fal_request_id: string | null;
  webhook_token: string;
  queue_position: number | null;
  started_at: string | null;
  video_path: string | null;
  video_url: string | null;
  cost: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/** What the API returns to the browser (no secrets, signed URLs). */
export interface GenerationDTO {
  id: string;
  mode: GenerationMode;
  prompt: string;
  model: string;
  settings: GenerationSettings;
  status: GenerationStatus;
  queuePosition: number | null;
  /** 0-100 estimate. */
  progress: number;
  cost: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  videoUrl: string | null;
  downloadUrl: string | null;
  imageUrl: string | null;
}

export interface TemplateRow {
  id: string;
  title: string;
  description: string;
  category: string;
  mode: GenerationMode;
  prompt: string;
  camera_preset: string | null;
  aspect_ratio: AspectRatio;
  duration: Duration;
  model: string | null;
  cover_gradient: string | null;
  sort_order: number;
}

export interface AccountDTO {
  id: string;
  email: string | null;
  credits: number;
  reservedCredits: number;
}
