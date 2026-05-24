// Import / export decks in the standard MTG list format.
// Standard format (Arena / MTGO / MTGGoldfish / Moxfield all interoperable):
//
//   4 Lightning Bolt
//   4 Counterspell
//   2 Jace, the Mind Sculptor
//   ...
//
// A blank line followed by "Sideboard" begins a sideboard section, which we
// currently parse but ignore (no sideboard in the app yet).

import type { Card } from '../types';

/**
 * Serialize a deck to standard list format.
 * Example output:
 *   4 Brainstorm
 *   4 Counterspell
 *   ...
 */
export function exportDeckToList(cards: Card[]): string {
  return cards
    .map((c) => `${c.qty ?? 1} ${c.name}`)
    .join('\n');
}

/**
 * Variant of exportDeckToList that includes the set+collector when present.
 * Format: "4 Lightning Bolt (LEA) 161" — Arena's expanded form.
 */
export function exportDeckToListWithSets(cards: Card[]): string {
  return cards
    .map((c) => {
      const qty = c.qty ?? 1;
      if (c.set && c.collectorNumber) {
        return `${qty} ${c.name} (${c.set.toUpperCase()}) ${c.collectorNumber}`;
      }
      return `${qty} ${c.name}`;
    })
    .join('\n');
}

export interface ParsedDeckLine {
  qty: number;
  name?: string;
  set?: string;
  collectorNumber?: string;
}

export interface ParsedDeck {
  mainboard: ParsedDeckLine[];
  sideboard: ParsedDeckLine[];
}

/**
 * Parse a deck list. Tolerates blank lines, "//" comments, and Arena-style
 * sideboard sections. Recognizes:
 *   "4 Lightning Bolt"
 *   "4x Lightning Bolt"
 *   "4 Lightning Bolt (LEA) 161"   ← Arena expanded
 *   "4 LEA 161"                     ← MTGO short
 *   "Lightning Bolt"                ← qty defaults to 1
 *
 * Lines starting with "Deck" or "Sideboard" act as section markers.
 */
export function parseDeckList(text: string): ParsedDeck {
  const lines = text.split(/\r?\n/);
  const out: ParsedDeck = { mainboard: [], sideboard: [] };
  let section: 'mainboard' | 'sideboard' = 'mainboard';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('//') || line.startsWith('#')) continue;
    if (/^sideboard\b/i.test(line)) {
      section = 'sideboard';
      continue;
    }
    if (/^(deck|commander|mainboard|main)\b/i.test(line) && !/\d/.test(line)) {
      section = 'mainboard';
      continue;
    }

    const parsed = parseDeckListLine(line);
    if (parsed) out[section].push(parsed);
  }

  return out;
}

function parseDeckListLine(line: string): ParsedDeckLine | null {
  // 1. Arena expanded: "4 Lightning Bolt (LEA) 161"
  const arena = line.match(/^(\d+)\s*x?\s+(.+?)\s+\(([A-Za-z0-9]{2,5})\)\s+(\S+)$/);
  if (arena) {
    return {
      qty: parseInt(arena[1]),
      name: arena[2].trim(),
      set: arena[3].toLowerCase(),
      collectorNumber: arena[4],
    };
  }

  // 2. MTGO short: "4 LEA 161" — set must contain at least one letter to disambiguate from a name.
  const mtgo = line.match(/^(\d+)\s*x?\s+([A-Za-z][A-Za-z0-9]{1,4})\s+(\d+[a-zA-Z]?)$/);
  if (mtgo) {
    return {
      qty: parseInt(mtgo[1]),
      set: mtgo[2].toLowerCase(),
      collectorNumber: mtgo[3],
    };
  }

  // 3. Qty + name
  const nameMatch = line.match(/^(\d+)\s*x?\s+(.+)$/i);
  if (nameMatch) {
    return { qty: parseInt(nameMatch[1]), name: nameMatch[2].trim() };
  }

  // 4. Bare name
  return { qty: 1, name: line };
}
