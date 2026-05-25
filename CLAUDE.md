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
- Web Speech API (native) — voice recognition (Chromium-only) + voice synthesis (cross-browser)
- OpenAI `gpt-4o-mini-tts` (optional) — higher-quality voice synthesis with `instructions` field used for persona tone steering. Auto-selected when `VITE_OPENAI_API_KEY` is set; one-click fallback to browser TTS from the Tweaks panel.

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
  - `Sidebar.tsx` — vertical nav (Battlefield / Deck / Personas / Card Viewer + JSON debug toggle + Tweaks gear).
  - `CardToken.tsx` — the universal card visual (xs/sm/md/lg sizes). Has an optional `onZoom` prop that renders the magnifier overlay.
  - `CardDetailModal.tsx` — full-art card detail overlay. Opens from any `CardToken` zoom button.
  - `PlayBar.tsx` — "log a play" bar at the bottom of Battlefield. Has a `for: You/AI` side toggle; autocomplete switches deck based on side.
  - `NewGameModal.tsx` — pick human deck, AI deck, life, hand size, who goes first, **and which AI persona to use**; dispatches `RESET_GAME`.
  - `AIPersona.tsx`, `HintCoach.tsx`, `TweaksPanel.tsx`, `JsonDebugPanel.tsx` — supporting UI pieces. AIPersona's header includes the **TTS mute toggle** (speaker icon next to "opponent").
- `src/views/`
  - `Battlefield.tsx` — main play view. Reads `useGame()` for state, dispatches actions on tap/click/voice/brain-approval. Pulls active persona name + archetype + voice from `usePersonaLibrary()`; the local `speak()` helper drives both the visual bubble and TTS audio.
  - `DeckManager.tsx` — deck library UI: editable name, switcher dropdown, +New / Import / Export buttons, delete confirm.
  - `PersonaManager.tsx` — persona library UI: sidebar list with +New / Duplicate / delete confirm, main pane editor (name, archetype label, personality prompt textarea, voice picker + rate/pitch sliders, default-deck dropdown, inline "▶ Preview" button that speaks a sample line via `useTTS`).
  - `CardViewer.tsx` — look up any card by name, set+collector, or Scryfall UUID.
- `src/state/`
  - `gameStore.tsx` — Context + reducer for game state. `gameToCanonicalJson()` projects to the LLM-facing shape. `buildNewGameState()` constructs a fresh game from picked decks. `computeCombatResult()` is the pure damage-resolution helper used by the combat UI.
  - `deckLibrary.tsx` — Context-backed multi-deck library (decks + activeId). Migrates legacy single-deck localStorage on first load. Exports `mergeDeckCards()`.
  - `personaLibrary.tsx` — Context-backed AI persona library (personas + activeId). Mirrors `deckLibrary` exactly: same Provider+hook shape, same mutator surface (`createPersona`, `renamePersona`, `deletePersona`, `setActive`, `updatePersona`, `duplicatePersona`). Seeds three starter personas (Pyro the Reckless / Cerulean Sage / Verdant Warden) on first empty load. Each persona carries `name`, `archetypeLabel`, `personalityPrompt` (spliced into the brain prompt), `voice` (browser `voiceName`/`rate`/`pitch` + optional `openAiVoice` for the OpenAI TTS provider), and optional `defaultDeckId`.
  - `deckStore.ts` — thin shim around `useDeckLibrary()` that exposes `useDeck()` (active deck only) for backward compatibility with `PlayBar`.
  - `deckIO.ts` — `exportDeckToList(cards)` + `parseDeckList(text)`. Handles plain, MTGO-short, and Arena-expanded formats. Tolerates `Sideboard` sections (ignored for now).
