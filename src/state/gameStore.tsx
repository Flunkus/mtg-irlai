// Game state store. Single source of truth for the sandbox battlefield.
// Backs the React UI directly and, via gameToCanonicalJson(), produces the
// JSON shape the LLM consumes (see CLAUDE.md).

import * as React from 'react';
import type { Card, Phase } from '../types';
import { PHASES } from '../types';
import { AI_BATTLEFIELD, AI_HAND, HUMAN_BATTLEFIELD } from '../mocks/sampleDeck';

export type Player = 'human' | 'ai';
export type ZoneName = 'battlefield' | 'graveyard' | 'exile' | 'hand';

interface PlayerState {
  lifeTotal: number;
  zones: Record<ZoneName, Card[]>;
  /** Human library is just a counter (we don't model the deck order). */
  libraryCount: number;
  /** Human hand is physical — only a count is tracked. AI hand is the full `zones.hand` array. */
  handCount: number;
}

export interface GameState {
  turnNumber: number;
  currentPhase: Phase;
  activePlayer: Player;
  players: Record<Player, PlayerState>;
  // Combat sub-state. Kept in the store so combat is part of the canonical snapshot
  // and the AI brain can react to it.
  combatStep: 'declare' | 'blockers' | null;
  attackers: string[];
  blockerMap: Record<string, string>;
  pickingBlockerFor: string | null;
}

export type GameAction =
  | { type: 'RESET_GAME'; state: GameState; aiName?: string }
  | { type: 'ADJUST_LIFE'; player: Player; delta: number }
  | { type: 'SET_LIFE'; player: Player; value: number }
  | { type: 'PLACE_CARD'; player: Player; zone: ZoneName; card: Card }
  | { type: 'REMOVE_CARD'; cardId: string }
  | { type: 'TOGGLE_TAP'; cardId: string }
  | { type: 'SET_PHASE'; phase: Phase }
  | { type: 'NEXT_PHASE' }
  | { type: 'SET_ACTIVE_PLAYER'; player: Player }
  | { type: 'INC_HAND_COUNT'; delta: number }
  | { type: 'SET_HAND_COUNT'; value: number }
  | { type: 'INC_LIBRARY_COUNT'; player: Player; delta: number }
  | { type: 'COMBAT_TOGGLE_ATTACKER'; cardId: string }
  | { type: 'COMBAT_CONTINUE_TO_BLOCKERS' }
  | { type: 'COMBAT_PICK_BLOCKER_FOR'; attackerId: string | null }
  | { type: 'COMBAT_ASSIGN_BLOCKER'; attackerId: string; blockerId: string }
  | { type: 'COMBAT_REMOVE_BLOCKER'; blockerId: string }
  | { type: 'COMBAT_CLEAR_ATTACKERS' }
  | { type: 'COMBAT_AUTO_BLOCK' }
  | { type: 'COMBAT_SKIP_BLOCKERS' }
  | { type: 'COMBAT_APPLY_RESULT'; aiDamage: number; deadAttackerIds: string[]; deadBlockerIds: string[] };

const INITIAL: GameState = {
  turnNumber: 3,
  currentPhase: 'Main 1',
  activePlayer: 'human',
  players: {
    human: {
      lifeTotal: 20,
      zones: { battlefield: HUMAN_BATTLEFIELD, graveyard: [], exile: [], hand: [] },
      libraryCount: 52,
      handCount: 4,
    },
    ai: {
      lifeTotal: 20,
      zones: { battlefield: AI_BATTLEFIELD, graveyard: [], exile: [], hand: AI_HAND },
      libraryCount: 48,
      handCount: AI_HAND.length,
    },
  },
  combatStep: null,
  attackers: [],
  blockerMap: {},
  pickingBlockerFor: null,
};

function setZone(
  state: GameState,
  player: Player,
  zone: ZoneName,
  cards: Card[],
): GameState {
  const p = state.players[player];
  return {
    ...state,
    players: {
      ...state.players,
      [player]: { ...p, zones: { ...p.zones, [zone]: cards } },
    },
  };
}

function mapBattlefield(state: GameState, f: (cards: Card[]) => Card[]): GameState {
  return {
    ...state,
    players: {
      human: {
        ...state.players.human,
        zones: { ...state.players.human.zones, battlefield: f(state.players.human.zones.battlefield) },
      },
      ai: {
        ...state.players.ai,
        zones: { ...state.players.ai.zones, battlefield: f(state.players.ai.zones.battlefield) },
      },
    },
  };
}

