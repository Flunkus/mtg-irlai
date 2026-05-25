// AI persona library. Each saved persona has a name, an archetype label
// (e.g. "Mono-Red Burn"), a personality prompt that's spliced into the AI
// brain's system prompt, and a voice config consumed by the TTS hook.
//
// Mirrors src/state/deckLibrary.tsx — same Provider+Context shape, same
// mutator surface, same localStorage migration pattern.

import * as React from 'react';

const LIBRARY_KEY = 'mtg.personaLibrary.v1';

export interface PersonaVoice {
  /** Browser TTS voice: display name from speechSynthesis.getVoices(). Optional — falls back to default voice. */
  voiceName?: string;
  /** OpenAI TTS voice id (alloy, echo, onyx, …). Used only when the OpenAI TTS provider is active. */
  openAiVoice?: string;
  /** 0.5–2, default 1. Browser TTS only — OpenAI voices have fixed prosody (use personalityPrompt for tone). */
  rate: number;
  /** 0–2, default 1. Browser TTS only. */
  pitch: number;
}

export interface Persona {
  id: string;
  name: string;
  /** Short tagline shown under the name in the AIPersona panel, e.g. "Mono-Red Burn". */
  archetypeLabel: string;
  /** Spliced into aiBrain's SYSTEM_PROMPT to flavor the AI's play style + voice. */
  personalityPrompt: string;
  voice: PersonaVoice;
  /** Optional preferred deck — pre-fills the AI deck dropdown in NewGameModal. */
  defaultDeckId?: string;
  createdAt: number;
  updatedAt: number;
}

interface LibraryState {
  personas: Persona[];
  activeId: string | null;
}

function freshId(): string {
  return 'persona-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

/* ── Default starter personas ─────────────────────────────────────────── */

function seedStarters(): Persona[] {
  const now = Date.now();
  return [
    {
      id: freshId(),
      name: 'Pyro the Reckless',
      archetypeLabel: 'Mono-Red Burn',
      personalityPrompt: [
        'You play Mono-Red Burn. Your win condition is reducing the opponent to 0 as fast as physically possible.',
        'Mindset: aggressive, all-in, no patience for long games. Every turn should advance the clock.',
        'Tone of voice: brash, taunting, swaggering. Short sentences. Mock the opponent\'s slow draws.',
        'When you speak (in narration / summary / reasons), you sound like a goblin pyromaniac who already wrote the obituary. Use phrases like "burn it down", "face is the place", "tick tock".',
        'Strategy bias: prefer face damage over creature removal. Hold burn for the kill, but cast it at face if the race demands. Trade creatures eagerly when it advances damage.',
      ].join('\n'),
      voice: { rate: 1.15, pitch: 1.1, openAiVoice: 'ash' },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: freshId(),
      name: 'Cerulean Sage',
      archetypeLabel: 'Mono-Blue Control',
      personalityPrompt: [
        'You play Mono-Blue Control. Your win condition is exhausting the opponent\'s resources, then closing with a single threat over many turns.',
        'Mindset: patient, methodical, comfortable doing nothing for several turns while holding answers.',
        'Tone of voice: dismissive, condescending, calm. Long pauses implied. You speak like a tenured professor watching an undergraduate flail.',
        'When you speak, use phrases like "as expected", "noted", "interesting choice — for you". Never raise your voice.',
        'Strategy bias: always hold mana up for counters during the opponent\'s turn. Pass priority on your own main phases if no proactive play is strictly better than holding interaction.',
      ].join('\n'),
      voice: { rate: 0.9, pitch: 0.95, openAiVoice: 'sage' },
      createdAt: now + 1,
      updatedAt: now + 1,
    },
    {
      id: freshId(),
      name: 'Verdant Warden',
      archetypeLabel: 'Mono-Green Stompy',
      personalityPrompt: [
        'You play Mono-Green Stompy / midrange. Your win condition is bigger creatures, more mana, and a steady ground assault.',
        'Mindset: calm, deliberate, confident in the long game. You don\'t panic and you don\'t bluff.',
        'Tone of voice: measured, grounded, almost druidic. Speak in plain declarative sentences. No theatrics.',
        'When you speak, use phrases like "the forest grows", "patience", "they fall in turn". Refer to your creatures with respect.',
        'Strategy bias: ramp first, threats second, removal only when necessary. Attack with everything that has good combat math; hold creatures back only if a clear trade or chump-block is needed.',
      ].join('\n'),
      voice: { rate: 0.95, pitch: 0.9, openAiVoice: 'onyx' },
      createdAt: now + 2,
      updatedAt: now + 2,
    },
  ];
}

function loadInitial(): LibraryState {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.personas)) return parsed as LibraryState;
    }
    const seeded = seedStarters();
    return { personas: seeded, activeId: seeded[0]?.id ?? null };
  } catch {
    return { personas: [], activeId: null };
  }
}

