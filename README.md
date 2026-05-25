# MTG Trainer (`mtg-irlai`)

A local, web-based companion for **playing Magic: The Gathering in person** against a Claude-powered AI opponent. The cardboard stays on the table — the app handles state tracking, voice commands, and AI move suggestions.

> **Status:** Personal-use tool. Single-user, runs entirely in your browser, stores state in `localStorage`, no backend.

---

## Why this exists

Playing MTG against an AI usually means digital cards on a screen. **MTG IRL AI** flips that: you keep playing with real cards on a real table, and the app sits beside you tracking state and proposing the AI's moves. You shuffle the AI's physical deck, deal its hand face-up, and tell the app what it has. When it's the AI's turn, you click "Take turn" and Claude reads the canonical board state + the cards' Oracle text and proposes a concrete, legal, mana-correct line of play. You approve or reject — and play out the real move with the physical cards.

Three core ideas drive the design:

1. **Human God Mode.** The app trusts you. No mana validation, no priority enforcement, no rules engine. You're the umpire; the app is the scoreboard.
2. **Open-Handed Physical Play.** The AI's hand lives on the table face-up — you draw and play its cards yourself. The app's "AI hand" is just a digital mirror you populate.
3. **LLM as Referee.** No hard-coded MTG rules. The brain reads the JSON game state plus the cards' actual Scryfall Oracle text and reasons from first principles. It knows what Prowess does because it can read it.

---

## Features

- **Battlefield view** — Life counters, phase tracker, action log, both players' battlefields, AI's open hand, combat declaration UI (attackers + blockers with auto-blocker assignment), coach hints.
- **Deck Manager** — Multi-deck library with editable names, deck switcher, duplicate / delete, **import** any standard MTG deck list (Arena, MTGO, Moxfield, plain), **export** to clipboard.
- **AI Personas** — Save and switch between named AI opponents. Each persona has an archetype label, a personality prompt spliced into the AI brain's system prompt, and its own voice config (rate / pitch / system voice). Three starters are seeded on first run — Pyro the Reckless, Cerulean Sage, Verdant Warden. Pick a persona at game start from the New Game modal.
- **AI voice (text-to-speech)** — When unmuted, the AI's narration is read aloud using the active persona's voice config. Two providers: the browser's native `speechSynthesis` (free, offline, OS voices) or **OpenAI `gpt-4o-mini-tts`** (paid, higher quality, accepts the persona's personality prompt as live tone steering). Switch between them anytime from Tweaks → AI voice. Speaker/mute toggle lives in the AI panel header.
- **Card Viewer** — Look up any Magic card by name, set + collector number, or Scryfall UUID. Full art + Oracle text + metadata.
- **AI Brain (Claude Sonnet 4.6)** — Reads the canonical game JSON and the AI's full Oracle text, proposes structured moves grounded in actual card rules. Phase-aware: passes appropriately on Untap/Draw/End, plays real moves on Main/Combat. Persona-flavored when one is active.
- **Voice parser (Claude Haiku 4.5)** — Hold the mic button, speak a command ("tap two islands and send Snapcaster to the graveyard"), release. The transcript flows through structured output into actual state changes.
- **Set lock** — Pin a set code (e.g. `FIN`) so single-card entry and bulk paste accept bare collector numbers (`4 186`) without retyping the set.
- **Real Scryfall card art** baked in for the default demo cards, and fetched on demand for anything you add.
- **Zoom on any card** — Magnifier in the corner opens a full-size detail view with complete Oracle text.
- **Standard deck-list I/O** — Round-trip with Moxfield, Arena, MTGGoldfish, MTGO etc.
- **JSON debug panel** — Toggle a live view of the canonical game state from the sidebar; copy as JSON.

---

## Quickstart

### Prerequisites

- **Node.js 20+** (tested on 24)
- **npm 10+**
- A modern Chromium-based browser if you want voice input (Web Speech API)

### Install + run

```bash
git clone https://github.com/Flunkus/mtg-irlai.git
cd mtg-irlai
npm install
npm run dev
```

Open <http://localhost:5173>.

The app boots with a default demo deck (mono-blue Azure Tempo) and a mock AI hand (mono-red burn) so you can poke around immediately — no API key required for that part.