- `src/api/scryfall.ts` — wrapper around `scryfall-client`. `fetchByName`, `fetchBySetAndNumber`, `fetchById`, `fetchAny` (smart router), `fetchCollection` (chunked at 75), `parseBulkLine` (set-lock aware), `looksLikeCollectorNumber`.
- `src/llm/` — shared LLM layer used by **both** the AI brain and the voice parser.
  - `client.ts` — Anthropic client + `structuredCall({ system, user, schema, model? })` wrapper around `messages.parse()` + `zodOutputFormat()`. Exposes `isLLMConfigured()` so UI can gracefully fall back when no key is set.
  - `actionSchemas.ts` — `GameAction` discriminated union (tap/untap/play/move/adjust_life/declare_attackers) + `AIProposal` + `VoiceActions`.
  - `applyActions.ts` — `applyActions(actions, state, dispatch)`: translates LLM-emitted actions into store dispatches, resolving card names to ids. Returns `{ applied, skipped }`.
  - `aiBrain.ts` — `proposeAIMove(state, persona?)`: enriches AI hand + battlefield with Scryfall oracle text (module-level cache), builds a per-phase prompt, returns a parsed `AIProposal`. Uses Sonnet 4.6. When a `persona` is passed, its `personalityPrompt` is prepended to `SYSTEM_PROMPT` under a `=== PERSONA ===` block — the base rules stay intact below.
- `src/voice/`
  - `useSpeech.ts` — Web Speech API hook (`webkitSpeechRecognition`). Returns `{ recording, transcript, start, stop, supported, error }`.
  - `useTTS.ts` — `window.speechSynthesis` wrapper (browser TTS provider). Returns `{ speak(text, opts?), cancel(), supported, speaking, voices, provider: 'browser' }`. Lazy-loads voices via the `voiceschanged` event, accepts per-call `voiceName`/`rate`/`pitch`/`volume`/`lang` overrides, cancels in-flight utterances before speaking new ones (no queue), Chrome `resume()` guard for long utterances. Exports the shared `TTSOptions` / `TTSVoice` / `TTSProvider` / `UseTTS` types.
  - `useOpenAITTS.ts` — OpenAI `gpt-4o-mini-tts` provider hook. Same `UseTTS` surface as the browser hook. Reads from `opts.openAiVoice` (alloy/echo/onyx/…) and `opts.instructions` (the persona's personalityPrompt — drives tone). `supported` is `true` only when `VITE_OPENAI_API_KEY` is set at build time. Uses AbortController + a single Audio element so cancel() tears down both in-flight fetches and playing audio.
  - `tts.tsx` — Provider selector. Exports `TTSPreferenceProvider`, `useTTSPreference()` (preference + resolved active provider + key-presence flag), and `useTTS()` — the canonical hook every consumer should use. Both underlying hooks are always mounted so flipping providers at runtime works without remounting. Preference persists to `mtg.ttsProvider.v1` (`'auto' | 'browser' | 'openai'`).
  - `parseVoice.ts` — `parseVoiceTranscript(transcript, state)`: sends transcript + canonical game JSON to Haiku 4.5, returns a parsed `VoiceActions`.
- `src/mocks/sampleDeck.ts` — fallback default deck with real Scryfall art baked inline. Used by `PlayBar` autocomplete when the user's deck library is empty.

## Dev
```
npm install
npm run dev
```
LLM key goes in `.env.local` (gitignored): `VITE_ANTHROPIC_API_KEY=sk-ant-...`. Without a key the AI brain falls back to a mock proposal and voice parsing shows an inline "key missing" message. Browser-side calls require `dangerouslyAllowBrowser: true` on the SDK (already set in `client.ts`).

Optional second key for higher-quality AI voice: `VITE_OPENAI_API_KEY=sk-...`. When present, the TTS selector defaults to OpenAI `gpt-4o-mini-tts` (which accepts the persona's personalityPrompt as `instructions` for tone steering). Without it, TTS falls back to the browser-native `speechSynthesis`. The Tweaks panel exposes a runtime override so you can flip between providers without restarting.

## LocalStorage keys (for cleanup / migration)
- `mtg.deckLibrary.v1` — the deck library (`{ decks, activeId }`)
- `mtg.deck.v1` — legacy single-deck key; auto-migrated into the library on first load
- `mtg.personaLibrary.v1` — the persona library (`{ personas, activeId }`). Seeded with three starters on first load.
- `mtg.lockedSet.v1` — Deck Manager's set lock (e.g. "FIN")
- `mtg.hintHidden` — coach panel visibility on the Battlefield
- `mtg.ttsMuted.v1` — `"1"` / `"0"` flag for the AI TTS mute toggle (header of the AIPersona panel)
- `mtg.ttsProvider.v1` — `"auto" | "browser" | "openai"` — selected TTS provider from the Tweaks panel (`auto` resolves to OpenAI when `VITE_OPENAI_API_KEY` is present, else browser)
