import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600">
        <Clapperboard className="h-4 w-4 text-white" />
      </span>
      <span className="text-lg">ClipForge</span>
    </Link>
  );
}
