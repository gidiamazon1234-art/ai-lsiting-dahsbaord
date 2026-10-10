import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, requireUser } from "@/lib/api";
import { getPack } from "@/lib/config/credits";
import { serverEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ packId: z.string() });

/** Creates a Stripe Checkout session for a credit pack and returns its URL. */
export async function POST(request: NextRequest) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  const pack = parsed.success ? getPack(parsed.data.packId) : undefined;
  if (!pack) return jsonError("Unknown credit pack", 400);

  const appUrl = serverEnv.appUrl();
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pack.priceCents,
            product_data: {
              name: `ClipForge ${pack.name} — ${pack.credits} credits`,
              description: "Credits for AI video generation. Only charged on successful videos.",
            },
          },
        },
      ],
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: { user_id: user.id, pack_id: pack.id, credits: String(pack.credits) },
      success_url: `${appUrl}/credits?purchase=success`,
      cancel_url: `${appUrl}/credits?purchase=cancelled`,
    });
    if (!session.url) return jsonError("Could not start checkout", 502);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("stripe checkout failed", err);
    return jsonError("Could not start checkout", 502);
  }
}