function applyPhase(state: GameState, newPhase: Phase, newActivePlayer: Player, newTurn: number): GameState {
  const isHumanCombat = newPhase === 'Combat' && newActivePlayer === 'human';
  return {
    ...state,
    currentPhase: newPhase,
    activePlayer: newActivePlayer,
    turnNumber: newTurn,
    combatStep: isHumanCombat ? 'declare' : null,
    attackers: isHumanCombat ? state.attackers : [],
    blockerMap: isHumanCombat ? state.blockerMap : {},
    pickingBlockerFor: isHumanCombat ? state.pickingBlockerFor : null,
  };
}

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESET_GAME':
      return action.state;
    case 'ADJUST_LIFE': {
      const p = state.players[action.player];
      return {
        ...state,
        players: {
          ...state.players,
          [action.player]: { ...p, lifeTotal: Math.max(0, p.lifeTotal + action.delta) },
        },
      };
    }
    case 'SET_LIFE': {
      const p = state.players[action.player];
      return {
        ...state,
        players: {
          ...state.players,
          [action.player]: { ...p, lifeTotal: Math.max(0, action.value) },
        },
      };
    }
    case 'PLACE_CARD': {
      const p = state.players[action.player];
      return setZone(state, action.player, action.zone, [...p.zones[action.zone], action.card]);
    }
    case 'REMOVE_CARD': {
      const stripFromAllZones = (p: PlayerState): PlayerState => ({
        ...p,
        zones: {
          battlefield: p.zones.battlefield.filter((c) => c.id !== action.cardId),
          graveyard: p.zones.graveyard.filter((c) => c.id !== action.cardId),
          exile: p.zones.exile.filter((c) => c.id !== action.cardId),
          hand: p.zones.hand.filter((c) => c.id !== action.cardId),
        },
      });
      return {
        ...state,
        players: {
          human: stripFromAllZones(state.players.human),
          ai: stripFromAllZones(state.players.ai),
        },
      };
    }
    case 'TOGGLE_TAP':
      return mapBattlefield(state, (cards) =>
        cards.map((c) => (c.id === action.cardId ? { ...c, tapped: !c.tapped } : c)),
      );
    case 'SET_PHASE':
      return applyPhase(state, action.phase, state.activePlayer, state.turnNumber);
    case 'NEXT_PHASE': {
      const idx = PHASES.indexOf(state.currentPhase);
      if (idx === PHASES.length - 1) {
        const nextPlayer: Player = state.activePlayer === 'human' ? 'ai' : 'human';
        return applyPhase(state, PHASES[0], nextPlayer, state.turnNumber + 1);
      }
      return applyPhase(state, PHASES[idx + 1], state.activePlayer, state.turnNumber);
    }
    case 'SET_ACTIVE_PLAYER':
      return applyPhase(state, state.currentPhase, action.player, state.turnNumber);
    case 'INC_HAND_COUNT': {
      const p = state.players.human;
      return {
        ...state,
        players: { ...state.players, human: { ...p, handCount: Math.max(0, p.handCount + action.delta) } },
      };
    }
    case 'SET_HAND_COUNT': {
      const p = state.players.human;
      return {
        ...state,
        players: { ...state.players, human: { ...p, handCount: Math.max(0, action.value) } },
      };
    }
    case 'INC_LIBRARY_COUNT': {
      const p = state.players[action.player];
      return {
        ...state,
        players: {
          ...state.players,
          [action.player]: { ...p, libraryCount: Math.max(0, p.libraryCount + action.delta) },
        },
      };
    }
    case 'COMBAT_TOGGLE_ATTACKER': {
      const isAttacker = state.attackers.includes(action.cardId);
      return {
        ...state,
        attackers: isAttacker
          ? state.attackers.filter((id) => id !== action.cardId)
          : [...state.attackers, action.cardId],
      };
    }
    case 'COMBAT_CONTINUE_TO_BLOCKERS':
      return { ...state, combatStep: 'blockers' };
    case 'COMBAT_PICK_BLOCKER_FOR':
      return { ...state, pickingBlockerFor: action.attackerId };
    case 'COMBAT_ASSIGN_BLOCKER':
      return {
        ...state,
        blockerMap: { ...state.blockerMap, [action.attackerId]: action.blockerId },
        pickingBlockerFor: null,
      };
    case 'COMBAT_REMOVE_BLOCKER': {
      const next = { ...state.blockerMap };
      const entry = Object.entries(next).find(([, b]) => b === action.blockerId);
      if (entry) delete next[entry[0]];
      return { ...state, blockerMap: next };
    }
    case 'COMBAT_CLEAR_ATTACKERS':
      return { ...state, attackers: [], blockerMap: {}, pickingBlockerFor: null };
    case 'COMBAT_AUTO_BLOCK': {
      const available = state.players.ai.zones.battlefield.filter(
        (c) => /Creature/i.test(c.type) && !c.tapped,
      );
      const sortedAttackers = state.attackers
        .map((id) => state.players.human.zones.battlefield.find((c) => c.id === id))
        .filter((c): c is Card => Boolean(c))
        .sort((a, b) => (parseInt(b.pt || '0') || 0) - (parseInt(a.pt || '0') || 0));
      const map: Record<string, string> = {};
      let i = 0;
      for (const att of sortedAttackers) {
        if (i >= available.length) break;
        map[att.id] = available[i].id;
        i++;
      }
      return { ...state, blockerMap: map, pickingBlockerFor: null };
    }
    case 'COMBAT_SKIP_BLOCKERS':
      return { ...state, blockerMap: {}, pickingBlockerFor: null };
    case 'COMBAT_APPLY_RESULT': {
      const dead = new Set(action.deadAttackerIds);
      const deadB = new Set(action.deadBlockerIds);
      const humanBoard = state.players.human.zones.battlefield;
      const aiBoard = state.players.ai.zones.battlefield;
      const newHumanBoard = humanBoard
        .map((c) => (state.attackers.includes(c.id) ? { ...c, tapped: true } : c))
        .filter((c) => !dead.has(c.id));
      const newHumanGraveyard = [
        ...state.players.human.zones.graveyard,
        ...humanBoard.filter((c) => dead.has(c.id)),
      ];
      const newAiBoard = aiBoard.filter((c) => !deadB.has(c.id));
      const newAiGraveyard = [
        ...state.players.ai.zones.graveyard,
        ...aiBoard.filter((c) => deadB.has(c.id)),
      ];
      return {
        ...state,
        players: {
          human: {
            ...state.players.human,
            zones: { ...state.players.human.zones, battlefield: newHumanBoard, graveyard: newHumanGraveyard },
          },
          ai: {
            ...state.players.ai,
            lifeTotal: Math.max(0, state.players.ai.lifeTotal - action.aiDamage),
            zones: { ...state.players.ai.zones, battlefield: newAiBoard, graveyard: newAiGraveyard },
          },
        },
        attackers: [],
        blockerMap: {},
        pickingBlockerFor: null,
        combatStep: null,
        currentPhase: 'Main 2',
      };
    }
    default:
      return state;
  }
}

