// Shared schemas for structured LLM output.
// - GameAction: discriminated union of moves the brain (Phase 5) and the voice
//   parser (Phase 4) can both emit. They flow through applyActions() into the store.
// - AIProposal: the brain's full proposal (title, summary, reasons, confidence, actions[]).
// - VoiceActions: the voice parser's output (just actions[], no narrative wrapper).

import { z } from 'zod';

export const PlayerEnum = z.enum(['human', 'ai']);
export const ZoneEnum = z.enum(['battlefield', 'graveyard', 'exile', 'hand']);

export const GameActionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('tap'),
    cardName: z.string().describe('Name of the card on a battlefield to tap.'),
  }),
  z.object({
    kind: z.literal('untap'),
    cardName: z.string().describe('Name of the card on a battlefield to untap.'),
  }),
  z.object({
    kind: z.literal('play'),
    player: PlayerEnum,
    cardName: z.string().describe('Name of the card to play. For AI plays, must match a card in the AI hand.'),
    zone: ZoneEnum.describe('Destination zone. Use "battlefield" for normal plays.'),
  }),
  z.object({
    kind: z.literal('move'),
    player: PlayerEnum,
    cardName: z.string(),
    fromZone: ZoneEnum,
    toZone: ZoneEnum,
  }),
  z.object({
    kind: z.literal('adjust_life'),
    player: PlayerEnum,
    delta: z
      .number()
      .int()
      .describe('Signed integer. Negative for damage, positive for life gain.'),
  }),
  z.object({
    kind: z.literal('declare_attackers'),
    attackers: z.array(z.string()).describe('Names of attacking creatures on the human battlefield.'),
  }),
]);

export type GameAction = z.infer<typeof GameActionSchema>;

export const ReasonSchema = z.object({
  label: z.string().describe('Short tag like "Pressure", "Risk", "Tempo", "Lethal".'),
  detail: z.string().describe('One-sentence rationale.'),
});

export const AIProposalSchema = z.object({
  title: z
    .string()
    .describe('Short headline for the popup, e.g. "Attack with Goblin Guide" or "Cast Lightning Bolt to face".'),
  summary: z
    .string()
    .describe('1–2 sentence plain-English description of the move for the human to read.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('How confident you are this is the best line, 0.0–1.0.'),
  reasons: z
    .array(ReasonSchema)
    .min(1)
    .max(5)
    .describe('Tactical rationale shown to the human as bullet rows.'),
  actions: z
    .array(GameActionSchema)
    .describe('Concrete game actions to apply if the human approves. May be empty (pass).'),
  damage: z
    .number()
    .int()
    .min(0)
    .describe('Total damage this move deals to the human, for popup display. 0 if none.'),
});

export type AIProposal = z.infer<typeof AIProposalSchema>;

/** Phase 4 (voice) — just a list of actions, no narrative wrapper. */
export const VoiceActionsSchema = z.object({
  actions: z.array(GameActionSchema).describe('Game actions extracted from the spoken transcript.'),
});

export type VoiceActions = z.infer<typeof VoiceActionsSchema>;
