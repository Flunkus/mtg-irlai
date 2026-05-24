// Shared Anthropic client + thin structured-output wrapper.
// Used by aiBrain.ts (Phase 5) and the voice parser (Phase 4).
//
// Per CLAUDE.md: structured output goes through the SDK's native messages.parse()
// + zodOutputFormat() helper. No "return only JSON" prompting.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type * as z from 'zod';

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

/** Returns null when no API key is configured. Callers should check isLLMConfigured() first. */
export const client: Anthropic | null = apiKey
  ? new Anthropic({
      apiKey,
      // Required for browser-side use. Per the user's choice in planning, this app is
      // intended to run locally on the user's machine only — the key never leaves their box.
      dangerouslyAllowBrowser: true,
    })
  : null;

export function isLLMConfigured(): boolean {
  return client !== null;
}

export interface StructuredCallOptions<S extends z.ZodType> {
  /** Default Sonnet 4.6 — best balance of reasoning + speed for game/voice decisions. */
  model?: string;
  /** System message: stable instructions about role + behavior. */
  system: string;
  /** User message: dynamic per-call content (game state, transcript, etc.). */
  user: string;
  /** Zod schema describing the structured response. */
  schema: S;
  /** Max output tokens. Default 2048 — proposals are small. */
  maxTokens?: number;
}

/**
 * Issue a structured-output call. The model is constrained to return JSON
 * matching the Zod schema; the SDK parses it before returning.
 *
 * Throws on:
 * - missing API key
 * - network / API error
 * - schema validation failure (model returned malformed JSON)
 */
export async function structuredCall<S extends z.ZodType>(
  opts: StructuredCallOptions<S>,
): Promise<z.infer<S>> {
  if (!client) {
    throw new Error(
      'Anthropic API key missing. Set VITE_ANTHROPIC_API_KEY in .env.local and restart the dev server.',
    );
  }

  const message = await client.messages.parse({
    model: opts.model ?? 'claude-sonnet-4-6',
    max_tokens: opts.maxTokens ?? 2048,
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
    output_config: { format: zodOutputFormat(opts.schema) },
  });

  if (!message.parsed_output) {
    throw new Error('Model response could not be parsed against the schema.');
  }
  return message.parsed_output as z.infer<S>;
}
