// Deterministic mana/resource model for the AI side.
//
// LLMs are unreliable at counting and arithmetic. Rather than ask the brain to
// tally untapped lands, track land drops, and verify casting costs by itself
// (which produced the hallucinations in the bug report — paying a 1W spell with a
// single Plains, tapping a land that "enters tapped", playing two lands a turn),
// we compute these resources HERE and feed them to the prompt as ground truth.
//
// This is NOT a rules engine that blocks the human — it only grounds the AI's
// own reasoning, exactly the "LLM as referee, given good state" model in CLAUDE.md.

import type { Card, ManaColor } from '../types';

const COLORS: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];

const BASIC_LAND_COLOR: Record<string, ManaColor> = {
  plains: 'W',
  island: 'U',
  swamp: 'B',
  mountain: 'R',
  forest: 'G',
  wastes: 'C',
};

export interface ParsedCost {
  /** Generic (numeric) portion of the cost, e.g. the "1" in 1W. */
  generic: number;
  /** Colored pip counts, e.g. {W:1} for 1W or {U:2} for UU. */
  pips: Partial<Record<ManaColor, number>>;
  /** Total converted mana cost. */
  cmc: number;
  /** True if the cost couldn't be parsed (unknown/empty) — caller should not assume affordability. */
  unknown: boolean;
}

/**
 * Parse a compact mana cost string like "1W", "UU", "3", "{2}{G}{G}" into a
 * structured cost. Tolerates both the bare compact form we persist (`1UU`) and
 * the braced Scryfall form. Hybrid/Phyrexian pips are counted as a single pip of
 * their first listed color — good enough for affordability grounding.
 */
export function parseManaCost(cost?: string | null): ParsedCost {
  const empty: ParsedCost = { generic: 0, pips: {}, cmc: 0, unknown: true };
  if (!cost || !cost.trim()) return empty;

  const pips: Partial<Record<ManaColor, number>> = {};
  let generic = 0;
  let matched = false;

  // Braced form: {2}{W}{U/B}{G/P}…
  const braceTokens = cost.match(/\{([^}]+)\}/g);
  if (braceTokens) {
    for (const tok of braceTokens) {
      const inner = tok.slice(1, -1); // strip { }
      matched = true;
      if (/^\d+$/.test(inner)) {
        generic += parseInt(inner, 10);
        continue;
      }
      if (/^[XYZ]$/i.test(inner)) continue; // X costs — treat as 0 generic for grounding
      // Hybrid / Phyrexian: take the first colour letter present.
      const colour = inner.toUpperCase().split('/').map((s) => s.trim())[0] as ManaColor;
      if (COLORS.includes(colour)) pips[colour] = (pips[colour] ?? 0) + 1;
    }
  } else {
    // Compact form: leading number(s) = generic, each letter = one colored pip.
    const genMatch = cost.match(/(\d+)/);
    if (genMatch) {
      generic += parseInt(genMatch[1], 10);
      matched = true;
    }
    for (const ch of cost.replace(/\d+/g, '')) {
      const colour = ch.toUpperCase() as ManaColor;
      if (COLORS.includes(colour)) {
        pips[colour] = (pips[colour] ?? 0) + 1;
        matched = true;
      }
    }
  }

  if (!matched) return empty;
  const pipCount = Object.values(pips).reduce((a, b) => a + (b ?? 0), 0);
  return { generic, pips, cmc: generic + pipCount, unknown: false };
}

/** Does this permanent enter the battlefield tapped? (regex over oracle text.) */
export function entersTapped(card: Card): { tapped: boolean; conditional: boolean } {
  const text = (card.oracleText ?? '').toLowerCase();
  if (!/enters( the battlefield)? tapped/.test(text)) return { tapped: false, conditional: false };
  // "...enters tapped unless you control two or more other lands" — conditional.
  const conditional = /enters( the battlefield)? tapped unless/.test(text);
  return { tapped: true, conditional };
}

