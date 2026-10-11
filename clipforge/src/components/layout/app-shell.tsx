"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, LogOut } from "lucide-react";
import { Logo } from "./logo";
import { NAV_ITEMS } from "./nav-items";
import { QueueIndicator } from "./queue-indicator";
import { useAppState } from "@/components/providers/app-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, credits } = useAppState();

  return (
    <div className="min-h-dvh md:pl-60">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card/40 p-4 backdrop-blur md:flex">
        <Logo className="px-2 py-1" />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                isActive(pathname, href) && "bg-accent text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        {user ? (
          <div className="space-y-3 border-t pt-4">
            <QueueIndicator />
            <Link
              href="/credits"
              className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2.5 text-sm hover:bg-secondary/80"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <Coins className="h-4 w-4 text-amber-300" /> Credits
              </span>
              <span className="font-semibold">{credits ?? "—"}</span>
            </Link>
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
                  <LogOut />
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <Button asChild variant="gradient">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:hidden">
        <Logo />
        {user ? (
          <div className="flex items-center gap-2">
            <QueueIndicator compact />
            <Link
              href="/credits"
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold"
            >
              <Coins className="h-4 w-4 text-amber-300" />
              {credits ?? "—"}
            </Link>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
                <LogOut />
              </Button>
            </form>
          </div>
        ) : (
          <Button asChild size="sm" variant="gradient">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:px-8 md:pb-12 md:pt-8">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur md:hidden">
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground",
                isActive(pathname, href) && "text-violet-300",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
