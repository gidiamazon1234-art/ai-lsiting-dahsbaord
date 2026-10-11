"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AccountDTO, GenerationDTO } from "@/lib/types";

const POLL_INTERVAL_MS = 4000;

interface AppState {
  user: { id: string; email: string | null } | null;
  credits: number | null;
  /** Credits not reserved by in-flight jobs. */
  availableCredits: number | null;
  activeJobs: GenerationDTO[];
  /** Increments whenever a job finishes, so lists can refetch. */
  libraryVersion: number;
  refreshAccount: () => Promise<void>;
  trackJob: (job: GenerationDTO) => void;
}

const AppStateContext = createContext<AppState | null>(null);

function notifyBrowser(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted" && document.visibilityState === "hidden") {
    new Notification(title, { body, icon: "/icon.svg" });
  }
}

export function AppStateProvider({
  initialUser,
  children,
}: {
  initialUser: { id: string; email: string | null } | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [account, setAccount] = useState<AccountDTO | null>(null);
  const [jobs, setJobs] = useState<Record<string, GenerationDTO>>({});
  const [libraryVersion, setLibraryVersion] = useState(0);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const refreshAccount = useCallback(async () => {
    if (!initialUser) return;
    const res = await fetch("/api/me", { cache: "no-store" });
    if (res.ok) setAccount((await res.json()) as AccountDTO);
  }, [initialUser]);

  const trackJob = useCallback((job: GenerationDTO) => {
    setJobs((prev) => ({ ...prev, [job.id]: job }));
  }, []);

  // Initial load: account + any jobs still running from a previous visit.
  useEffect(() => {
    if (!initialUser) return;
    void refreshAccount();
    void (async () => {
      const res = await fetch("/api/generations?active=1", { cache: "no-store" });
      if (!res.ok) return;
      const { generations } = (await res.json()) as { generations: GenerationDTO[] };
      setJobs((prev) => {
        const next = { ...prev };
        for (const g of generations) next[g.id] = g;
        return next;
      });
    })();
  }, [initialUser, refreshAccount]);

  // Poll active jobs. The status endpoint also checks fal.ai directly,
  // so jobs complete even if the fal webhook can't reach this deployment (e.g. localhost).
  const activeIds = Object.values(jobs)
    .filter((j) => j.status === "queued" || j.status === "processing")
    .map((j) => j.id)
    .join(",");

  useEffect(() => {
    if (!activeIds) return;
    let cancelled = false;
    const tick = async () => {
      const ids = activeIds.split(",");
      await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(`/api/status/${id}`, { cache: "no-store" });
            if (cancelled) return;
            if (res.status === 404) {
              setJobs((prev) => {
                const { [id]: _removed, ...rest } = prev;
                return rest;
              });
              return;
            }
            if (!res.ok) return;
            const job = (await res.json()) as GenerationDTO;
            const before = jobsRef.current[id];
            setJobs((prev) => ({ ...prev, [id]: job }));
            if (before && before.status !== job.status) {
              if (job.status === "completed") {
                toast.success("Your video is ready 🎬", {
                  description: job.prompt.slice(0, 80),
                  action: { label: "View", onClick: () => router.push("/library") },
                });
                notifyBrowser("ClipForge: video ready", job.prompt.slice(0, 100));
                setLibraryVersion((v) => v + 1);
                void refreshAccount();
              } else if (job.status === "failed") {
                toast.error("Generation failed — no credits charged", {
                  description: job.error ?? undefined,
                });
                notifyBrowser("ClipForge: generation failed", "No credits were charged.");
                setLibraryVersion((v) => v + 1);
                void refreshAccount();
              }
            }
          } catch {
            // network blip: try again next tick
          }
        }),
      );
    };
    void tick();
    const handle = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [activeIds, refreshAccount, router]);

  // Drop finished jobs from the queue a little while after they finish.
  useEffect(() => {
    const finished = Object.values(jobs).filter((j) => j.status === "completed" || j.status === "failed");
    if (finished.length === 0) return;
    const handle = setTimeout(() => {
      setJobs((prev) => {
        const next = { ...prev };
        for (const j of finished) delete next[j.id];
        return next;
      });
    }, 15000);
    return () => clearTimeout(handle);
  }, [jobs]);

  const value = useMemo<AppState>(
    () => ({
      user: initialUser,
      credits: account?.credits ?? null,
      availableCredits: account ? account.credits - account.reservedCredits : null,
      activeJobs: Object.values(jobs).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      libraryVersion,
      refreshAccount,
      trackJob,
    }),
    [initialUser, account, jobs, libraryVersion, refreshAccount, trackJob],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside <AppStateProvider>");
  return ctx;
}
