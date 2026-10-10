"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, ImageIcon, Type } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCameraPreset } from "@/lib/config/camera-presets";
import { getModel } from "@/lib/config/models";
import type { TemplateRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TemplateGallery({ templates }: { templates: TemplateRow[] }) {
  const categories = ["All", ...Array.from(new Set(templates.map((t) => t.category)))];
  const [category, setCategory] = useState("All");
  const visible = category === "All" ? templates : templates.filter((t) => t.category === category);

  if (templates.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No templates yet. Run <code className="rounded bg-secondary px-1">supabase/seed.sql</code> to add the starter set.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              category === c ? "border-violet-500 bg-violet-500/15" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((t) => {
          const preset = getCameraPreset(t.camera_preset);
          const model = t.model ? getModel(t.model) : undefined;
          return (
            <article key={t.id} className="group flex flex-col overflow-hidden rounded-2xl border bg-card">
              <div className={cn("relative flex h-40 items-center justify-center bg-gradient-to-br", t.cover_gradient ?? "from-violet-500/40 to-transparent")}>
                <div
                  className={cn(
                    "rounded-lg border-2 border-white/50 bg-white/5 backdrop-blur-sm transition-transform group-hover:scale-105",
                    t.aspect_ratio === "9:16" ? "h-28 w-16" : t.aspect_ratio === "1:1" ? "h-24 w-24" : "h-20 w-32",
                  )}
                />
                <span className="absolute left-3 top-3 text-4xl drop-shadow" aria-hidden>
                  {preset?.emoji ?? "🎬"}
                </span>
                <Badge variant="secondary" className="absolute right-3 top-3 bg-black/50 backdrop-blur">
                  {t.category}
                </Badge>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h2 className="font-semibold">{t.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                </div>
                <p className="line-clamp-3 rounded-lg bg-secondary/50 p-2.5 text-xs italic text-muted-foreground">
                  “{t.prompt}”
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">
                    {t.mode === "image" ? <ImageIcon className="h-3 w-3" /> : <Type className="h-3 w-3" />}
                    {t.mode === "image" ? "Image → video" : "Text → video"}
                  </Badge>
                  {preset && (
                    <Badge variant="outline">
                      <Camera className="h-3 w-3" /> {preset.label}
                    </Badge>
                  )}
                  <Badge variant="outline">{t.aspect_ratio}</Badge>
                  {model && <Badge variant="outline">{model.label}</Badge>}
                </div>
                <Button asChild variant="gradient" className="mt-auto w-full">
                  <Link href={`/create?template=${encodeURIComponent(t.id)}`}>
                    Use template <ArrowRight />
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
