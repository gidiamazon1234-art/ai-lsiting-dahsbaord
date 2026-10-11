"use client";

import { cn } from "@/lib/utils";

export interface PillOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
  title?: string;
}

export function OptionPills<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex gap-2">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          disabled={opt.disabled}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35",
            value === opt.value
              ? "border-violet-500 bg-violet-500/15 text-foreground"
              : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Small rectangle icon showing an aspect ratio. */
export function RatioIcon({ ratio }: { ratio: string }) {
  const [w, h] = ratio.split(":").map(Number);
  const scale = 14 / Math.max(w, h);
  return (
    <span
      aria-hidden
      className="inline-block rounded-[3px] border-2 border-current"
      style={{ width: Math.round(w * scale), height: Math.round(h * scale) }}
    />
  );
}