/**
 * Pure helper. Compute combat damage / dead creatures without mutating state,
 * so the UI can both update state (via COMBAT_APPLY_RESULT) and react (log, speak).
 */
export function computeCombatResult(state: GameState): {
  aiDamage: number;
  deadAttackerIds: string[];
  deadBlockerIds: string[];
  perAttackerLog: { attacker: string; blocker?: string; outcome: 'hits' | 'trades' | 'kills' | 'dies' | 'clashes'; damage: number }[];
} {
  const parsePT = (pt?: string | null): [number, number] => {
    if (!pt) return [0, 0];
    const [p, t] = pt.split('/').map((s) => parseInt(s) || 0);
    return [p, t];
  };

  let aiDamage = 0;
  const deadAttackers = new Set<string>();
  const deadBlockers = new Set<string>();
  const perAttackerLog: ReturnType<typeof computeCombatResult>['perAttackerLog'] = [];

  for (const attId of state.attackers) {
    const att = state.players.human.zones.battlefield.find((c) => c.id === attId);
    if (!att) continue;
    const [attP, attT] = parsePT(att.pt);
    const blkId = state.blockerMap[attId];
    if (!blkId) {
      aiDamage += attP;
      perAttackerLog.push({ attacker: att.name, outcome: 'hits', damage: attP });
    } else {
      const blk = state.players.ai.zones.battlefield.find((c) => c.id === blkId);
      if (!blk) continue;
      const [blkP, blkT] = parsePT(blk.pt);
      const blockerDies = attP >= blkT;
      const attackerDies = blkP >= attT;
      if (blockerDies) deadBlockers.add(blkId);
      if (attackerDies) deadAttackers.add(attId);
      const outcome: 'trades' | 'kills' | 'dies' | 'clashes' =
        blockerDies && attackerDies ? 'trades' : blockerDies ? 'kills' : attackerDies ? 'dies' : 'clashes';
      perAttackerLog.push({ attacker: att.name, blocker: blk.name, outcome, damage: 0 });
    }
  }

  return {
    aiDamage,
    deadAttackerIds: [...deadAttackers],
    deadBlockerIds: [...deadBlockers],
    perAttackerLog,
  };
}

