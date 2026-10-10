"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Download, Loader2, Play, Repeat2, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { getCameraPreset } from "@/lib/config/camera-presets";
import { getModel } from "@/lib/config/models";
import type { GenerationDTO } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export function VideoCard({ generation: g, onDelete }: { generation: GenerationDTO; onDelete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const model = getModel(g.model);
  const preset = getCameraPreset(g.settings.camera_preset);
  const running = g.status === "queued" || g.status === "processing";
  const ready = g.status === "completed" && !!g.videoUrl;

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setDeleting(true);
    await onDelete();
    setDeleting(false);
    setOpen(false);
  }

  const actions = (
    <div className="flex gap-1.5">
      {ready && (
        <Button asChild size="sm" variant="secondary" className="flex-1">
          <a href={g.downloadUrl ?? g.videoUrl!} download aria-label="Download MP4">
            <Download /> <span className="hidden sm:inline">MP4</span>
          </a>
        </Button>
      )}
      <Button asChild size="sm" variant="secondary" className="flex-1" aria-label="Remix">
        <Link href={`/create?remix=${g.id}`}>
          <Repeat2 /> <span className="hidden sm:inline">Remix</span>
        </Link>
      </Button>
      {!running && (
        <Button
          size="sm"
          variant={confirming ? "destructive" : "secondary"}
          onClick={handleDelete}
          disabled={deleting}
          aria-label={confirming ? "Confirm delete" : "Delete"}
        >
          {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
          {confirming && <span className="text-xs">Sure?</span>}
        </Button>
      )}
    </div>
  );

  return (
    <>
      <article className="flex flex-col overflow-hidden rounded-xl border bg-card">
        <button
          type="button"
          onClick={() => ready && setOpen(true)}
          disabled={!ready}
          className="group relative aspect-[9/12] w-full overflow-hidden bg-black"
          aria-label={ready ? "Play video" : undefined}
        >
          {ready ? (
            <>
              <video
                src={`${g.videoUrl}#t=0.1`}
                preload="metadata"
                muted
                playsInline
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-80 transition-opacity group-hover:opacity-100">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 backdrop-blur">
                  <Play className="h-5 w-5 fill-white text-white" />
                </span>
              </span>
            </>
          ) : g.status === "failed" ? (
            <span className="flex h-full flex-col items-center justify-center gap-2 bg-red-950/20 p-3 text-xs text-red-300">
              <XCircle className="h-7 w-7" />
              Failed · no credits charged
            </span>
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-violet-950/70 to-fuchsia-950/30 p-4 text-xs text-violet-200">
              {g.status === "queued" ? <Clock className="h-7 w-7 animate-pulse" /> : <Loader2 className="h-7 w-7 animate-spin" />}
              {g.status === "queued" ? "In queue" : "Rendering"} · {g.progress}%
              <Progress value={g.progress} className="w-3/4" />
            </span>
          )}
          <Badge variant="secondary" className="absolute left-2 top-2 bg-black/60 backdrop-blur">
            {g.settings.aspect_ratio}
          </Badge>
        </button>
        <div className="flex flex-1 flex-col gap-2 p-2.5">
          <p className="line-clamp-2 text-xs text-muted-foreground">{g.prompt}</p>
          <div className="mt-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="truncate">{model?.label ?? g.model}</span>·<span>{timeAgo(g.createdAt)}</span>
          </div>
          {actions}
        </div>
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>{model?.label ?? g.model}</DialogTitle>
          {ready && (
            <video
              src={g.videoUrl!}
              controls
              autoPlay
              loop
              playsInline
              className={cn("w-full rounded-lg bg-black", g.settings.aspect_ratio === "9:16" ? "max-h-[65dvh]" : "max-h-[60dvh]")}
            />
          )}
          <DialogDescription className="whitespace-pre-wrap">{g.prompt}</DialogDescription>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{g.mode === "image" ? "Image → video" : "Text → video"}</Badge>
            <Badge variant="outline">{g.settings.aspect_ratio}</Badge>
            <Badge variant="outline">{model?.durationLabel[g.settings.duration] ?? `${g.settings.duration}s`}</Badge>
            {preset && <Badge variant="outline">{preset.label}</Badge>}
            <Badge variant="warning">{g.cost} credits</Badge>
          </div>
          {actions}
        </DialogContent>
      </Dialog>
    </>
  );
}
