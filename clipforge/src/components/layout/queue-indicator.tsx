"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useAppState } from "@/components/providers/app-state";
import { Progress } from "@/components/ui/progress";
import { getModel } from "@/lib/config/models";

export function QueueIndicator({ compact = false }: { compact?: boolean }) {
  const { activeJobs } = useAppState();
  if (activeJobs.length === 0) return null;
  const running = activeJobs.filter((j) => j.status === "queued" || j.status === "processing");

  if (compact) {
    if (running.length === 0) return null;
    return (
      <Link
        href="/create#queue"
        className="flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-1.5 text-xs font-medium text-violet-300"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {running.length}
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Queue</p>
      {activeJobs.slice(0, 4).map((job) => (
        <div key={job.id} className="rounded-lg bg-secondary/60 p-2.5">
          <div className="flex items-center gap-2 text-xs">
            {job.status === "completed" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : job.status === "failed" ? (
              <XCircle className="h-3.5 w-3.5 text-red-400" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-300" />
            )}
            <span className="truncate">{getModel(job.model)?.label ?? job.model}</span>
            <span className="ml-auto text-muted-foreground">{job.progress}%</span>
          </div>
          {(job.status === "queued" || job.status === "processing") && (
            <Progress value={job.progress} className="mt-2" />
          )}
        </div>
      ))}
    </div>
  );
}
