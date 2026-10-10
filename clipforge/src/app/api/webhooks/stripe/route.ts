import type Stripe from "stripe";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPack } from "@/lib/config/credits";
import { serverEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook: grants credits when a checkout is paid.
 * Idempotent: add_credits ignores a session id it has already applied.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, serverEnv.stripeWebhookSecret());
  } catch (err) {
    console.error("stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      // e.g. delayed payment methods: wait for async_payment_succeeded
      return NextResponse.json({ received: true, pending: true });
    }

    const userId = session.metadata?.user_id ?? session.client_reference_id;
    const pack = getPack(session.metadata?.pack_id ?? "");
    if (!userId || !pack) {
      console.error(`stripe webhook: session ${session.id} has no user/pack metadata`);
      return NextResponse.json({ received: true, ignored: true });
    }
    if (session.amount_total !== pack.priceCents) {
      console.error(`stripe webhook: session ${session.id} amount ${session.amount_total} != pack price ${pack.priceCents}`);
      return NextResponse.json({ received: true, ignored: true });
    }

    const { data, error } = await createAdminClient().rpc("add_credits", {
      p_user_id: userId,
      p_amount: pack.credits,
      p_type: "purchase",
      p_reference: session.id,
      p_description: `${pack.name} pack (${pack.credits} credits)`,
    });
    if (error) {
      console.error(`stripe webhook: add_credits failed for ${session.id}`, error);
      // 500 makes Stripe retry later.
      return NextResponse.json({ error: "Could not apply credits" }, { status: 500 });
    }
    return NextResponse.json({ received: true, applied: data !== null });
  }

  return NextResponse.json({ received: true });
}
