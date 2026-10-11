import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env";

let client: Stripe | null = null;

export function stripe() {
  client ??= new Stripe(serverEnv.stripeSecretKey(), { appInfo: { name: "ClipForge" } });
  return client;
}
