import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env";

let client: Anthropic | null = null;

export function anthropic() {
  client ??= new Anthropic({ apiKey: serverEnv.anthropicApiKey(), timeout: 30_000, maxRetries: 2 });
  return client;
}

export const ENHANCER_MODEL = "claude-opus-5-5";
