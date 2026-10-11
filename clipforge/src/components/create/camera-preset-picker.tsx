"use client";

import { Ban } from "lucide-react";
import { CAMERA_PRESETS } from "@/lib/config/camera-presets";
import { cn } from "@/lib/utils";

export function CameraPresetPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const options = [{ id: null, label: "None", emoji: null, description: "Let the model decide" }, ...CAMERA_PRESETS];
  return (
    <div role="radiogroup" aria-label="Camera motion" className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {options.map((p) => (
        <button
          key={p.id ?? "none"}
          type="button"
          role="radio"
          aria-checked={value === p.id}
          title={p.description}
          onClick={() => onChange(p.id)}
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
            value === p.id
              ? "border-violet-500 bg-violet-500/15 text-foreground"
              : "bg-secondary/40 text-muted-foreground hover:bg-secondary",
          )}
        >
          <span className="text-lg leading-none" aria-hidden>
            {p.emoji ?? <Ban className="h-[18px] w-[18px]" />}
          </span>
          {p.label}
        </button>
      ))}
    </div>
  );
}
