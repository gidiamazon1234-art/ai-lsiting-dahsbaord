import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyFalError, getFalResult, getFalStatus } from "@/lib/fal";
import { estimateProgress, isTimedOut } from "@/lib/generation-logic";
import type { GenerationDTO, GenerationRow } from "@/lib/types";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export function isActive(g: Pick<GenerationRow, "status">) {
  return g.status === "queued" || g.status === "processing";
}

async function completeGeneration(admin: SupabaseClient, g: GenerationRow, videoUrl: string) {
  // Copy the file into our own bucket: provider URLs are not permanent.
  let videoPath: string | null = null;
  try {
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const path = `${g.user_id}/${g.id}.mp4`;
    const { error } = await admin.storage.from("videos").upload(path, bytes, {
      contentType: "video/mp4",
      upsert: true,
    });
    if (error) throw error;
    videoPath = path;
  } catch (err) {
    // Still a successful generation: fall back to serving the provider URL.
    console.error(`[generation ${g.id}] could not copy video to storage`, err);
  }

  const { data, error } = await admin.rpc("complete_generation", {
    p_generation_id: g.id,
    p_video_path: videoPath,
    p_video_url: videoUrl,
  });
  if (error) throw error;
  return (data as GenerationRow | null)?.id ? (data as GenerationRow) : null;
}

export async function failGeneration(admin: SupabaseClient, id: string, message: string) {
  const { data, error } = await admin.rpc("fail_generation", { p_generation_id: id, p_error: message });
  if (error) throw error;
  return (data as GenerationRow | null)?.id ? (data as GenerationRow) : null;
}

async function reload(admin: SupabaseClient, id: string) {
  const { data } = await admin.from("generations").select("*").eq("id", id).single();
  return data as GenerationRow;
}

/**
 * Bring a generation up to date with fal.ai. Safe to call concurrently
 * (status poll + webhook): the completion/failure functions are idempotent.
 */
export async function syncGeneration(admin: SupabaseClient, g: GenerationRow): Promise<GenerationRow> {
  if (!isActive(g)) return g;

  if (isTimedOut(g.created_at, !!g.fal_request_id)) {
    await failGeneration(admin, g.id, "Timed out waiting for the model.");
    return reload(admin, g.id);
  }
  if (!g.fal_request_id || !g.fal_endpoint) return g;

  let status;
  try {
    status = await getFalStatus(g.fal_endpoint, g.fal_request_id);
  } catch (err) {
    const { transient, message } = classifyFalError(err);
    if (!transient) {
      await failGeneration(admin, g.id, message);
      return reload(admin, g.id);
    }
    return g;
  }

  if (status.status === "IN_QUEUE") {
    if (status.queue_position !== g.queue_position) {
      await admin.from("generations").update({ queue_position: status.queue_position }).eq("id", g.id);
      return { ...g, queue_position: status.queue_position };
    }
    return g;
  }

  if (status.status === "IN_PROGRESS") {
    if (g.status !== "processing") {
      const patch = { status: "processing" as const, queue_position: null, started_at: g.started_at ?? new Date().toISOString() };
      await admin.from("generations").update(patch).eq("id", g.id).in("status", ["queued", "processing"]);
      return { ...g, ...patch };
    }
    return g;
  }

  // COMPLETED: fetch the output (or the error).
  const result = await getFalResult(g.fal_endpoint, g.fal_request_id);
  if (result.ok) {
    await completeGeneration(admin, g, result.result.videoUrl);
  } else if (!result.transient) {
    await failGeneration(admin, g.id, result.message);
  } else {
    return g;
  }
  return reload(admin, g.id);
}

/** Convert rows to browser-safe DTOs with short-lived signed URLs. */
export async function toDTOs(admin: SupabaseClient, rows: GenerationRow[]): Promise<GenerationDTO[]> {
  const videoPaths = rows.map((r) => r.video_path).filter((p): p is string => !!p);
  const imagePaths = rows.map((r) => r.settings?.image_path).filter((p): p is string => !!p);

  const [videos, downloads, images] = await Promise.all([
    videoPaths.length
      ? admin.storage.from("videos").createSignedUrls(videoPaths, SIGNED_URL_TTL_SECONDS)
      : Promise.resolve({ data: [] }),
    videoPaths.length
      ? admin.storage.from("videos").createSignedUrls(videoPaths, SIGNED_URL_TTL_SECONDS, { download: true })
      : Promise.resolve({ data: [] }),
    imagePaths.length
      ? admin.storage.from("inputs").createSignedUrls(imagePaths, SIGNED_URL_TTL_SECONDS)
      : Promise.resolve({ data: [] }),
  ]);

  const lookup = (list: { path: string | null; signedUrl: string | null }[] | null | undefined) =>
    new Map((list ?? []).filter((x) => x.path && x.signedUrl).map((x) => [x.path as string, x.signedUrl as string]));
  const videoMap = lookup(videos.data);
  const downloadMap = lookup(downloads.data);
  const imageMap = lookup(images.data);

  return rows.map((r) => {
    const fallback = r.status === "completed" ? r.video_url : null;
    return {
      id: r.id,
      mode: r.mode,
      prompt: r.prompt,
      model: r.model,
      settings: r.settings,
      status: r.status,
      queuePosition: r.queue_position,
      progress: estimateProgress({
        status: r.status,
        queuePosition: r.queue_position,
        startedAt: r.started_at,
        modelId: r.model,
        duration: r.settings?.duration ?? 5,
      }),
      cost: r.cost,
      error: r.error,
      createdAt: r.created_at,
      completedAt: r.completed_at,
      videoUrl: (r.video_path && videoMap.get(r.video_path)) || fallback,
      downloadUrl: (r.video_path && downloadMap.get(r.video_path)) || fallback,
      imageUrl: (r.settings?.image_path && imageMap.get(r.settings.image_path)) || null,
    };
  });
}
