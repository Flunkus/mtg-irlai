# MTG Trainer — Project Brief for Future Sessions

Local, web-based Magic: The Gathering companion for **physical tabletop play**.
The app is a digital sandbox; the cardboard stays on the table.

> If you're a human and you opened this file looking for "how do I use this thing",
> read `README.md` instead. This file is context for AI coding sessions.

## Core Philosophy
1. **Human God Mode.** The app trusts the human. No mana, timing, or rules enforcement on the human side — the UI is a sandbox the human updates.
2. **Open-Handed Physical Play.** The human draws and plays the AI's *physical* cards face-up on the table. The app tracks the AI's "hidden" hand digitally, populated by what the human tells it.
3. **LLM as Referee.** No hardcoded MTG rules engine. An LLM reads the board state JSON + Oracle text of cards and decides the AI's legal optimal moves.

## Tech Stack
- Vite + React 18 + **TypeScript** + Tailwind CSS v3
- `scryfall-client` — all card data, images, mana symbols
- `@anthropic-ai/sdk` (Claude) — AI brain (Sonnet 4.6) + voice parser (Haiku 4.5)
- `zod` v4 — runtime schemas, paired with the SDK's `messages.parse()` + `zodOutputFormat()` for structured output
- `localStorage` — no backend DB
- Web Speech API (native) — voice recognition (Chromium-only)

## Hard Rules
1. **NEVER overwrite the existing Tailwind aesthetic.** All visual styling (colors, gradients, animations, fonts, spacing, shadows, `oklch(...)` values, `--accent` CSS vars) originated in `claude-design-mockup/` and must be preserved verbatim when migrating to `src/`. Add logic, not redesigns. If a className or inline `style={{...}}` was in the mockup, it stays.
2. **Structured output for LLM calls.** Do NOT rely on "Return ONLY JSON" prompts. Use the SDK's native `messages.parse()` + `zodOutputFormat(schema)` helper — see `src/llm/client.ts`.
3. **Game state shape is canonical** (see below). LLM prompts serialize this shape; React state mirrors it.
4. **No card-rules engine.** Resist the urge to validate mana costs, timing, priority, or legality for the human. The LLM handles AI legality via Oracle text.

## Canonical Game State (JSON the LLM consumes)
Produced by `gameToCanonicalJson(state)` in `src/state/gameStore.tsx`. Toggle the JSON debug panel from the sidebar to see it live.

```json
{
  "gameMetadata": {
    "turnNumber": 4,
    "currentPhase": "Main 1",
    "activePlayer": "AI"
  },
  "players": {
    "human": {
      "lifeTotal": 17,
      "zones": {
        "battlefield": [{ "id": "h_1", "name": "Delver of Secrets", "tapped": false }],
        "graveyard": [],
        "exile": []
      }
    },
    "ai": {
      "lifeTotal": 14,
      "zones": {
        "hand":        ["Mountain", "Lightning Bolt"],
        "battlefield": [{ "id": "ai_1", "name": "Goblin Guide", "tapped": true }],
        "graveyard": [],
        "exile": []
      }
    }
  }
}
```