### Configure the AI (optional but recommended)

The AI brain and voice parser need an Anthropic API key. Without one, the brain falls back to a local mock proposal labeled `(mock)` and voice input shows a friendly "key missing" message.

1. Get a key at <https://console.anthropic.com> → API keys → Create Key (you'll need to fund the account; $5 covers hundreds of AI turns at Sonnet 4.6 rates).
2. Copy the example env file:
   ```bash
   cp .env.local.example .env.local
   ```
3. Paste your key:
   ```
   VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
   ```
4. **Restart `npm run dev`** — Vite only reads env vars on boot, not on hot reload.

**Security note:** the key is bundled into the browser at build time. That's fine for local single-user use; **do not deploy this app publicly with a real key embedded.**

### Optional: better AI voice via OpenAI TTS

By default the AI's narration is read aloud through the browser's native `speechSynthesis` — free, offline, but voice quality depends on what your OS ships. If you want noticeably better voices (plus persona-tone steering on `gpt-4o-mini-tts`), add an OpenAI key alongside the Anthropic one in `.env.local`:

```
VITE_OPENAI_API_KEY=sk-...
```

Restart `npm run dev`. Tweaks → AI voice will then default to **Auto (OpenAI)**, and you can switch back to **Browser (free, offline)** anytime from that same dropdown — no env edits required. Cost is tiny for personal use (~$0.60/min of generated audio, and AI lines average a few seconds). Same security caveat applies: don't deploy publicly with the key embedded.

### Cost

The Anthropic API is billed separately from any Claude.ai Pro / Team subscription — pay-per-token against a prepaid balance, not your chat plan.

- AI Brain (Sonnet 4.6): a few cents per AI turn (it sends ~2–5 KB of prompt + Oracle text, gets ~400–800 tokens back).
- Voice parser (Haiku 4.5): a fraction of a cent per command.

---

## Scripts

| Script               | What it does                                    |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | Vite dev server with HMR on port 5173           |
| `npm run build`      | Type-check (`tsc -b`) then production build     |
| `npm run preview`    | Serve the built bundle locally                  |
| `npm run typecheck`  | Type-check only (no emit)                       |

---

## Project structure

```
src/
├── App.tsx                    # Root shell: providers, sidebar, view switching
├── main.tsx                   # React entry
├── types.ts                   # Shared types: Card, ManaColor, Phase, etc.
├── index.css                  # :root vars, keyframes, scrollbar (ported from mockup)
├── api/
│   └── scryfall.ts            # Scryfall wrapper + bulk-line parser
├── components/
│   ├── AIPersona.tsx          # AI opponent face + speech bubble + Take-turn button + TTS mute toggle
│   ├── CardDetailModal.tsx    # Zoom modal (art + full Oracle + metadata)
│   ├── CardToken.tsx          # The universal card visual (xs/sm/md/lg)
│   ├── HintCoach.tsx          # Contextual phase hints
│   ├── JsonDebugPanel.tsx     # Live canonical JSON overlay
│   ├── NewGameModal.tsx       # New game flow (decks + life + hand size + persona)
│   ├── PlayBar.tsx            # "Log a play" bar with You/AI side toggle
│   ├── Sidebar.tsx            # Vertical nav (Battlefield/Deck/Personas/Card + Tweaks)
│   └── TweaksPanel.tsx        # Floating Tweaks panel (accent color)
├── llm/                       # Shared LLM layer (brain + voice)
│   ├── client.ts              # Anthropic client + structuredCall helper
│   ├── actionSchemas.ts       # GameAction + AIProposal + VoiceActions (Zod)
│   ├── applyActions.ts        # Dispatch translator (LLM actions → store)
│   └── aiBrain.ts             # proposeAIMove() — Sonnet 4.6
├── mocks/
│   └── sampleDeck.ts          # Default demo deck with real Scryfall art baked in
├── state/
│   ├── gameStore.tsx          # Context + reducer + buildNewGameState + JSON projection
│   ├── deckLibrary.tsx        # Multi-deck Provider + useDeckLibrary hook
│   ├── personaLibrary.tsx     # Multi-persona Provider + usePersonaLibrary hook (seeds 3 starters)
│   ├── deckStore.ts           # Compat shim: useDeck() over the active deck
│   └── deckIO.ts              # parseDeckList() + exportDeckToList()
├── views/
│   ├── Battlefield.tsx        # Main play view
│   ├── DeckManager.tsx        # Library, import, export, set lock
│   ├── PersonaManager.tsx     # Persona library editor (name / archetype / prompt / voice)
│   └── CardViewer.tsx         # Any-card lookup
└── voice/
    ├── useSpeech.ts           # webkitSpeechRecognition hook (input)
    ├── useTTS.ts              # window.speechSynthesis hook (output, browser)
    ├── useOpenAITTS.ts        # OpenAI /v1/audio/speech hook (output, paid)
    ├── tts.tsx                # TTSPreferenceProvider + useTTS() selector (auto/browser/openai)
    └── parseVoice.ts          # Transcript → structured GameAction[] via Haiku
claude-design-mockup/           # Original static design — reference only, do not edit
```

