// Voice-to-action parser. Sends a transcript + current game state to Claude
// and parses the response as a list of GameActions via the shared schema.

import { VoiceActionsSchema, type VoiceActions } from '../llm/actionSchemas';
import { structuredCall } from '../llm/client';
import { gameToCanonicalJson, type GameState } from '../state/gameStore';

const SYSTEM_PROMPT = `You translate spoken Magic: The Gathering commands into structured game actions for a casual sandbox app. The human is talking to a digital tabletop companion; you turn what they said into concrete actions to apply to the game state.

OUTPUT
Use the parse_voice tool. Return { actions: [...] } — possibly empty if the command makes no sense.

WHO IS THE ACTOR?
Default to player:"human" for every action unless the user explicitly says "AI", "opponent", "their" / "the opponent's", or similar. Examples:
- "Tap my Island" → player:"human"
- "Tap the AI's Mountain" → player:"ai"
- "Send Snapcaster to graveyard" → player:"human"

ACTION CHOICE
- "tap [card]" → kind:"tap", cardName
- "untap [card]" or "untap everything" → one or more kind:"untap"
- "move/send [card] to [zone]" → kind:"move", cardName, fromZone, toZone (you may need to guess fromZone from the state)
- "play/cast [card]" → kind:"play", cardName, zone:"battlefield" for permanents (creatures, lands, artifacts, enchantments, planeswalkers), zone:"graveyard" for instants/sorceries
- "take X damage" / "I'm at Y" / "lose X life" → kind:"adjust_life", player:"human", delta:negative
- "gain X life" → kind:"adjust_life", player:"human", delta:positive
- "deal X to AI" / "the AI takes X" → kind:"adjust_life", player:"ai", delta:negative
- "attack with [creature]" or "swing with X and Y" → kind:"declare_attackers", attackers:[names]

DISAMBIGUATION
- Use the provided game state to resolve ambiguous names ("an island", "a mountain") to specific cards by checking which battlefield contains them.
- If the user says "two islands" without specifying which, emit two "tap" actions for the same card name; applyActions will pick untapped instances.
- If nothing in the state matches the user's words, prefer returning an empty actions array over guessing wildly.

TONE
Be literal. Do not invent actions the user didn't ask for. Short commands → short action lists.`;

export async function parseVoiceTranscript(
  transcript: string,
  state: GameState,
): Promise<VoiceActions> {
  const gameJson = gameToCanonicalJson(state);
  const user = [
    'Current game state (canonical JSON):',
    JSON.stringify(gameJson, null, 2),
    '',
    `User said: "${transcript.trim()}"`,
    '',
    'Translate to structured game actions.',
  ].join('\n');

  return await structuredCall({
    // Haiku is plenty for command parsing — fast + cheap.
    model: 'claude-haiku-4-5-20251001',
    system: SYSTEM_PROMPT,
    user,
    schema: VoiceActionsSchema,
    maxTokens: 1024,
  });
}
