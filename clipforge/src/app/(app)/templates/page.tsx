import { TemplateGallery } from "@/components/templates/template-gallery";
import { createClient } from "@/lib/supabase/server";
import type { TemplateRow } from "@/lib/types";

export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const supabase = createClient();
  const { data } = await supabase.from("templates").select("*").order("sort_order", { ascending: true });
  const templates = (data ?? []) as TemplateRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Proven setups for product and social videos. Pick one, make it yours, generate.
        </p>
      </div>
      <TemplateGallery templates={templates} />
    </div>
  );
}
