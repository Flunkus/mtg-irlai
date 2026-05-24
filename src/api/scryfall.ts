// Scryfall API wrapper.
// Uses the official scryfall-client package, normalizes results into our Card shape.

import scryfallRaw from 'scryfall-client';
import type { Card, ManaColor, Rarity } from '../types';

// scryfall-client is a CJS package; Vite's ESM interop sometimes nests the
// real API under .default. Normalize so both shapes work.
const scryfall = ((scryfallRaw as unknown) as { default?: typeof scryfallRaw }).default ?? scryfallRaw;

// Be polite. Scryfall asks for 50–100ms between requests.
scryfall.setApiRequestDelayTime(80);

/** A minimal projection of Scryfall's card model — only the fields we read. */
interface ScryfallCardLike {
  id: string;
  name: string;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  cmc?: number;
  colors?: string[];
  power?: string;
  toughness?: string;
  rarity: string;
  set?: string;
  collector_number?: string;
  image_uris?: { normal?: string; large?: string; small?: string };
  card_faces?: Array<{
    image_uris?: { normal?: string; large?: string; small?: string };
    mana_cost?: string;
    oracle_text?: string;
    type_line?: string;
  }>;
}

/** Strip Scryfall's {1}{U}{U} braces to "1UU" for our existing ManaCost renderer. */
function compactCost(manaCost?: string): string {
  if (!manaCost) return '';
  return manaCost.replace(/[{}]/g, '');
}

/** Scryfall colors are W/U/B/R/G; empty array means colorless ("C" in our scheme). */
function normalizeColors(colors?: string[]): ManaColor[] {
  if (!colors || colors.length === 0) return ['C'];
  return colors.filter((c): c is ManaColor => 'WUBRG'.includes(c));
}

function imageUrl(c: ScryfallCardLike): string | undefined {
  return c.image_uris?.normal || c.image_uris?.large || c.card_faces?.[0]?.image_uris?.normal;
}

function ptString(power?: string, toughness?: string): string | null {
  if (power == null && toughness == null) return null;
  return `${power ?? '?'}/${toughness ?? '?'}`;
}

/**
 * Map a Scryfall card to our app's Card shape. Preserves the fields
 * CLAUDE.md asks us to persist: name, oracle_text, mana_cost, type_line, image_uris.normal.
 */
export function toAppCard(sc: ScryfallCardLike, qty = 1): Card {
  const isCreature = /Creature/i.test(sc.type_line);
  return {
    id: 'sc-' + sc.id,
    scryfallId: sc.id,
    name: sc.name,
    cost: compactCost(sc.mana_cost ?? sc.card_faces?.[0]?.mana_cost),
    type: sc.type_line,
    pt: isCreature ? ptString(sc.power, sc.toughness) : null,
    colors: normalizeColors(sc.colors),
    rarity: sc.rarity as Rarity,
    qty,
    imageUrl: imageUrl(sc),
    oracleText: sc.oracle_text ?? sc.card_faces?.[0]?.oracle_text,
    set: sc.set,
    collectorNumber: sc.collector_number,
    cmc: sc.cmc,
    power: sc.power,
    toughness: sc.toughness,
  };
}

export async function fetchByName(name: string): Promise<Card> {
  const sc = (await scryfall.getCardNamed(name)) as unknown as ScryfallCardLike;
  return toAppCard(sc);
}

export async function fetchBySetAndNumber(set: string, collectorNumber: string): Promise<Card> {
  const sc = (await scryfall.getCardBySetCodeAndCollectorNumber(
    set,
    collectorNumber,
  )) as unknown as ScryfallCardLike;
  return toAppCard(sc);
}

/** Fetch a single card by its Scryfall UUID. */
export async function fetchById(id: string): Promise<Card> {
  const sc = (await scryfall.getCard(id, 'id')) as unknown as ScryfallCardLike;
  return toAppCard(sc);
}

/**
 * Best-effort smart lookup for the card viewer. Tries, in order:
 * 1. Scryfall UUID (8-4-4-4-12 hex pattern)
 * 2. "SET COLLECTOR" pattern (e.g. "MH2 186")
 * 3. Fall through to fuzzy name lookup
 */
export async function fetchAny(query: string): Promise<Card> {
  const trimmed = query.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return fetchById(trimmed);
  }
  const setMatch = trimmed.match(/^([A-Za-z0-9]{2,5})\s+(\S+)$/);
  if (setMatch) {
    try {
      return await fetchBySetAndNumber(setMatch[1].toLowerCase(), setMatch[2]);
    } catch {
      // Fall through to name lookup if set/number didn't resolve.
    }
  }
  return fetchByName(trimmed);
}

