import Link from "next/link";
import { ArrowRight, Camera, ImageIcon, LayoutGrid, Sparkles, Wand2, Zap } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/supabase/server";
import { MODELS } from "@/lib/config/models";
import { SIGNUP_BONUS_CREDITS } from "@/lib/config/credits";

const FEATURES = [
  { icon: Sparkles, title: "Text to video", body: "Describe a scene and get a cinematic 5–10s clip in 9:16, 1:1 or 16:9." },
  { icon: ImageIcon, title: "Image to video", body: "Upload a product photo and bring it to life without a photoshoot." },
  { icon: Camera, title: "Camera presets", body: "Dolly in, orbit, crane up, handheld, zoom out and product spin." },
  { icon: Wand2, title: "Prompt enhancer", body: "Turn a three-word idea into a detailed, director-grade prompt." },
  { icon: LayoutGrid, title: "Templates", body: "Amazon showcases, UGC unboxings, luxury reveals and more." },
  { icon: Zap, title: "Top models", body: "Kling, Hailuo and Wan, all through one simple studio." },
];

export default async function LandingPage() {
  const user = await getUser();
  const cta = user ? "/create" : "/login";

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -top-48 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-violet-700/25 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-96 h-72 w-72 rounded-full bg-fuchsia-600/15 blur-3xl" />

      <header className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/templates">Templates</Link>
          </Button>
          <Button asChild size="sm" variant="gradient">
            <Link href={cta}>{user ? "Open studio" : "Sign in"}</Link>
          </Button>
        </div>
      </header>

      <section className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center md:pt-28">
        <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" /> {SIGNUP_BONUS_CREDITS} free credits when you sign up
        </p>
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          Scroll-stopping product videos, <span className="text-gradient">forged by AI</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          Turn a prompt or a product photo into short videos for TikTok, Reels and Amazon listings. Pick a model,
          a camera move, and hit generate.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" variant="gradient" className="w-full sm:w-auto">
            <Link href={cta}>
              Start creating <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/templates">Browse templates</Link>
          </Button>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          Powered by
          {MODELS.map((m) => (
            <span key={m.id} className="rounded-full border px-2.5 py-1">
              {m.label}
            </span>
          ))}
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl gap-3 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border bg-card/50 p-5 backdrop-blur">
            <Icon className="h-5 w-5 text-violet-300" />
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
