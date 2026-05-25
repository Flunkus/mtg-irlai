// AI opponent brain. Reads the canonical game JSON + the AI's cards with oracle
// text and produces a structured AIProposal.

import { AIProposalSchema, type AIProposal } from './actionSchemas';
import { structuredCall } from './client';
import { gameToCanonicalJson, type GameState } from '../state/gameStore';
import { fetchCollection } from '../api/scryfall';
import type { Card } from '../types';

// Module-level cache: card-name → enrichment (oracle text + mana cost).
// Persists for the life of the page, so repeat brain calls don't re-fetch.
const oracleCache = new Map<string, { oracleText: string; cost?: string; cmc?: number }>();

/**
 * Mock decks (AI_HAND, AI_BATTLEFIELD) ship without oracle text. Before the
 * brain runs, batch-fetch oracle text for any AI card we haven't seen yet.
 */
async function enrichWithOracle(cards: Card[]): Promise<Card[]> {
  const needed = cards.filter((c) => !c.oracleText && !oracleCache.has(c.name.toLowerCase()));
  if (needed.length > 0) {
    const uniqueNames = [...new Set(needed.map((c) => c.name))];
    try {
      const { found } = await fetchCollection(uniqueNames.map((name) => ({ name })));
      for (const c of found) {
        oracleCache.set(c.name.toLowerCase(), {
          oracleText: c.oracleText ?? '',
          cost: c.cost,
          cmc: c.cmc,
        });
      }
    } catch {
      // Network failure or unmatched names — fall through with whatever we have.
      // Brain can still propose something based on names + types.
    }
  }
  return cards.map((c) => {
    if (c.oracleText) return c;
    const cached = oracleCache.get(c.name.toLowerCase());
    if (!cached) return c;
    return { ...c, oracleText: cached.oracleText, cost: cached.cost ?? c.cost, cmc: cached.cmc ?? c.cmc };
  });
}

function formatCardForPrompt(c: Card): string {
  const lines: string[] = [`• ${c.name}`];
  if (c.cost) lines.push(`  Mana cost: ${c.cost}`);
  if (c.type) lines.push(`  Type: ${c.type}`);
  if (c.pt) lines.push(`  P/T: ${c.pt}`);
  if (c.tapped) lines.push(`  STATE: TAPPED`);
  if (c.oracleText) lines.push(`  Oracle: ${c.oracleText.replace(/\n/g, ' ').trim()}`);
  return lines.join('\n');
}

const SYSTEM_PROMPT = `You are the AI opponent in a casual Magic: The Gathering sandbox app. The human player runs the game; you propose moves for the AI side.

WHAT THE HUMAN SEES
- A popup with your proposal: title, summary, 2–4 reasons, a confidence score, and a structured list of actions.
- On approve, the actions are applied to the game state. On reject, you find another line.

RULES TO RESPECT
- Mana cost: to cast a card from your hand you need enough untapped lands of the right colors on your battlefield. Count carefully.
- Speed: instants and abilities can be played at almost any time; sorceries only on your main phase.
- Tapping lands for mana is implicit when you cast a spell — you don't need to include explicit "tap" actions for mana lands. Only include explicit tap/untap actions when activating a non-mana ability.
- If it's not your turn (gameMetadata.activePlayer !== "AI") and there's no urgent instant-speed play available, return a proposal with title "Pass" and empty actions[].

PHASE-SPECIFIC BEHAVIOR (read currentPhase carefully)
- "Untap": Propose to untap all your tapped permanents. Use one "untap" action per tapped card on your battlefield. Title: "Untap step". If nothing is tapped, propose to pass with empty actions[].
- "Upkeep": Trigger any "at the beginning of upkeep" abilities your permanents have (most decks don't have these — check oracle text). If none, propose to pass.
- "Draw": Propose to pass with empty actions[] — the HUMAN tells the app which card you drew via the play bar, not you. Title: "Awaiting draw".
- "Main 1": Develop your board. Play lands (if you have one in hand). Cast creatures and sorceries you can afford. Hold up mana for instants only if you have a specific reactive plan. NEVER attack here; attacks only happen in "Combat".
- "Combat": Declare your attackers with a single ai_declare_attackers action listing the creature NAMES on your battlefield you're swinging with. Do NOT include adjust_life for combat damage — the human will assign blockers and the app resolves damage. You MAY still pair burn instants (play + adjust_life) in this same proposal if you want to fire them before combat damage.
- "Main 2": Cast any remaining cards you held back. Often noncreature spells like burn that you wanted to wait until after combat for.
- "End": Propose to pass with empty actions[]. End-of-turn triggers go here if any apply.

ACTION CONVENTIONS (read carefully — wrong choices won't apply correctly)
- play + zone="battlefield" — for PERMANENTS only (creature, land, artifact, enchantment, planeswalker). Card moves from your hand onto the battlefield.
- play + zone="graveyard" — for INSTANTS and SORCERIES. After resolving, the spell goes to your graveyard. Pair this with whatever effect actions the spell produces (e.g. adjust_life for burn, tap for tap-down effects).
- adjust_life — apply only NON-COMBAT damage (burn spells, drain effects). Combat damage is handled by ai_declare_attackers and the blocker UI. Example: Lightning Bolt to face = adjust_life delta -3.
- ai_declare_attackers — list the names of YOUR creatures you're attacking with this combat. Only declare untapped, non-summoning-sick creatures with Power > 0 (or relevant evasion). After you declare, the human assigns blockers and the app computes damage from P/T.
- declare_attackers — do NOT use this. It's the inverse, used only for human-side combat flow.
- add_counter — place or remove counters on a permanent. Use this for +1/+1 counters from abilities (e.g. Adapt, Bolster, Renown), loyalty changes on planeswalkers, charge counters on artifacts. Example: { kind: "add_counter", cardName: "Grizzly Bears", counter: "plusOne", delta: 1 }.
- damage field on the proposal — total non-combat damage you'll deal this turn from adjust_life entries. 0 if combat-only.

OUTPUT
- Be decisive: pick ONE concrete line, not a menu of options.
- Reasons should be short and tactical (label + one sentence).
- Keep summary plain-English; the human is a casual player, not a tournament grinder.
- Damage field must be 0 unless this move deals damage to the human this turn.`;

export async function proposeAIMove(state: GameState): Promise<AIProposal> {
  const aiHand = await enrichWithOracle(state.players.ai.zones.hand);
  const aiBoard = await enrichWithOracle(state.players.ai.zones.battlefield);

  // Project state with enriched cards for the canonical JSON snapshot.
  const enrichedState: GameState = {
    ...state,
    players: {
      ...state.players,
      ai: {
        ...state.players.ai,
        zones: { ...state.players.ai.zones, hand: aiHand, battlefield: aiBoard },
      },
    },
  };
  const gameJson = gameToCanonicalJson(enrichedState);

  const userPrompt = [
    '=== Current game state (canonical JSON) ===',
    JSON.stringify(gameJson, null, 2),
    '',
    '=== Your hand (full oracle text) ===',
    aiHand.length > 0 ? aiHand.map(formatCardForPrompt).join('\n\n') : '(empty)',
    '',
    '=== Your battlefield (full oracle text) ===',
    aiBoard.length > 0 ? aiBoard.map(formatCardForPrompt).join('\n\n') : '(empty)',
    '',
    "What's your move?",
  ].join('\n');

  return await structuredCall({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    schema: AIProposalSchema,
  });
}
