// Translates a list of structured GameActions (from the AI brain in Phase 5 or
// from the voice parser in Phase 4) into store dispatches.
//
// Card identification: actions reference cards by NAME (LLMs think in names, not ids).
// We resolve each name against the current state's zones to find the underlying id.
// If multiple cards share a name on the same side, we take the first untapped one for
// tap actions and the first one period for everything else — good-enough heuristic
// for a sandbox app.

import type * as React from 'react';
import type { GameAction } from './actionSchemas';
import type { GameState, GameAction as ReducerAction } from '../state/gameStore';
import type { Card } from '../types';

function findOnBattlefield(state: GameState, name: string, prefer?: 'tapped' | 'untapped'): Card | undefined {
  const lc = name.toLowerCase();
  const all = [...state.players.human.zones.battlefield, ...state.players.ai.zones.battlefield];
  const matches = all.filter((c) => c.name.toLowerCase() === lc);
  if (matches.length === 0) return undefined;
  if (prefer === 'untapped') return matches.find((c) => !c.tapped) ?? matches[0];
  if (prefer === 'tapped') return matches.find((c) => c.tapped) ?? matches[0];
  return matches[0];
}

function findInZone(state: GameState, player: 'human' | 'ai', zone: 'battlefield' | 'graveyard' | 'exile' | 'hand', name: string): Card | undefined {
  const lc = name.toLowerCase();
  return state.players[player].zones[zone].find((c) => c.name.toLowerCase() === lc);
}

function freshId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface ApplyResult {
  applied: number;
  skipped: { action: GameAction; reason: string }[];
}

/**
 * Apply a list of actions to the game store. Dispatches are batched in order.
 * NB: between dispatches the `state` argument grows stale — for now we use the
 * snapshot passed in, which is fine for short proposals (1–5 actions) and matches
 * how human-driven actions also operate against a single-frame snapshot.
 */
export function applyActions(
  actions: GameAction[],
  state: GameState,
  dispatch: React.Dispatch<ReducerAction>,
): ApplyResult {
  const result: ApplyResult = { applied: 0, skipped: [] };
  // Backstop for the one-land-per-turn rule: even if the brain proposes two land
  // plays in a single proposal — or proposes another land in a later proposal the
  // same turn — only one is applied. Seed from the turn's running count.
  let aiLandPlayed = state.aiLandsPlayedThisTurn > 0;

  for (const action of actions) {
    switch (action.kind) {
      case 'tap': {
        const card = findOnBattlefield(state, action.cardName, 'untapped');
        if (!card) {
          result.skipped.push({ action, reason: `no card "${action.cardName}" on any battlefield` });
          continue;
        }
        if (!card.tapped) dispatch({ type: 'TOGGLE_TAP', cardId: card.id });
        result.applied++;
        break;
      }
      case 'untap': {
        const card = findOnBattlefield(state, action.cardName, 'tapped');
        if (!card) {
          result.skipped.push({ action, reason: `no card "${action.cardName}" on any battlefield` });
          continue;
        }
        if (card.tapped) dispatch({ type: 'TOGGLE_TAP', cardId: card.id });
        result.applied++;
        break;
      }
      case 'play': {
        // For AI plays, prefer to source the card from the AI hand so we preserve its
        // oracle text / image; remove it from the hand on play.
        const sourceCard =
          action.player === 'ai' ? findInZone(state, 'ai', 'hand', action.cardName) : undefined;
        // Enforce one-land-per-turn on the AI side (the brain occasionally proposes two).
        const isLand = /land/i.test(sourceCard?.type ?? '');
        if (action.player === 'ai' && action.zone === 'battlefield' && isLand) {
          if (aiLandPlayed) {
            result.skipped.push({ action, reason: 'second land this turn — only one land may be played per turn' });
            continue;
          }
          aiLandPlayed = true;
        }
        const placed: Card = sourceCard
          ? { ...sourceCard, id: freshId('play'), tapped: false }
          : {
              id: freshId('play'),
              name: action.cardName,
              type: 'Spell',
              cost: '',
              colors: ['C'],
              freeform: true,
            };
        dispatch({ type: 'PLACE_CARD', player: action.player, zone: action.zone, card: placed });
        if (sourceCard) dispatch({ type: 'REMOVE_CARD', cardId: sourceCard.id });
        result.applied++;
        break;
      }
      case 'move': {
        const card = findInZone(state, action.player, action.fromZone, action.cardName);
        if (!card) {
          result.skipped.push({
            action,
            reason: `no card "${action.cardName}" in ${action.player}.${action.fromZone}`,
          });
          continue;
        }
        dispatch({ type: 'REMOVE_CARD', cardId: card.id });
        dispatch({
          type: 'PLACE_CARD',
          player: action.player,
          zone: action.toZone,
          card: { ...card, id: freshId('move'), tapped: false },
        });
        result.applied++;
        break;
      }
      case 'adjust_life':
        dispatch({ type: 'ADJUST_LIFE', player: action.player, delta: action.delta });
        result.applied++;
        break;
      case 'declare_attackers': {
        // Only valid mid-combat-declare for human attackers.
        for (const name of action.attackers) {
          const card = state.players.human.zones.battlefield.find(
            (c) => c.name.toLowerCase() === name.toLowerCase(),
          );
          if (!card) {
            result.skipped.push({ action, reason: `no attacker "${name}" on human battlefield` });
            continue;
          }
          dispatch({ type: 'COMBAT_TOGGLE_ATTACKER', cardId: card.id });
        }
        result.applied++;
        break;
      }
      case 'ai_declare_attackers': {
        // Resolve names → ids on the AI's battlefield, skip tapped creatures.
        const ids: string[] = [];
        for (const name of action.attackers) {
          const card = state.players.ai.zones.battlefield.find(
            (c) => c.name.toLowerCase() === name.toLowerCase() && !c.tapped,
          );
          if (!card) {
            result.skipped.push({ action, reason: `no untapped AI attacker "${name}" on battlefield` });
            continue;
          }
          ids.push(card.id);
        }
        if (ids.length > 0) {
          dispatch({ type: 'COMBAT_AI_DECLARE', attackerIds: ids });
          result.applied++;
        } else {
          result.skipped.push({ action, reason: 'no resolvable AI attackers' });
        }
        break;
      }
      case 'add_counter': {
        const card =
          state.players.ai.zones.battlefield.find(
            (c) => c.name.toLowerCase() === action.cardName.toLowerCase(),
          ) ??
          state.players.human.zones.battlefield.find(
            (c) => c.name.toLowerCase() === action.cardName.toLowerCase(),
          );
        if (!card) {
          result.skipped.push({ action, reason: `no card "${action.cardName}" on any battlefield` });
          continue;
        }
        dispatch({ type: 'ADJUST_COUNTER', cardId: card.id, kind: action.counter, delta: action.delta });
        result.applied++;
        break;
      }
    }
  }
  return result;
}
