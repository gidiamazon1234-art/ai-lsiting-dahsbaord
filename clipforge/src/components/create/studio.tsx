"use client";

import { useState } from "react";
import Link from "next/link";
import { Coins, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/components/providers/app-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ModelPicker } from "./model-picker";
import { OptionPills, RatioIcon } from "./option-pills";
import { QueuePanel } from "./queue-panel";
import {
  ASPECT_RATIOS,
  DEFAULT_MODEL_ID,
  DURATIONS,
  getModel,
  type AspectRatio,
  type Duration,
  type GenerationMode,
} from "@/lib/config/models";
import { generationCost, LIMITS } from "@/lib/config/credits";
import type { GenerationDTO } from "@/lib/types";

export interface StudioInitialState {
  mode?: GenerationMode;
  prompt?: string;
  model?: string;
  aspectRatio?: AspectRatio;
  duration?: Duration;
  cameraPreset?: string | null;
  templateId?: string | null;
  imagePath?: string | null;
  imagePreviewUrl?: string | null;
  /** Shown above the form, e.g. "Remixing …" or the template name. */
  banner?: string | null;
}

export function Studio({ initial = {} }: { initial?: StudioInitialState }) {
  const { availableCredits, trackJob, refreshAccount } = useAppState();

  const [mode] = useState<GenerationMode>(initial.mode ?? "text");
  const [prompt, setPrompt] = useState(initial.prompt ?? "");
  const [modelId, setModelId] = useState(getModel(initial.model ?? "")?.id ?? DEFAULT_MODEL_ID);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initial.aspectRatio ?? "9:16");
  const [duration, setDuration] = useState<Duration>(initial.duration ?? 5);
  const [submitting, setSubmitting] = useState(false);

  const model = getModel(modelId)!;
  const cost = generationCost(model.id, duration, mode);
  const canAfford = availableCredits === null || availableCredits >= cost;
  const aspectApplies = mode === "text" || model.imageModeUsesAspectRatio;

  function selectModel(id: string) {
    setModelId(id);
    const next = getModel(id)!;
    if (!next.aspectRatios.includes(aspectRatio)) setAspectRatio(next.aspectRatios[0]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (prompt.trim().length < 3) {
      toast.error("Describe your video first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt,
          model: modelId,
          aspectRatio,
          duration,
          templateId: initial.templateId ?? null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.code === "insufficient_credits") {
          toast.error(body.error, { action: { label: "Buy credits", onClick: () => (window.location.href = "/credits") } });
        } else {
          toast.error(body.error ?? "Something went wrong");
        }
        return;
      }
      trackJob(body as GenerationDTO);
      toast.success("Queued! We'll let you know when it's ready.");
      void refreshAccount();
      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
      if (window.innerWidth < 1024) document.getElementById("queue")?.scrollIntoView({ behavior: "smooth" });
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form onSubmit={submit} className="min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Create a video</h1>
          {initial.banner && <p className="mt-1 text-sm text-violet-300">{initial.banner}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={LIMITS.maxPromptLength}
            placeholder="A glass bottle of cold brew on a wet black slate, condensation dripping, moody studio light…"
            className="min-h-[140px] resize-y"
          />
          <p className="text-right text-xs text-muted-foreground">
            {prompt.length}/{LIMITS.maxPromptLength}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Model</Label>
          <ModelPicker value={modelId} onChange={selectModel} duration={duration} mode={mode} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Aspect ratio</Label>
            <OptionPills
              ariaLabel="Aspect ratio"
              value={aspectRatio}
              onChange={setAspectRatio}
              options={ASPECT_RATIOS.map((r) => ({
                value: r,
                label: (
                  <>
                    <RatioIcon ratio={r} /> {r}
                  </>
                ),
                disabled: !aspectApplies || !model.aspectRatios.includes(r),
                title: !model.aspectRatios.includes(r) ? `${model.label} doesn't support ${r}` : undefined,
              }))}
            />
            {!aspectApplies && <p className="text-xs text-muted-foreground">Follows your image&apos;s shape.</p>}
          </div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <OptionPills
              ariaLabel="Duration"
              value={duration}
              onChange={setDuration}
              options={DURATIONS.map((d) => ({ value: d, label: model.durationLabel[d] }))}
            />
          </div>
        </div>

        {/* Generate bar: sticky above the bottom nav on mobile */}
        <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t bg-background/90 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <div className="flex items-center gap-1.5 font-semibold">
                <Coins className="h-4 w-4 text-amber-300" /> {cost} credits
              </div>
              <div className="text-xs text-muted-foreground">
                {availableCredits === null ? "Charged only on success" : `${availableCredits} available`}
              </div>
            </div>
            {canAfford ? (
              <Button type="submit" variant="gradient" size="lg" className="flex-1" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Generate
              </Button>
            ) : (
              <Button asChild variant="gradient" size="lg" className="flex-1">
                <Link href="/credits">Get more credits</Link>
              </Button>
            )}
          </div>
        </div>
      </form>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <QueuePanel />
      </aside>
    </div>
  );
}