- Battlefield/graveyard/exile entries are objects with `id`, `name`, `tapped`.
- AI hand is a flat array of names (the human knows the cards — they're face-up on the table).
- The human's hand is intentionally absent: those cards stay physical and unknown to the LLM.
- `currentPhase` is one of `Untap`, `Upkeep`, `Draw`, `Main 1`, `Combat`, `Main 2`, `End`.

## Scryfall Card Shape (what we persist to localStorage)
Stored on each `Card` (see `src/types.ts`):
`name`, `oracleText`, `cost` (compact `1UU` form), `type`, `pt`, `imageUrl` (`image_uris.normal`),
plus `scryfallId`, `set`, `collectorNumber`, `cmc`, `colors`, `power`, `toughness`, `rarity`.

The default demo deck in `src/mocks/sampleDeck.ts` bakes all of these inline so the app shows real card art on first paint with zero network.

## Repo Map
- `claude-design-mockup/` — **reference only.** Original static HTML + JSX design. Do not edit; copy classNames/styles from here when porting new UI.
- `src/App.tsx` — root shell. Wraps the tree in `<DeckLibraryProvider>` and `<GameProvider>`.
- `src/components/`
  - `Sidebar.tsx` — vertical nav (Battlefield / Deck / Card Viewer + JSON debug toggle + Tweaks gear).
  - `CardToken.tsx` — the universal card visual (xs/sm/md/lg sizes). Has an optional `onZoom` prop that renders the magnifier overlay.
  - `CardDetailModal.tsx` — full-art card detail overlay. Opens from any `CardToken` zoom button.
  - `PlayBar.tsx` — "log a play" bar at the bottom of Battlefield. Has a `for: You/AI` side toggle; autocomplete switches deck based on side.
  - `NewGameModal.tsx` — pick human deck, AI deck, life, hand size, who goes first; dispatches `RESET_GAME`.
  - `AIPersona.tsx`, `HintCoach.tsx`, `TweaksPanel.tsx`, `JsonDebugPanel.tsx` — supporting UI pieces.
- `src/views/`
  - `Battlefield.tsx` — main play view. Reads `useGame()` for state, dispatches actions on tap/click/voice/brain-approval.
  - `DeckManager.tsx` — deck library UI: editable name, switcher dropdown, +New / Import / Export buttons, delete confirm.
  - `CardViewer.tsx` — look up any card by name, set+collector, or Scryfall UUID.
- `src/state/`
  - `gameStore.tsx` — Context + reducer for game state. `gameToCanonicalJson()` projects to the LLM-facing shape. `buildNewGameState()` constructs a fresh game from picked decks. `computeCombatResult()` is the pure damage-resolution helper used by the combat UI.
  - `deckLibrary.tsx` — Context-backed multi-deck library (decks + activeId). Migrates legacy single-deck localStorage on first load. Exports `mergeDeckCards()`.
  - `deckStore.ts` — thin shim around `useDeckLibrary()` that exposes `useDeck()` (active deck only) for backward compatibility with `PlayBar`.
  - `deckIO.ts` — `exportDeckToList(cards)` + `parseDeckList(text)`. Handles plain, MTGO-short, and Arena-expanded formats. Tolerates `Sideboard` sections (ignored for now).
- `src/api/scryfall.ts` — wrapper around `scryfall-client`. `fetchByName`, `fetchBySetAndNumber`, `fetchById`, `fetchAny` (smart router), `fetchCollection` (chunked at 75), `parseBulkLine` (set-lock aware), `looksLikeCollectorNumber`.
- `src/llm/` — shared LLM layer used by **both** the AI brain and the voice parser.
  - `client.ts` — Anthropic client + `structuredCall({ system, user, schema, model? })` wrapper around `messages.parse()` + `zodOutputFormat()`. Exposes `isLLMConfigured()` so UI can gracefully fall back when no key is set.
  - `actionSchemas.ts` — `GameAction` discriminated union (tap/untap/play/move/adjust_life/declare_attackers) + `AIProposal` + `VoiceActions`.
  - `applyActions.ts` — `applyActions(actions, state, dispatch)`: translates LLM-emitted actions into store dispatches, resolving card names to ids. Returns `{ applied, skipped }`.
  - `aiBrain.ts` — `proposeAIMove(state)`: enriches AI hand + battlefield with Scryfall oracle text (module-level cache), builds a per-phase prompt, returns a parsed `AIProposal`. Uses Sonnet 4.6.
- `src/voice/`
  - `useSpeech.ts` — Web Speech API hook (`webkitSpeechRecognition`). Returns `{ recording, transcript, start, stop, supported, error }`.
  - `parseVoice.ts` — `parseVoiceTranscript(transcript, state)`: sends transcript + canonical game JSON to Haiku 4.5, returns a parsed `VoiceActions`.
- `src/mocks/sampleDeck.ts` — fallback default deck with real Scryfall art baked inline. Used by `PlayBar` autocomplete when the user's deck library is empty.

## Dev
```
npm install
npm run dev
```
LLM key goes in `.env.local` (gitignored): `VITE_ANTHROPIC_API_KEY=sk-ant-...`. Without a key the AI brain falls back to a mock proposal and voice parsing shows an inline "key missing" message. Browser-side calls require `dangerouslyAllowBrowser: true` on the SDK (already set in `client.ts`).

## LocalStorage keys (for cleanup / migration)
- `mtg.deckLibrary.v1` — the deck library (`{ decks, activeId }`)
- `mtg.deck.v1` — legacy single-deck key; auto-migrated into the library on first load
- `mtg.lockedSet.v1` — Deck Manager's set lock (e.g. "FIN")
- `mtg.hintHidden` — coach panel visibility on the Battlefield
