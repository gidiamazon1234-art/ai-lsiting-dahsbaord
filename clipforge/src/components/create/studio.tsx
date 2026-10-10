"use client";

import { useState } from "react";
import Link from "next/link";
import { Coins, ImageIcon, Loader2, Sparkles, Type, Undo2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/components/providers/app-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CameraPresetPicker } from "./camera-preset-picker";
import { ImageUpload, type UploadedImage } from "./image-upload";
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
  const { user, availableCredits, trackJob, refreshAccount } = useAppState();

  const [mode, setMode] = useState<GenerationMode>(initial.mode ?? "text");
  const [prompt, setPrompt] = useState(initial.prompt ?? "");
  const [promptBeforeEnhance, setPromptBeforeEnhance] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<string | null>(initial.cameraPreset ?? null);
  const [image, setImage] = useState<UploadedImage | null>(
    initial.imagePath && initial.imagePreviewUrl ? { path: initial.imagePath, previewUrl: initial.imagePreviewUrl } : null,
  );
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

  async function enhance() {
    if (prompt.trim().length < 2) {
      toast.error("Write a short idea first, e.g. \"perfume bottle on black marble\".");
      return;
    }
    setEnhancing(true);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: prompt, mode, aspectRatio, cameraPreset }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Could not enhance the prompt");
        return;
      }
      setPromptBeforeEnhance(prompt);
      setPrompt(body.prompt);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setEnhancing(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (prompt.trim().length < 3) {
      toast.error("Describe your video first.");
      return;
    }
    if (mode === "image" && !image) {
      toast.error("Upload a product photo first.");
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
          cameraPreset,
          templateId: initial.templateId ?? null,
          imagePath: mode === "image" ? image?.path : null,
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

        <Tabs value={mode} onValueChange={(v) => setMode(v as GenerationMode)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="text">
              <Type /> Text to video
            </TabsTrigger>
            <TabsTrigger value="image">
              <ImageIcon /> Image to video
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "image" && user && (
          <div className="space-y-2">
            <Label>Product photo</Label>
            <ImageUpload userId={user.id} value={image} onChange={setImage} />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <Label htmlFor="prompt">{mode === "image" ? "How should it move?" : "Prompt"}</Label>
            <div className="flex gap-1">
              {promptBeforeEnhance !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPrompt(promptBeforeEnhance);
                    setPromptBeforeEnhance(null);
                  }}
                >
                  <Undo2 /> Undo
                </Button>
              )}
              <Button type="button" variant="secondary" size="sm" onClick={enhance} disabled={enhancing}>
                {enhancing ? <Loader2 className="animate-spin" /> : <Wand2 className="text-violet-300" />}
                Enhance
              </Button>
            </div>
          </div>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setPromptBeforeEnhance(null);
            }}
            maxLength={LIMITS.maxPromptLength}
            placeholder={
              mode === "image"
                ? "The bottle slowly rotates as mist rolls across the table, warm sunrise light…"
                : "A glass bottle of cold brew on a wet black slate, condensation dripping, moody studio light…"
            }
            className="min-h-[140px] resize-y"
          />
          <p className="flex justify-between text-xs text-muted-foreground">
            <span>Tip: type a short idea and hit Enhance.</span>
            <span>
              {prompt.length}/{LIMITS.maxPromptLength}
            </span>
          </p>
        </div>

        <div className="space-y-2">
          <Label>Camera motion</Label>
          <CameraPresetPicker value={cameraPreset} onChange={setCameraPreset} />
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