function persist(state: LibraryState) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(state));
  } catch {
    /* quota or disabled */
  }
}

/* ── Context + Provider ──────────────────────────────────────────────── */

interface PersonaLibraryContextValue {
  state: LibraryState;
  setState: React.Dispatch<React.SetStateAction<LibraryState>>;
}

const PersonaLibraryContext = React.createContext<PersonaLibraryContextValue | null>(null);

export function PersonaLibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<LibraryState>(loadInitial);
  React.useEffect(() => persist(state), [state]);
  const value = React.useMemo(() => ({ state, setState }), [state]);
  return <PersonaLibraryContext.Provider value={value}>{children}</PersonaLibraryContext.Provider>;
}

/* ── Hook ────────────────────────────────────────────────────────────── */

const DEFAULT_VOICE: PersonaVoice = { rate: 1, pitch: 1 };

function makeBlankPersona(name: string): Persona {
  const now = Date.now();
  return {
    id: freshId(),
    name,
    archetypeLabel: 'Custom archetype',
    personalityPrompt: '',
    voice: { ...DEFAULT_VOICE },
    createdAt: now,
    updatedAt: now,
  };
}

export function usePersonaLibrary() {
  const ctx = React.useContext(PersonaLibraryContext);
  if (!ctx) throw new Error('usePersonaLibrary must be used inside <PersonaLibraryProvider>');
  const { state, setState } = ctx;

  const active = React.useMemo(
    () => state.personas.find((p) => p.id === state.activeId) ?? null,
    [state.personas, state.activeId],
  );

  const createPersona = React.useCallback(
    (name = 'New persona'): string => {
      const p = makeBlankPersona(name);
      setState((s) => ({ personas: [p, ...s.personas], activeId: p.id }));
      return p.id;
    },
    [setState],
  );

  const renamePersona = React.useCallback(
    (id: string, name: string) => {
      setState((s) => ({
        ...s,
        personas: s.personas.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p)),
      }));
    },
    [setState],
  );

  const deletePersona = React.useCallback(
    (id: string) => {
      setState((s) => {
        const personas = s.personas.filter((p) => p.id !== id);
        const activeId = s.activeId === id ? (personas[0]?.id ?? null) : s.activeId;
        return { personas, activeId };
      });
    },
    [setState],
  );

  const setActive = React.useCallback(
    (id: string) => {
      setState((s) => (s.personas.some((p) => p.id === id) ? { ...s, activeId: id } : s));
    },
    [setState],
  );

  const updatePersona = React.useCallback(
    (id: string, patch: Partial<Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>>) => {
      setState((s) => ({
        ...s,
        personas: s.personas.map((p) =>
          p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
        ),
      }));
    },
    [setState],
  );

  const duplicatePersona = React.useCallback(
    (id: string): string | null => {
      const src = state.personas.find((p) => p.id === id);
      if (!src) return null;
      const copy: Persona = {
        ...src,
        id: freshId(),
        name: `${src.name} (copy)`,
        voice: { ...src.voice },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setState((s) => ({ personas: [copy, ...s.personas], activeId: copy.id }));
      return copy.id;
    },
    [state.personas, setState],
  );

  return {
    personas: state.personas,
    activeId: state.activeId,
    active,
    createPersona,
    renamePersona,
    deletePersona,
    setActive,
    updatePersona,
    duplicatePersona,
  };
}