/**
 * What colors of mana can this permanent produce when tapped? Returns null if it
 * is not a mana source at all (so callers can distinguish "no mana" from "{C}").
 */
export function manaProduced(card: Card): ManaColor[] | null {
  const type = (card.type ?? '').toLowerCase();
  const text = (card.oracleText ?? '').toLowerCase();
  const name = card.name.toLowerCase();

  // Basic land type lines / names → their color.
  for (const [basic, colour] of Object.entries(BASIC_LAND_COLOR)) {
    if (type.includes(basic) || name === basic) return [colour];
  }

  const isLand = type.includes('land');
  const hasManaAbility = /add\s+(\{|one|two|three|x mana|mana)/.test(text) || /:\s*add/.test(text);
  if (!isLand && !hasManaAbility) return null;

  // "Add one mana of any color" / "any one color" → all five colors.
  if (/add (one|two|three)? ?mana of any (one )?colou?r/.test(text) || /any colou?r of mana/.test(text)) {
    return ['W', 'U', 'B', 'R', 'G'];
  }

  // Collect explicit {C}/{W}/… symbols that appear after an "Add".
  const colours = new Set<ManaColor>();
  const addClauses = text.match(/add[^.]*\./g) ?? (/add/.test(text) ? [text] : []);
  for (const clause of addClauses) {
    const syms = clause.match(/\{([wubrgc])\}/g);
    if (syms) for (const s of syms) colours.add(s[1].toUpperCase() as ManaColor);
  }

  if (colours.size > 0) return [...colours];
  // A land with an unparseable mana ability: assume colorless so it still counts as a source.
  if (isLand) return ['C'];
  return null;
}

export interface ManaSource {
  card: Card;
  produces: ManaColor[];
  tapped: boolean;
}

/** Collect every mana source on a battlefield, with its current tapped state. */
export function collectManaSources(battlefield: Card[]): ManaSource[] {
  const sources: ManaSource[] = [];
  for (const card of battlefield) {
    const produces = manaProduced(card);
    if (produces) sources.push({ card, produces, tapped: !!card.tapped });
  }
  return sources;
}

/**
 * Can the given cost be paid from these (untapped) sources? Solves the colored
 * pips first via backtracking (a source may only pay one pip), then pays generic
 * from whatever sources remain. Returns false if any colored requirement or the
 * generic remainder can't be met.
 */
export function canAfford(untapped: ManaSource[], cost: ParsedCost): boolean {
  if (cost.unknown) return false;
  const pool = untapped.map((s) => s.produces);

  // Flatten colored requirements into individual pips, most-constrained first
  // (fewest sources able to pay it) for a stable greedy/backtracking assignment.
  const pips: ManaColor[] = [];
  for (const colour of COLORS) {
    const n = cost.pips[colour] ?? 0;
    for (let i = 0; i < n; i++) pips.push(colour);
  }

  const used = new Array(pool.length).fill(false);

  const assign = (i: number): boolean => {
    if (i >= pips.length) return true;
    const need = pips[i];
    for (let s = 0; s < pool.length; s++) {
      if (used[s]) continue;
      if (pool[s].includes(need)) {
        used[s] = true;
        if (assign(i + 1)) return true;
        used[s] = false;
      }
    }
    return false;
  };

  if (!assign(0)) return false;
  const remaining = used.filter((u) => !u).length;
  return remaining >= cost.generic;
}

/** Per-color count of how many untapped sources can produce that color. */
function colorAvailability(untapped: ManaSource[]): Partial<Record<ManaColor, number>> {
  const out: Partial<Record<ManaColor, number>> = {};
  for (const colour of COLORS) {
    const n = untapped.filter((s) => s.produces.includes(colour)).length;
    if (n > 0) out[colour] = n;
  }
  return out;
}

/**
 * Build the "AI RESOURCES" prompt block: a deterministic, trust-these-numbers
 * snapshot of the AI's turn, mana, land drops, and per-hand-card affordability.
 * This is the single biggest lever against the counting/turn-desync hallucinations.
 */
export function buildResourceBlock(opts: {
  turnNumber: number;
  currentPhase: string;
  isAITurn: boolean;
  aiBattlefield: Card[];
  aiHand: Card[];
  /** Lands the AI has already played this turn (one drop per turn allowed). */
  landsPlayedThisTurn: number;
}): string {
  const { turnNumber, currentPhase, isAITurn, aiBattlefield, aiHand, landsPlayedThisTurn } = opts;
  const sources = collectManaSources(aiBattlefield);
  const untapped = sources.filter((s) => !s.tapped);
  const tapped = sources.filter((s) => s.tapped);

  const fmtSource = (s: ManaSource) => `  • ${s.card.name} — taps for {${s.produces.join('}{')}}`;
  const colorAvail = colorAvailability(untapped);
  const colorStr =
    Object.entries(colorAvail).map(([c, n]) => `${c}:${n}`).join(', ') || 'none';

  const lines: string[] = [
    '=== AI RESOURCES (computed deterministically — TRUST these numbers over your own counting) ===',
    `Current turn: ${turnNumber}. Current phase: ${currentPhase}. It is ${isAITurn ? 'YOUR turn' : "the HUMAN's turn"}.`,
    `Do NOT reference any turn number other than ${turnNumber} in your reasoning.`,
    '',
    `Untapped mana sources (${untapped.length}) — these are ALL you can spend this step:`,
    untapped.length ? untapped.map(fmtSource).join('\n') : '  (none)',
    `Tapped sources (${tapped.length}) — CANNOT produce mana until untapped:`,
    tapped.length ? tapped.map(fmtSource).join('\n') : '  (none)',
    `TOTAL mana available right now: ${untapped.length} (by color: ${colorStr}).`,
  ];

  // Land-drop accounting. The store tracks how many lands the AI has already
  // played this turn, so we can give the brain an exact remaining count.
  const landDropsRemaining = Math.max(0, 1 - landsPlayedThisTurn);
  const landsInHand = aiHand.filter((c) => /land/i.test(c.type ?? ''));
  lines.push('');
  lines.push(
    landDropsRemaining > 0
      ? `LAND DROP: you have already played ${landsPlayedThisTurn} land(s) this turn. You may still play ${landDropsRemaining} more (include at most one land "play" action).`
      : `LAND DROP: you have ALREADY played your land for this turn. Do NOT include any land "play" action.`,
  );
  if (landsInHand.length) {
    lines.push('Lands in your hand:');
    for (const land of landsInHand) {
      const et = entersTapped(land);
      const tag = et.tapped
        ? et.conditional
          ? ' — MAY ENTER TAPPED (check the "unless" clause; if tapped it adds NO mana this turn)'
          : ' — ENTERS TAPPED: it adds NO mana the turn you play it'
        : '';
      lines.push(`  • ${land.name}${tag}`);
    }
  }

  // Per-spell affordability from CURRENT untapped mana (does not count a land you
  // have yet to play, which is the correct conservative view).
  const spells = aiHand.filter((c) => !/land/i.test(c.type ?? ''));
  if (spells.length) {
    lines.push('');
    lines.push('CASTABILITY from your current untapped mana (a land you play this turn may add 1 more, unless it enters tapped):');
    for (const spell of spells) {
      const cost = parseManaCost(spell.cost);
      if (cost.unknown) {
        lines.push(`  • ${spell.name} — cost unknown, verify manually`);
        continue;
      }
      const affordable = canAfford(untapped, cost);
      const costStr = spell.cost || `${cost.cmc}`;
      lines.push(
        `  • ${spell.name} (cost ${costStr}, needs ${cost.cmc} mana) — ${
          affordable ? 'AFFORDABLE now' : `NOT affordable now (you have ${untapped.length})`
        }`,
      );
    }
  }

  lines.push('');
  lines.push(
    'Before proposing any cast: confirm total mana needed ≤ available mana AND every colored pip can be paid. If not, do not propose it.',
  );

  return lines.join('\n');
}
