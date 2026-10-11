import { redirect } from "next/navigation";
import { Coins } from "lucide-react";
import { BuyPacks } from "@/components/credits/buy-packs";
import { PurchaseNotice } from "@/components/credits/purchase-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { CREDIT_PACKS, generationCost, IMAGE_TO_VIDEO_SURCHARGE } from "@/lib/config/credits";
import { MODELS } from "@/lib/config/models";
import { cn, timeAgo } from "@/lib/utils";

export const metadata = { title: "Credits" };
export const dynamic = "force-dynamic";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  balance_after: number;
  created_at: string;
}

export default async function CreditsPage({ searchParams }: { searchParams: { purchase?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/credits");

  const [{ data: account }, { data: txData }] = await Promise.all([
    supabase.from("users").select("credits, reserved_credits").eq("id", user.id).single(),
    supabase
      .from("credit_transactions")
      .select("id, amount, type, description, balance_after, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);
  const transactions = (txData ?? []) as Transaction[];

  return (
    <div className="space-y-8">
      <PurchaseNotice status={searchParams.purchase} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Credits</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Credits are only deducted when a video succeeds. Failed generations are free.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-4">
          <Coins className="h-7 w-7 text-amber-300" />
          <div>
            <div className="text-2xl font-bold leading-none">{account?.credits ?? 0}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {account?.reserved_credits ? `${account.reserved_credits} reserved by running jobs` : "available"}
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Buy credits</h2>
        <BuyPacks packs={CREDIT_PACKS} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing per video</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Model</th>
                  <th className="pb-2 text-right font-medium">Short</th>
                  <th className="pb-2 text-right font-medium">10s</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="py-2.5">{m.label}</td>
                    <td className="py-2.5 text-right">
                      {generationCost(m.id, 5, "text")} cr <span className="text-xs text-muted-foreground">({m.durationLabel[5]})</span>
                    </td>
                    <td className="py-2.5 text-right">{generationCost(m.id, 10, "text")} cr</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {IMAGE_TO_VIDEO_SURCHARGE > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">Image-to-video adds {IMAGE_TO_VIDEO_SURCHARGE} credits.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {transactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate">{t.description ?? t.type}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(t.created_at)}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-semibold tabular-nums",
                        t.amount > 0 ? "text-emerald-400" : t.amount < 0 ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {t.amount > 0 ? `+${t.amount}` : t.amount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
