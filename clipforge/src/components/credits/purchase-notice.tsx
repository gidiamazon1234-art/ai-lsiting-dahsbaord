"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppState } from "@/components/providers/app-state";

/** Shows the result of a Stripe redirect and refreshes the balance once the webhook lands. */
export function PurchaseNotice({ status }: { status?: string }) {
  const router = useRouter();
  const { refreshAccount } = useAppState();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !status) return;
    handled.current = true;
    if (status === "success") {
      toast.success("Payment received! Your credits will appear in a moment.");
      // The webhook usually lands within seconds; refresh a few times.
      // (Not cleaned up on purpose: clearing the query string re-renders this component.)
      for (const ms of [2000, 5000, 10000]) {
        setTimeout(() => {
          void refreshAccount();
          router.refresh();
        }, ms);
      }
    } else if (status === "cancelled") {
      toast("Checkout cancelled — you weren't charged.");
    }
    router.replace("/credits");
  }, [status, refreshAccount, router]);

  return null;
}