/** Canonical JSON the LLM consumes. Trims internal card data to just {id,name,tapped}. */
export function gameToCanonicalJson(state: GameState) {
  const trimCard = (c: Card) => ({ id: c.id, name: c.name, tapped: !!c.tapped });
  return {
    gameMetadata: {
      turnNumber: state.turnNumber,
      currentPhase: state.currentPhase,
      activePlayer: state.activePlayer === 'human' ? 'Human' : 'AI',
    },
    players: {
      human: {
        lifeTotal: state.players.human.lifeTotal,
        zones: {
          battlefield: state.players.human.zones.battlefield.map(trimCard),
          graveyard: state.players.human.zones.graveyard.map(trimCard),
          exile: state.players.human.zones.exile.map(trimCard),
        },
      },
      ai: {
        lifeTotal: state.players.ai.lifeTotal,
        zones: {
          hand: state.players.ai.zones.hand.map((c) => c.name),
          battlefield: state.players.ai.zones.battlefield.map(trimCard),
          graveyard: state.players.ai.zones.graveyard.map(trimCard),
          exile: state.players.ai.zones.exile.map(trimCard),
        },
      },
    },
  };
}

/* ── New-game helpers ────────────────────────────────────────────────── */

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Expand a deck's qty-collapsed entries into individual physical cards, each with a unique id. */
function expandDeck(cards: Card[]): Card[] {
  const out: Card[] = [];
  for (const c of cards) {
    const qty = c.qty ?? 1;
    for (let i = 0; i < qty; i++) {
      out.push({
        ...c,
        id: `g-${c.id}-${i}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`,
        qty: undefined,
        tapped: false,
      });
    }
  }
  return out;
}

export interface NewGameOptions {
  /** Cards in the human's deck (qty-collapsed form, like the deck library stores). */
  humanDeckCards: Card[];
  /** Cards in the AI's deck. */
  aiDeckCards: Card[];
  startingLife: number;
  handSize: number;
  /** Who goes first. */
  activePlayer?: Player;
}

/**
 * Build a fresh GameState for a new game. Sets library counts from the full decks,
 * resets life totals, turn to 1. Both hands start EMPTY — the human player will
 * tell the app what's in each hand as physical cards are dealt at the table.
 *
 * The handSize parameter only affects the human's hand COUNT (since the human's
 * cards stay physical). The user manually adds the AI's opening hand via the
 * play bar's side toggle.
 */
export function buildNewGameState(opts: NewGameOptions): GameState {
  const aiLibrary = expandDeck(opts.aiDeckCards).length;
  const humanLibrary = Math.max(0, expandDeck(opts.humanDeckCards).length - opts.handSize);

  return {
    turnNumber: 1,
    currentPhase: 'Untap',
    activePlayer: opts.activePlayer ?? 'human',
    players: {
      human: {
        lifeTotal: opts.startingLife,
        zones: { battlefield: [], graveyard: [], exile: [], hand: [] },
        libraryCount: humanLibrary,
        handCount: Math.min(opts.handSize, expandDeck(opts.humanDeckCards).length),
      },
      ai: {
        lifeTotal: opts.startingLife,
        zones: { battlefield: [], graveyard: [], exile: [], hand: [] },
        libraryCount: aiLibrary,
        handCount: 0,
      },
    },
    combatStep: null,
    attackers: [],
    blockerMap: {},
    pickingBlockerFor: null,
  };
}

/* ── Context + Provider ──────────────────────────────────────────────── */

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = React.createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, INITIAL);
  const value = React.useMemo(() => ({ state, dispatch }), [state]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = React.useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
