// Compatibility shim around the multi-deck library. Returns the active deck's
// cards + the basic mutators that existing call-sites (PlayBar, etc.) expect.
//
// New code should prefer `useDeckLibrary()` from ./deckLibrary directly.

import * as React from 'react';
import { useDeckLibrary, mergeDeckCards } from './deckLibrary';
import type { Card } from '../types';

export function useDeck() {
  const lib = useDeckLibrary();
  const deck = lib.active?.cards ?? [];

  const addCards = React.useCallback(
    (cards: Card[]) => {
      // No active deck yet? Create one so the add isn't lost.
      if (!lib.activeId) {
        lib.createDeck('Untitled deck', mergeDeckCards([], cards));
        return;
      }
      lib.updateActive((prev) => mergeDeckCards(prev, cards));
    },
    [lib],
  );

  const removeCard = React.useCallback(
    (id: string) => lib.updateActive((prev) => prev.filter((c) => c.id !== id)),
    [lib],
  );

  const adjustQty = React.useCallback(
    (id: string, delta: number) =>
      lib.updateActive((prev) =>
        prev
          .map((c) => (c.id === id ? { ...c, qty: Math.max(0, (c.qty ?? 1) + delta) } : c))
          .filter((c) => (c.qty ?? 1) > 0),
      ),
    [lib],
  );

  const clear = React.useCallback(() => lib.updateActive(() => []), [lib]);

  const setDeck = React.useCallback(
    (cards: Card[]) => lib.updateActive(() => cards),
    [lib],
  );

  return { deck, addCards, removeCard, adjustQty, clear, setDeck };
}
