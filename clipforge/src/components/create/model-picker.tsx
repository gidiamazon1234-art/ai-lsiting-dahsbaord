"use client";

import { MODELS, type Duration, type GenerationMode } from "@/lib/config/models";
import { generationCost } from "@/lib/config/credits";
import { cn } from "@/lib/utils";

export function ModelPicker({
  value,
  onChange,
  duration,
  mode,
}: {
  value: string;
  onChange: (id: string) => void;
  duration: Duration;
  mode: GenerationMode;
}) {
  return (
    <div role="radiogroup" aria-label="Model" className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:px-0">
      {MODELS.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={value === m.id}
          onClick={() => onChange(m.id)}
          className={cn(
            "min-w-[220px] snap-start rounded-xl border p-3 text-left transition-colors md:min-w-0",
            value === m.id ? "border-violet-500 bg-violet-500/10" : "bg-secondary/30 hover:bg-secondary/60",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{m.label}</span>
            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-300">
              {generationCost(m.id, duration, mode)} cr
            </span>
          </div>
          {m.badge && <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-violet-300">{m.badge}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
        </button>
      ))}
    </div>
  );
}
