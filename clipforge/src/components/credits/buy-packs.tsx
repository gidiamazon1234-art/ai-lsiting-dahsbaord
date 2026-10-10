"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CreditPack } from "@/lib/config/credits";
import { cn, formatPrice } from "@/lib/utils";

export function BuyPacks({ packs }: { packs: CreditPack[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function buy(packId: string) {
    setLoading(packId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const body = await res.json();
      if (!res.ok || !body.url) throw new Error(body.error ?? "Could not start checkout");
      window.location.href = body.url;
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {packs.map((p) => (
        <div
          key={p.id}
          className={cn(
            "relative flex flex-col rounded-2xl border bg-card p-5",
            p.highlight && "border-violet-500 bg-gradient-to-b from-violet-500/10 to-transparent",
          )}
        >
          {p.highlight && (
            <span className="absolute -top-2.5 left-5 rounded-full bg-violet-600 px-2.5 py-0.5 text-[11px] font-semibold">
              Most popular
            </span>
          )}
          <p className="text-sm text-muted-foreground">{p.name}</p>
          <p className="mt-1 text-3xl font-bold">{p.credits}</p>
          <p className="text-xs text-muted-foreground">credits</p>
          <p className="mt-3 text-sm">
            {formatPrice(p.priceCents)}{" "}
            <span className="text-xs text-muted-foreground">· {formatPrice(Math.round((p.priceCents / p.credits) * 100) / 100)}/credit</span>
          </p>
          <Button
            className="mt-4"
            variant={p.highlight ? "gradient" : "secondary"}
            onClick={() => buy(p.id)}
            disabled={loading !== null}
          >
            {loading === p.id && <Loader2 className="animate-spin" />}
            Buy {p.name}
          </Button>
        </div>
      ))}
    </div>
  );
}
