"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Film, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/components/providers/app-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { GenerationDTO } from "@/lib/types";
import { VideoCard } from "./video-card";

export function LibraryGrid() {
  const { libraryVersion, activeJobs } = useAppState();
  const [items, setItems] = useState<GenerationDTO[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (before?: string) => {
    const res = await fetch(`/api/generations${before ? `?before=${encodeURIComponent(before)}` : ""}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Could not load your library");
    return (await res.json()) as { generations: GenerationDTO[]; nextCursor: string | null };
  }, []);

  useEffect(() => {
    load()
      .then(({ generations, nextCursor }) => {
        setItems(generations);
        setCursor(nextCursor);
      })
      .catch((err: Error) => toast.error(err.message));
  }, [load, libraryVersion]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const { generations, nextCursor } = await load(cursor);
      setItems((prev) => [...(prev ?? []), ...generations]);
      setCursor(nextCursor);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/generations/${id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.error ?? "Could not delete the video");
      return;
    }
    setItems((prev) => prev?.filter((g) => g.id !== id) ?? null);
    toast.success("Video deleted");
  }

  if (items === null) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[9/12] rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center">
        <Film className="h-8 w-8 text-muted-foreground" />
        <h2 className="mt-3 font-semibold">No videos yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your generated videos will live here.</p>
        <Button asChild variant="gradient" className="mt-5">
          <Link href="/create">
            <Sparkles /> Create your first video
          </Link>
        </Button>
      </div>
    );
  }

  // Overlay live progress from the queue onto in-flight items.
  const live = new Map(activeJobs.map((j) => [j.id, j]));
  const merged = items.map((g) => live.get(g.id) ?? g);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {merged.map((g) => (
          <VideoCard key={g.id} generation={g} onDelete={() => remove(g.id)} />
        ))}
      </div>
      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore && <Loader2 className="animate-spin" />} Load more
          </Button>
        </div>
      )}
    </div>
  );
}
