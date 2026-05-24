// Multi-deck library. Each saved deck has an id, a user-given name, and its cards.
// State lives in a single Context provider so every consumer (deck manager UI,
// useDeck shim used by PlayBar, etc.) sees the same instance.

import * as React from 'react';
import type { Card } from '../types';

const LIBRARY_KEY = 'mtg.deckLibrary.v1';
const LEGACY_KEY = 'mtg.deck.v1';

export interface SavedDeck {
  id: string;
  name: string;
  cards: Card[];
  createdAt: number;
  updatedAt: number;
}

interface LibraryState {
  decks: SavedDeck[];
  activeId: string | null;
}

function freshId(): string {
  return 'deck-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

function loadInitial(): LibraryState {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.decks)) return parsed as LibraryState;
    }
    // First load — migrate legacy single-deck data if present, otherwise start empty.
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacyCards = JSON.parse(legacyRaw) as Card[];
      if (Array.isArray(legacyCards) && legacyCards.length > 0) {
        const id = freshId();
        const deck: SavedDeck = {
          id,
          name: 'Azure Tempo',
          cards: legacyCards,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return { decks: [deck], activeId: id };
      }
    }
    return { decks: [], activeId: null };
  } catch {
    return { decks: [], activeId: null };
  }
}

function persist(state: LibraryState) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(state));
  } catch {
    /* quota or disabled */
  }
}

/**
 * Merge incoming cards into an existing array, summing qty when two cards share
 * a scryfallId or name (case-insensitive).
 */
export function mergeDeckCards(existing: Card[], incoming: Card[]): Card[] {
  const out = [...existing];
  for (const c of incoming) {
    const idx = out.findIndex(
      (x) =>
        (c.scryfallId && x.scryfallId === c.scryfallId) ||
        x.name.toLowerCase() === c.name.toLowerCase(),
    );
    if (idx >= 0) {
      out[idx] = { ...out[idx], qty: (out[idx].qty ?? 1) + (c.qty ?? 1) };
    } else {
      out.unshift(c);
    }
  }
  return out;
}

/* ── Context + Provider ──────────────────────────────────────────────── */

interface DeckLibraryContextValue {
  state: LibraryState;
  setState: React.Dispatch<React.SetStateAction<LibraryState>>;
}

const DeckLibraryContext = React.createContext<DeckLibraryContextValue | null>(null);

export function DeckLibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<LibraryState>(loadInitial);
  React.useEffect(() => persist(state), [state]);
  const value = React.useMemo(() => ({ state, setState }), [state]);
  return <DeckLibraryContext.Provider value={value}>{children}</DeckLibraryContext.Provider>;
}

/* ── Hook ────────────────────────────────────────────────────────────── */

export function useDeckLibrary() {
  const ctx = React.useContext(DeckLibraryContext);
  if (!ctx) throw new Error('useDeckLibrary must be used inside <DeckLibraryProvider>');
  const { state, setState } = ctx;

  const active = React.useMemo(
    () => state.decks.find((d) => d.id === state.activeId) ?? null,
    [state.decks, state.activeId],
  );

  const createDeck = React.useCallback(
    (name = 'Untitled deck', cards: Card[] = []): string => {
      const id = freshId();
      const deck: SavedDeck = {
        id,
        name,
        cards,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setState((s) => ({ decks: [deck, ...s.decks], activeId: id }));
      return id;
    },
    [setState],
  );

  const renameDeck = React.useCallback(
    (id: string, name: string) => {
      setState((s) => ({
        ...s,
        decks: s.decks.map((d) => (d.id === id ? { ...d, name, updatedAt: Date.now() } : d)),
      }));
    },
    [setState],
  );

  const deleteDeck = React.useCallback(
    (id: string) => {
      setState((s) => {
        const decks = s.decks.filter((d) => d.id !== id);
        const activeId = s.activeId === id ? (decks[0]?.id ?? null) : s.activeId;
        return { decks, activeId };
      });
    },
    [setState],
  );

  const setActive = React.useCallback(
    (id: string) => {
      setState((s) => (s.decks.some((d) => d.id === id) ? { ...s, activeId: id } : s));
    },
    [setState],
  );

  const updateActive = React.useCallback(
    (updater: (cards: Card[]) => Card[]) => {
      setState((s) => {
        if (!s.activeId) return s;
        return {
          ...s,
          decks: s.decks.map((d) =>
            d.id === s.activeId ? { ...d, cards: updater(d.cards), updatedAt: Date.now() } : d,
          ),
        };
      });
    },
    [setState],
  );

  const duplicateDeck = React.useCallback(
    (id: string): string | null => {
      const src = state.decks.find((d) => d.id === id);
      if (!src) return null;
      return createDeck(`${src.name} (copy)`, src.cards.map((c) => ({ ...c })));
    },
    [state.decks, createDeck],
  );

  return {
    decks: state.decks,
    activeId: state.activeId,
    active,
    createDeck,
    renameDeck,
    deleteDeck,
    setActive,
    updateActive,
    duplicateDeck,
  };
}
