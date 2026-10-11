"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNextPath } from "@/lib/utils";

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"email" | "google" | null>(null);
  const [sent, setSent] = useState(false);

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading("email");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    setLoading(null);
    if (error) toast.error(error.message);
    else setSent(true);
  }

  async function signInWithGoogle() {
    setLoading("google");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setLoading(null);
      toast.error(error.message);
    }
  }

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome to ClipForge</CardTitle>
        <CardDescription>Sign in to get 20 free credits.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {params.get("error") && (
          <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
            That sign-in link is invalid or expired. Please try again.
          </p>
        )}
        {sent ? (
          <div className="rounded-lg bg-emerald-500/10 p-4 text-center text-sm text-emerald-300">
            <Mail className="mx-auto mb-2 h-6 w-6" />
            Check <strong>{email}</strong> for your sign-in link.
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@brand.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" variant="gradient" className="w-full" disabled={loading !== null}>
              {loading === "email" ? <Loader2 className="animate-spin" /> : <Mail />}
              Email me a magic link
            </Button>
          </form>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={signInWithGoogle} disabled={loading !== null}>
          {loading === "google" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
            </svg>
          )}
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  );
}
