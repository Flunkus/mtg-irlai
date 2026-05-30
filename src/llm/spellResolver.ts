// Human spell resolver. When the human casts an instant/sorcery, this asks the
// LLM to read the spell's oracle text + the board and propose the concrete state
// changes that resolve its effect. Mirrors the AI brain (aiBrain.ts) but for the
// human side — the human stays in god mode and approves the result.

import { SpellResolutionSchema, type SpellResolution } from './actionSchemas';
import { structuredCall } from './client';
import { gameToCanonicalJson, type GameState } from '../state/gameStore';
import { fetchCollection } from '../api/scryfall';
import type { Card } from '../types';

// Reuse a small module-level cache so re-casting the same spell doesn't re-fetch.
const oracleCache = new Map<string, { oracleText: string; type?: string }>();

async function ensureOracle(card: Card): Promise<Card> {
  if (card.oracleText) return card;
  const cached = oracleCache.get(card.name.toLowerCase());
  if (cached) return { ...card, oracleText: cached.oracleText, type: card.type || cached.type || '' };
  try {
    const { found } = await fetchCollection([{ name: card.name }]);
    const hit = found[0];
    if (hit) {
      oracleCache.set(card.name.toLowerCase(), { oracleText: hit.oracleText ?? '', type: hit.type });
      return { ...card, oracleText: hit.oracleText, type: card.type || hit.type || '' };
    }
  } catch {
    // Network/unmatched — fall through; the LLM can still try from the name.
  }
  return card;
}

const SYSTEM_PROMPT = `You are the rules referee for a casual Magic: The Gathering sandbox app. The HUMAN player is casting a spell and you resolve its effect on the current board.

You are given the spell's oracle text and the full board as JSON. Both battlefields list permanents as { id, name, tapped }. Produce the concrete game actions that resolve the spell, choosing the most sensible legal target(s) for a spell cast BY THE HUMAN (against the AI, or buffing the human's own stuff, as the card dictates).

ACTION CONVENTIONS
- Destroy / sacrifice / "put into graveyard": use a "move" action — { kind:"move", player, cardName, fromZone:"battlefield", toZone:"graveyard" }. player is the OWNER of the permanent (usually "ai" for removal the human casts).
- Exile: same as above but toZone:"exile".
- Bounce / return to hand: "move" with toZone:"hand".
- Direct damage to a player / life loss / life gain: "adjust_life" with a signed delta (negative = damage). For damage to the AI use player:"ai".
- +1/+1 or -1/-1 counters: "add_counter" with counter:"plusOne"/"minusOne" and a delta.
- Tap / untap a permanent: "tap" / "untap" by cardName.
- Pure card draw, scry, search, or anything with no board/life change the app can model: return actions:[] and set needsManual:true with a short note.

RULES
- Only target permanents that actually exist in the provided board JSON. Use exact card names.
- Damage to a creature that is lethal (damage ≥ its toughness) should be modeled as a "move" to graveyard, not adjust_life (life only tracks players).
- If the spell needs a choice you can't infer (e.g. "destroy target creature" but there are several equally-good targets), pick the AI's biggest threat and explain the pick in "note".
- If you genuinely cannot resolve it, set needsManual:true and explain why.
- Keep "summary" to one plain sentence. Keep "note" short (or empty string).`;

/**
 * Resolve a human-cast spell into proposed game actions. Throws if the LLM call
 * fails; callers should fall back to manual resolution on error.
 */
export async function resolveSpell(state: GameState, card: Card): Promise<SpellResolution> {
  const enriched = await ensureOracle(card);
  const gameJson = gameToCanonicalJson(state);

  const userPrompt = [
    '=== Current board (canonical JSON) ===',
    JSON.stringify(gameJson, null, 2),
    '',
    '=== The spell the human is casting ===',
    `Name: ${enriched.name}`,
    enriched.cost ? `Mana cost: ${enriched.cost}` : '',
    enriched.type ? `Type: ${enriched.type}` : '',
    `Oracle: ${(enriched.oracleText ?? '').replace(/\n/g, ' ').trim() || '(unknown — infer from the name)'}`,
    '',
    'Resolve this spell. What concrete actions apply?',
  ]
    .filter(Boolean)
    .join('\n');

  return await structuredCall({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    schema: SpellResolutionSchema,
  });
}