/**
 * Batched lookup. Scryfall's /cards/collection caps at 75 identifiers per request,
 * so we chunk. Each input entry carries an optional `qty` we propagate into the result.
 */
export type CollectionRequest =
  | { qty?: number; name: string }
  | { qty?: number; name: string; set: string }
  | { qty?: number; set: string; collector_number: string };

export async function fetchCollection(requests: CollectionRequest[]): Promise<{
  found: Card[];
  notFound: CollectionRequest[];
}> {
  const found: Card[] = [];
  const notFound: CollectionRequest[] = [];

  for (let i = 0; i < requests.length; i += 75) {
    const chunk = requests.slice(i, i + 75);
    const identifiers = chunk.map((r) => {
      const { qty: _qty, ...id } = r as Record<string, unknown>;
      return id as Parameters<typeof scryfall.getCollection>[0][number];
    });

    const list = (await scryfall.getCollection(identifiers)) as unknown as {
      not_found?: unknown[];
      [Symbol.iterator]?: () => Iterator<ScryfallCardLike>;
      length?: number;
    };

    // List<Card> from scryfall-client is iterable and has a `not_found` array.
    const cards: ScryfallCardLike[] = [];
    if (typeof (list as Iterable<unknown>)[Symbol.iterator] === 'function') {
      for (const c of list as Iterable<ScryfallCardLike>) cards.push(c);
    }

    // Pair each returned card with its originating qty by matching name (best-effort).
    for (const sc of cards) {
      const match = chunk.find(
        (r) => 'name' in r && r.name.toLowerCase() === sc.name.toLowerCase(),
      );
      found.push(toAppCard(sc, match?.qty ?? 1));
    }
    if (Array.isArray(list.not_found)) {
      for (const nf of list.not_found as Record<string, unknown>[]) {
        const match = chunk.find((r) => {
          if ('name' in r && 'name' in nf) return r.name === nf.name;
          if ('set' in r && 'set' in nf && 'collector_number' in r && 'collector_number' in nf) {
            return r.set === nf.set && r.collector_number === nf.collector_number;
          }
          return false;
        });
        if (match) notFound.push(match);
      }
    }
  }
  return { found, notFound };
}

/**
 * Parse a bulk-paste line. Supports:
 *   "4 Brainstorm"             → qty + name
 *   "4x Brainstorm"            → qty + name
 *   "4 MH2 186"                → explicit set + collector
 *   "4 186"  (with lockedSet)  → uses lockedSet + collector
 *   "Brainstorm"               → qty=1, name
 * Returns null for blank/comment lines.
 */
export function parseBulkLine(line: string, lockedSet?: string): CollectionRequest | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return null;

  // 1. Explicit set + collector — "4 FIN 186" or "4 MH2 186".
  const setMatch = trimmed.match(/^(\d+)\s*x?\s+([A-Za-z0-9]{2,5})\s+(\S+)$/);
  if (setMatch) {
    return {
      qty: parseInt(setMatch[1]),
      set: setMatch[2].toLowerCase(),
      collector_number: setMatch[3],
    };
  }

  // 2. Locked-set + bare collector — "4 186" / "4 186a" / "4 ★12".
  //    Only fires when lockedSet is non-empty AND the second token looks like
  //    a collector number (digits with optional letter suffix and/or star).
  if (lockedSet && lockedSet.trim()) {
    const lockedMatch = trimmed.match(/^(\d+)\s*x?\s+(★?\d+[A-Za-z]?★?)$/);
    if (lockedMatch) {
      return {
        qty: parseInt(lockedMatch[1]),
        set: lockedSet.trim().toLowerCase(),
        collector_number: lockedMatch[2],
      };
    }
  }

  // 3. Qty + name — "4 Lightning Bolt".
  const nameMatch = trimmed.match(/^(\d+)\s*x?\s+(.+)$/i);
  if (nameMatch) {
    return { qty: parseInt(nameMatch[1]), name: nameMatch[2].trim() };
  }

  // 4. Bare name.
  return { qty: 1, name: trimmed };
}

/** True when the token looks like a Scryfall collector number (digits + optional letter/star). */
export function looksLikeCollectorNumber(s: string): boolean {
  return /^★?\d+[A-Za-z]?★?$/.test(s.trim());
}
