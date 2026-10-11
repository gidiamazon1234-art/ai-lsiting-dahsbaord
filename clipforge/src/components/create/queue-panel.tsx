"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Download, Film, Loader2, XCircle } from "lucide-react";
import { useAppState } from "@/components/providers/app-state";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getModel } from "@/lib/config/models";
import type { GenerationDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

function statusLabel(job: GenerationDTO) {
  switch (job.status) {
    case "queued":
      return job.queuePosition ? `In queue · #${job.queuePosition}` : "In queue";
    case "processing":
      return "Rendering";
    case "completed":
      return "Ready";
    case "failed":
      return "Failed · no credits charged";
  }
}

export function QueuePanel() {
  const { activeJobs } = useAppState();

  return (
    <section id="queue" aria-label="Generation queue" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Queue</h2>
        <Link href="/library" className="text-xs text-violet-300 hover:underline">
          Open library
        </Link>
      </div>

      {activeJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <Film className="mb-2 h-6 w-6" />
          Your videos will appear here while they render. You can keep browsing — we&apos;ll notify you when
          they&apos;re done.
        </div>
      ) : (
        activeJobs.map((job) => (
          <div key={job.id} className="overflow-hidden rounded-xl border bg-card">
            {job.status === "completed" && job.videoUrl ? (
              <video
                src={job.videoUrl}
                controls
                autoPlay
                muted
                loop
                playsInline
                className={cn(
                  "w-full bg-black object-contain",
                  job.settings.aspect_ratio === "9:16" ? "max-h-[420px]" : "max-h-[320px]",
                )}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-violet-950/60 to-fuchsia-950/30">
                {job.status === "failed" ? (
                  <XCircle className="h-8 w-8 text-red-400" />
                ) : job.status === "queued" ? (
                  <Clock className="h-8 w-8 animate-pulse text-violet-300" />
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
                )}
              </div>
            )}
            <div className="space-y-2 p-3">
              <div className="flex items-center gap-2 text-xs">
                {job.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                <span className="font-medium">{statusLabel(job)}</span>
                <span className="text-muted-foreground">· {getModel(job.model)?.label ?? job.model}</span>
                <span className="ml-auto text-muted-foreground">{job.progress}%</span>
              </div>
              {(job.status === "queued" || job.status === "processing") && <Progress value={job.progress} />}
              <p className="line-clamp-2 text-xs text-muted-foreground">{job.prompt}</p>
              {job.status === "failed" && job.error && <p className="text-xs text-red-300">{job.error}</p>}
              {job.status === "completed" && job.downloadUrl && (
                <Button asChild size="sm" variant="secondary" className="w-full">
                  <a href={job.downloadUrl} download>
                    <Download /> Download MP4
                  </a>
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