See `CLAUDE.md` for AI-coding-session context (architecture deep dive, conventions, hard rules).

---

## How it works (in one screen)

1. **Game state** lives in a React Context backed by a `useReducer`. The state shape is the canonical JSON the LLM consumes — there's no separate "view model" vs "LLM model" projection beyond trimming card objects down to `{ id, name, tapped }`.

2. **Deck library** is a separate Context with its own localStorage key. Decks store full Scryfall cards (with image URLs and Oracle text) so the app survives offline once you've imported.

3. **AI brain** is invoked on demand by the "Take turn" button. It:
   - Reads the canonical game JSON via `gameToCanonicalJson(state)`.
   - Enriches the AI's hand + battlefield with Oracle text (fetched on first use, cached for the session).
   - Calls `client.messages.parse()` with a Zod-derived JSON Schema (`AIProposalSchema`) so the response is type-safe end-to-end.
   - Returns a proposal with title / summary / reasons / `actions[]` / damage.
   - On approve, `applyActions()` dispatches the actions through the game reducer.

4. **Voice** reuses the same structuredCall helper, just with a different schema (`VoiceActionsSchema`) and a different system prompt. Web Speech captures the transcript, Haiku turns it into actions, `applyActions` applies them.

5. **All visual styling** was ported verbatim from a static React-via-Babel mockup in `claude-design-mockup/`. The hard rule is that those styles never get redesigned — we only add logic underneath them.

---

## Browser support

- **Chromium-based (Chrome, Edge, Brave, Arc):** everything works — voice input (STT), voice output (TTS), and all UI.
- **Firefox / Safari:** voice **output** (AI TTS narration) works fine — `speechSynthesis` is supported. Voice **input** (mic / `webkitSpeechRecognition`) is not; the mic button shows an inline "voice input not supported in this browser" hint.
- **Mobile:** untested. The layout is desktop-oriented (fixed three-column structure). The card zoom modal is the only mobile-friendly affordance right now. Note iOS Safari requires a user gesture before TTS plays for the first time.

---

## Known limitations

- **AI side handles damage holistically.** When the brain proposes an attack, it folds combat damage into a single `adjust_life` action rather than walking the human through the blocker UI. The Battlefield's combat UI is for the *human's* attacks against the AI.
- **No real shuffle / draw determinism for the AI.** The AI's "library" is a count, not a real shuffled deck — you manually tell the app what the AI drew. This matches the physical-play model: the physical deck *is* the source of truth.
- **No sideboard support** in the deck list importer (sections labeled `Sideboard` are tolerated but ignored).
- **No tests.** Verification has been manual-via-browser. Adding Vitest coverage would be a natural next step.
- **The default sample deck** is hand-curated mono-blue + mono-red. Build your own decks via the Deck Manager.

---

## Acknowledgements

- **[Scryfall](https://scryfall.com/)** for the card data and images. Per [their image policy](https://scryfall.com/docs/api/images), images are used here for personal, non-commercial use.
- **[Anthropic](https://www.anthropic.com/)** for Claude, which makes the AI opponent actually able to reason about cards rather than just pattern-match.
- **Magic: The Gathering** is © Wizards of the Coast. This app is an unofficial fan tool, not endorsed by or affiliated with Wizards of the Coast.

---

## License

MIT — see [LICENSE](./LICENSE).
