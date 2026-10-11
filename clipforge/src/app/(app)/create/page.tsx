import { Studio, type StudioInitialState } from "@/components/create/studio";
import { createClient } from "@/lib/supabase/server";
import type { GenerationRow, TemplateRow } from "@/lib/types";

export const metadata = { title: "Create" };

async function loadInitialState(searchParams: { template?: string; remix?: string }): Promise<StudioInitialState> {
  const supabase = createClient();

  if (searchParams.remix) {
    // RLS limits this to the signed-in user's own generations.
    const { data } = await supabase.from("generations").select("*").eq("id", searchParams.remix).maybeSingle();
    const g = data as GenerationRow | null;
    if (g) {
      let imagePreviewUrl: string | null = null;
      if (g.mode === "image" && g.settings.image_path) {
        const { data: signed } = await supabase.storage.from("inputs").createSignedUrl(g.settings.image_path, 3600);
        imagePreviewUrl = signed?.signedUrl ?? null;
      }
      return {
        mode: g.mode,
        prompt: g.prompt,
        model: g.model,
        aspectRatio: g.settings.aspect_ratio,
        duration: g.settings.duration,
        cameraPreset: g.settings.camera_preset ?? null,
        templateId: g.settings.template_id ?? null,
        imagePath: imagePreviewUrl ? g.settings.image_path : null,
        imagePreviewUrl,
        banner: "Remixing a previous video — tweak anything and generate again.",
      };
    }
  }

  if (searchParams.template) {
    const { data } = await supabase.from("templates").select("*").eq("id", searchParams.template).maybeSingle();
    const t = data as TemplateRow | null;
    if (t) {
      return {
        mode: t.mode,
        prompt: t.prompt,
        model: t.model ?? undefined,
        aspectRatio: t.aspect_ratio,
        duration: t.duration,
        cameraPreset: t.camera_preset,
        templateId: t.id,
        banner:
          t.mode === "image"
            ? `Template: ${t.title} — upload your product photo to start.`
            : `Template: ${t.title} — make the prompt your own.`,
      };
    }
  }

  return {};
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: { template?: string; remix?: string };
}) {
  const initial = await loadInitialState(searchParams);
  return <Studio key={`${searchParams.template ?? ""}:${searchParams.remix ?? ""}`} initial={initial} />;
}
