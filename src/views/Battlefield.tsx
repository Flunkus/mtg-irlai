// Sandbox Battlefield view.
// Visual styling lifted verbatim from claude-design-mockup/battlefield.jsx.
// Phase 3: all game state now lives in useGame(). UI-only state (mic recording,
// AI persona narration, action log, hint visibility, density toggle) remains local.

import * as React from 'react';
import { CardToken } from '../components/CardToken';
import { CardDetailModal } from '../components/CardDetailModal';
import { AIPersona } from '../components/AIPersona';
import { HintCard, deriveHint } from '../components/HintCoach';
import { PlayBar, type Zone as PlayZone, type Side as PlaySide } from '../components/PlayBar';
import { useGame, computeCombatResult, type Player } from '../state/gameStore';
import { useDeckLibrary } from '../state/deckLibrary';
import { STARTER_DECK } from '../mocks/sampleDeck';
import { PHASES, MANA_COLORS } from '../types';
import type { Card, ManaColor } from '../types';
import { proposeAIMove } from '../llm/aiBrain';
import { applyActions } from '../llm/applyActions';
import { isLLMConfigured } from '../llm/client';
import type { AIProposal as LLMProposal } from '../llm/actionSchemas';
import { useSpeech } from '../voice/useSpeech';
import { parseVoiceTranscript } from '../voice/parseVoice';
import { NewGameModal } from '../components/NewGameModal';

function LifeCounter({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  side: 'ai' | 'human';
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={() => onChange(value - 1)}
        className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all font-mono text-lg flex items-center justify-center active:scale-95"
      >
        −
      </button>
      <div className="flex flex-col items-center min-w-[80px]">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono leading-none">
          {label}
        </div>
        <div
          className="font-mono font-semibold leading-none mt-1"
          style={{
            fontSize: 40,
            color: value <= 5 ? '#f87171' : '#fafafa',
            textShadow: value <= 5 ? '0 0 16px rgba(248,113,113,0.4)' : 'none',
            transition: 'color 200ms, text-shadow 200ms',
          }}
        >
          {value}
        </div>
      </div>
      <button
        onClick={() => onChange(value + 1)}
        className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all font-mono text-lg flex items-center justify-center active:scale-95"
      >
        +
      </button>
    </div>
  );
}

function Avatar({ name, side, active }: { name: string; side: 'ai' | 'human'; active: boolean }) {
  const isAI = side === 'ai';
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center font-mono text-base font-semibold relative overflow-hidden shrink-0"
        style={{
          background: isAI
            ? 'linear-gradient(135deg, #3a1f2e 0%, #1c1418 100%)'
            : 'linear-gradient(135deg, #1a2942 0%, #0e1828 100%)',
          color: isAI ? '#f4a3b8' : '#a3c4f4',
          boxShadow: active
            ? '0 0 0 2px var(--accent), 0 0 20px var(--accent-glow)'
            : '0 0 0 1px rgba(255,255,255,0.06)',
          transition: 'box-shadow 300ms',
        }}
      >
        {isAI ? 'AI' : 'P1'}
      </div>
      <div>
        <div className="text-zinc-100 text-sm font-medium leading-tight">{name}</div>
        <div className="text-zinc-500 text-[11px] font-mono uppercase tracking-wider mt-0.5">
          {isAI ? 'Mono-Red Burn' : 'Azure Tempo'}
        </div>
      </div>
    </div>
  );
}

function PhaseIndicator({
  phase,
  turn,
  activeSide,
  onNext,
}: {
  phase: string;
  turn: number;
  activeSide: 'human' | 'ai';
  onNext: () => void;
}) {
  const isAI = activeSide === 'ai';
  const activeColor = isAI ? '#f87171' : 'var(--accent)';
  const activeGlow = isAI ? 'rgba(248,113,113,0.35)' : 'var(--accent-glow)';
  return (
    <div className="flex items-center gap-3">
      {/* "Whose turn" badge — the loudest single hint of who's acting right now. */}
      <div
        className="px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-[0.16em] font-bold"
        style={{
          background: isAI ? 'rgba(248,113,113,0.18)' : 'rgba(160,120,255,0.18)',
          color: activeColor,
          border: `1px solid ${activeGlow}`,
        }}
        title={isAI ? "AI's turn" : 'Your turn'}
      >
        {isAI ? 'AI turn' : 'Your turn'}
      </div>

      <div className="flex items-center gap-1">
        {PHASES.map((p) => (
          <div
            key={p}
            className="px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-wider transition-all"
            style={{
              background: p === phase ? activeColor : 'transparent',
              color: p === phase ? '#18181b' : '#52525b',
              fontWeight: p === phase ? 700 : 500,
              boxShadow: p === phase ? `0 0 12px ${activeGlow}` : 'none',
            }}
          >
            {p}
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        className="ml-1 px-4 py-2 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-sm font-medium transition-all flex items-center gap-2 active:scale-[0.98]"
        style={{ borderColor: activeGlow }}
      >
        Next phase
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 6h6m0 0L6 3m3 3L6 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="text-zinc-500 text-xs font-mono ml-1">
        turn <span className="text-zinc-300">{turn}</span>
      </div>
    </div>
  );
}

interface LogEntry {
  who: 'ai' | 'human';
  text: string;
}

function ActionLog({ entries }: { entries: LogEntry[] }) {
  return (
    <div className="flex items-center gap-2 h-7 px-3 bg-zinc-900/60 border border-zinc-800/80 rounded-md overflow-hidden">
      <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono shrink-0">stack</div>
      <div className="w-px h-3 bg-zinc-800" />
      <div className="flex items-center gap-4 overflow-hidden">
        {entries.slice(0, 4).map((e, i) => (
          <div key={i} className="flex items-center gap-1.5 shrink-0" style={{ opacity: 1 - i * 0.22 }}>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: e.who === 'ai' ? '#f87171' : 'var(--accent)' }}
            />
            <span className="text-xs text-zinc-300 truncate">{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PAIRING_HUES = [280, 200, 35, 145, 320, 100];
function pairingColor(idx: number) {
  return `oklch(0.78 0.16 ${PAIRING_HUES[idx % PAIRING_HUES.length]})`;
}

function PairBadge({ pairIdx, role, color }: { pairIdx: number; role: string; color: string }) {
  return (
    <div
      className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded font-mono text-[10px] font-bold flex items-center gap-1 whitespace-nowrap"
      style={{
        background: color,
        color: '#18181b',
        boxShadow: `0 2px 8px ${color}66, 0 0 0 1.5px rgba(0,0,0,0.4)`,
        zIndex: 4,
      }}
    >
      <span className="opacity-70">#{pairIdx + 1}</span>
      <span className="uppercase tracking-wider">{role}</span>
    </div>
  );
}

interface ZoneProps {
  label: string;
  cards: Card[];
  onCardClick: (id: string) => void;
  onCardZoom: (card: Card) => void;
  density: 'normal' | 'compact';
  side: 'ai' | 'human';
  accent?: string;
  attackerIds?: string[];
  blockerMap?: Record<string, string>;
  combatStep?: 'declare' | 'blockers' | null;
  attackingSide?: 'ai' | 'human';
  pickingBlockerFor?: string | null;
  /** Called when the user wants to adjust +1/+1 counters on a creature. */
  onAdjustCounter?: (cardId: string, kind: 'plusOne', delta: number) => void;
  /** Called when the user picks a destination from the card's move menu. */
  onMoveCard?: (cardId: string, toZone: 'graveyard' | 'exile' | 'hand') => void;
}

function Zone({
  label,
  cards,
  onCardClick,
  onCardZoom,
  density,
  side,
  accent,
  attackerIds = [],
  blockerMap = {},
  combatStep = null,
  attackingSide = 'human',
  pickingBlockerFor = null,
  onAdjustCounter,
  onMoveCard,
}: ZoneProps) {
  const cardSize = density === 'compact' ? 'xs' : 'sm';
  const lands = cards.filter((c) => /Land/i.test(c.type));
  const nonlands = cards.filter((c) => !/Land/i.test(c.type));
  const defendingSide: 'ai' | 'human' = attackingSide === 'human' ? 'ai' : 'human';

  const attackerOrder = attackerIds;
  const pairIdxFor = (cardId: string) => {
    if (side === attackingSide) return attackerOrder.indexOf(cardId);
    const entry = Object.entries(blockerMap).find(([, blk]) => blk === cardId);
    return entry ? attackerOrder.indexOf(entry[0]) : -1;
  };

  const showLabel =
    combatStep === 'declare' && side === attackingSide
      ? 'select attackers'
      : combatStep === 'blockers' && side === attackingSide
      ? pickingBlockerFor
        ? attackingSide === 'human'
          ? 'pick a blocker →'
          : '← pick a blocker'
        : 'click attacker'
      : combatStep === 'blockers' && side === defendingSide
      ? pickingBlockerFor
        ? attackingSide === 'human'
          ? '← assign blocker'
          : 'assign blocker →'
        : 'creatures available'
      : null;

  const renderCreature = (c: Card) => {
    const isAttacker = side === attackingSide && attackerIds.includes(c.id);
    const isBlocker = side === defendingSide && Object.values(blockerMap).includes(c.id);
    const isPicking = side === attackingSide && pickingBlockerFor === c.id;
    const canInteract =
      // No combat in progress: anything on the battlefield is clickable to tap/untap.
      !combatStep ||
      (combatStep === 'declare' && side === attackingSide && /Creature/i.test(c.type)) ||
      (combatStep === 'blockers' && side === attackingSide && isAttacker) ||
      (combatStep === 'blockers' && side === defendingSide && /Creature/i.test(c.type) && !c.tapped);
    const pIdx = pairIdxFor(c.id);
    const pColor = pIdx >= 0 ? pairingColor(pIdx) : null;
    const lifted = isAttacker || isBlocker || isPicking;

    let hint: string | null = null;
    if (combatStep === 'declare' && side === attackingSide && /Creature/i.test(c.type) && !isAttacker)
      hint = 'click to attack';
    if (combatStep === 'blockers' && side === attackingSide && isAttacker && !pickingBlockerFor)
      hint = 'pick blocker';
    if (
      combatStep === 'blockers' &&
      side === defendingSide &&
      pickingBlockerFor &&
      !c.tapped &&
      /Creature/i.test(c.type) &&
      !isBlocker
    )
      hint = 'click to block';

    return (
      <div
        key={c.id}
        className="relative group"
        style={{
          filter: lifted ? `drop-shadow(0 0 14px ${pColor || 'var(--accent-glow)'})` : 'none',
          transition: 'filter 200ms, transform 200ms',
          transform: lifted ? 'translateY(-6px)' : 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: 14,
            pointerEvents: 'none',
            boxShadow:
              isAttacker || isBlocker
                ? `0 0 0 2px ${pColor}, inset 0 0 0 2px rgba(255,255,255,0.06)`
                : isPicking
                ? '0 0 0 2px var(--accent), inset 0 0 0 2px rgba(255,255,255,0.06)'
                : 'none',
            opacity: isAttacker || isBlocker || isPicking ? 1 : 0,
            transition: 'opacity 200ms',
          }}
        />
        {pIdx >= 0 && pColor && (
          <PairBadge pairIdx={pIdx} color={pColor} role={side === attackingSide ? 'attacker' : 'blocker'} />
        )}
        <CardToken
          card={c}
          size={cardSize}
          tapped={c.tapped || isAttacker}
          hideRemove
          onClick={canInteract ? () => onCardClick(c.id) : undefined}
          onZoom={() => onCardZoom(c)}
        />
        {/* +1/+1 counter widget — only on creatures, only outside combat. Visible on hover, shows count when > 0. */}
        {/Creature/i.test(c.type) && onAdjustCounter && !combatStep && (
          <CounterWidget
            count={c.counters?.plusOne ?? 0}
            onAdd={(delta) => onAdjustCounter(c.id, 'plusOne', delta)}
          />
        )}
        {/* Move-to menu — visible on hover. Sends the card to graveyard / exile / hand. */}
        {onMoveCard && !combatStep && (
          <CardMoveMenu onMove={(toZone) => onMoveCard(c.id, toZone)} />
        )}
        {canInteract && !isAttacker && !isBlocker && !isPicking && hint && (
          <div
            className="absolute inset-0 rounded-[10px] pointer-events-none flex items-end justify-center pb-2 opacity-0 hover:opacity-100"
            style={{
              background: 'linear-gradient(180deg, transparent 50%, rgba(160,120,255,0.18))',
              transition: 'opacity 200ms',
            }}
          >
            <div
              className="px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider"
              style={{ background: 'var(--accent)', color: '#18181b' }}
            >
              {hint}
            </div>
          </div>
        )}
      </div>
    );
  };

  const combatHighlight =
    (combatStep === 'declare' && side === attackingSide) ||
    (combatStep === 'blockers' && side === defendingSide);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">{label}</div>
        <div className="text-[10px] text-zinc-600 font-mono">{cards.length}</div>
        {showLabel && (
          <div
            className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: 'var(--accent)', color: '#18181b' }}
          >
            {showLabel}
          </div>
        )}
        <div className="flex-1 h-px bg-zinc-800/60" />
      </div>
      <div
        className="flex-1 rounded-lg flex flex-col gap-3 p-3 min-h-0 overflow-y-auto"
        style={{
          background: accent || 'rgba(24,24,27,0.4)',
          border: combatHighlight ? '1px solid var(--accent-glow)' : '1px solid rgba(255,255,255,0.04)',
          transition: 'border-color 200ms',
        }}
      >
        {nonlands.length > 0 && (
          <div className="flex gap-3 flex-wrap items-start pt-1">{nonlands.map(renderCreature)}</div>
        )}
        {lands.length > 0 && (
          <div className="flex gap-2 flex-wrap items-start mt-auto">
            {lands.map((c) => (
              <div key={c.id} className="relative group">
                <CardToken
                  card={c}
                  size="xs"
                  tapped={c.tapped}
                  hideRemove
                  onClick={() => onCardClick(c.id)}
                  onZoom={() => onCardZoom(c)}
                />
                {onMoveCard && !combatStep && (
                  <CardMoveMenu onMove={(toZone) => onMoveCard(c.id, toZone)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold"
      style={{
        background: active ? 'var(--accent)' : done ? '#3f3f46' : 'transparent',
        color: active ? '#18181b' : done ? '#a1a1aa' : '#52525b',
        border: !active && !done ? '1px solid #3f3f46' : 'none',
      }}
    >
      {done ? '✓' : label}
    </div>
  );
}

interface CombatBarProps {
  step: 'declare' | 'blockers';
  attackingSide: 'human' | 'ai';
  attackers: Card[];
  blockerMap: Record<string, string>;
  aiBoard: Card[];
  onContinueToBlockers: () => void;
  onResolve: () => void;
  onClear: () => void;
  onSkipBlockers: () => void;
  onAutoBlock: () => void;
}

function CombatBar({
  step,
  attackingSide,
  attackers,
  blockerMap,
  onContinueToBlockers,
  onResolve,
  onClear,
  onSkipBlockers,
  onAutoBlock,
}: CombatBarProps) {
  const defenderLabel = attackingSide === 'human' ? 'AI' : 'Your';
  const attackerLabel = attackingSide === 'human' ? 'You declare' : 'AI attacks with';
  const accentColor = attackingSide === 'human' ? 'var(--accent)' : '#f87171';
  const accentGlow = attackingSide === 'human' ? 'var(--accent-glow)' : 'rgba(248,113,113,0.35)';
  const totalDamage = attackers.reduce(
    (s, c) => s + (c.pt ? parseInt(c.pt.split('/')[0]) || 0 : 0),
    0,
  );
  const blockedCount = attackers.filter((a) => blockerMap[a.id]).length;
  const unblockedDmg = attackers
    .filter((a) => !blockerMap[a.id])
    .reduce((s, c) => s + (c.pt ? parseInt(c.pt.split('/')[0]) || 0 : 0), 0);

  return (
    <div
      className="rounded-lg mt-3 overflow-hidden"
      style={{
        background:
          attackingSide === 'human'
            ? 'linear-gradient(90deg, rgba(160,120,255,0.12), rgba(160,120,255,0.04))'
            : 'linear-gradient(90deg, rgba(248,113,113,0.14), rgba(248,113,113,0.05))',
        border: `1px solid ${accentGlow}`,
        animation: 'fadeIn 240ms ease-out',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
        <div className="flex items-center gap-1.5 shrink-0">
          <StepDot active={step === 'declare'} done={step === 'blockers'} label="1" />
          <div className="w-4 h-px bg-zinc-700" />
          <StepDot active={step === 'blockers'} done={false} label="2" />
        </div>
        <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider shrink-0">
          {step === 'declare' ? 'attackers' : 'blockers'}
        </div>
        <div className="w-px h-5 bg-zinc-700" />

        {step === 'declare' && (
          <>
            <div className="text-zinc-100 text-sm font-medium shrink-0">
              {attackers.length === 0
                ? `No attackers (${attackerLabel.toLowerCase()})`
                : `${attackerLabel} ${attackers.length}`}
            </div>
            {attackers.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-xs shrink-0">
                  <span className="text-zinc-500 font-mono uppercase tracking-wider text-[10px]">
                    dealing
                  </span>
                  <span className="font-mono font-bold text-base" style={{ color: accentColor }}>
                    {totalDamage}
                  </span>
                  <span className="text-zinc-500 font-mono">damage</span>
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                  {attackers.map((a) => (
                    <div key={a.id} className="px-2 py-0.5 rounded bg-zinc-900/60 text-zinc-300 text-[11px] truncate">
                      {a.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {step === 'blockers' && (
          <>
            <div className="text-zinc-100 text-sm font-medium shrink-0">
              {attackingSide === 'ai' && `AI attacks — `}
              {blockedCount}/{attackers.length} blocked
            </div>
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <span className="text-zinc-500 font-mono uppercase tracking-wider text-[10px]">unblocked</span>
              <span
                className="font-mono font-bold text-base"
                style={{ color: unblockedDmg > 0 ? '#f87171' : '#52525b' }}
              >
                {unblockedDmg}
              </span>
              <span className="text-zinc-500 font-mono">→ {defenderLabel} life</span>
            </div>
          </>
        )}
      </div>

      <div
        className="flex items-center gap-2 px-4 py-2.5 border-t"
        style={{ borderColor: accentGlow, background: 'rgba(0,0,0,0.2)' }}
      >
        {step === 'declare' && (
          <>
            {attackers.length > 0 && (
              <button
                onClick={onClear}
                className="px-3 py-1.5 rounded text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
              >
                Clear attackers
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={onContinueToBlockers}
              disabled={attackers.length === 0}
              className="px-4 py-1.5 rounded text-sm font-medium transition-all active:scale-[0.98]"
              style={{
                background: attackers.length === 0 ? '#27272a' : accentColor,
                color: attackers.length === 0 ? '#52525b' : '#18181b',
                cursor: attackers.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Continue to blockers →
            </button>
          </>
        )}

        {step === 'blockers' && (
          <>
            {/* Auto-block is only meaningful when AI is defending (i.e. human is attacking). */}
            {attackingSide === 'human' && (
              <button
                onClick={onAutoBlock}
                className="px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5"
                style={{
                  background: 'rgba(160,120,255,0.14)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent-glow)',
                }}
                title="Let the AI auto-assign blockers"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 4l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="6" cy="2" r="0.8" fill="currentColor" />
                </svg>
                Auto-block (AI)
              </button>
            )}
            <button
              onClick={onSkipBlockers}
              className="px-3 py-1.5 rounded text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors border border-zinc-800"
              title="No blockers — all damage goes through"
            >
              No blocks
            </button>
            <div className="flex-1" />
            <button
              onClick={onResolve}
              className="px-4 py-1.5 rounded text-sm font-medium transition-all active:scale-[0.98] flex items-center gap-1.5"
              style={{ background: accentColor, color: '#18181b' }}
            >
              Resolve combat
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 6h6m0 0L6 3m3 3L6 9"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CardMoveMenu({ onMove }: { onMove: (toZone: 'graveyard' | 'exile' | 'hand') => void }) {
  const [open, setOpen] = React.useState(false);

  // Close on outside click. We listen at the document level since the menu is positioned absolutely
  // inside the card wrapper and may be partially clipped by its overflow ancestor.
  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const t = setTimeout(() => document.addEventListener('click', close), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', close);
    };
  }, [open]);

  const items: { id: 'graveyard' | 'exile' | 'hand'; label: string; symbol: string; color: string }[] = [
    { id: 'graveyard', label: 'Graveyard', symbol: '✕', color: '#a1a1aa' },
    { id: 'exile',     label: 'Exile',     symbol: '⊘', color: '#fbbf24' },
    { id: 'hand',      label: 'Hand',      symbol: '◦', color: 'var(--accent)' },
  ];

  return (
    <div
      className={`absolute -bottom-2 -right-2 transition-opacity ${open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      style={{ zIndex: 6 }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-7 h-7 rounded-full font-mono text-xs flex items-center justify-center transition-all active:scale-95"
        style={{
          background: open ? 'var(--accent)' : 'rgba(24,24,27,0.92)',
          color: open ? '#18181b' : '#d4d4d8',
          border: `1.5px solid ${open ? 'var(--accent)' : '#3f3f46'}`,
          boxShadow: '0 0 0 1.5px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.5)',
        }}
        title="Move card…"
        aria-label="Move card"
      >
        ⇢
      </button>
      {open && (
        <div
          className="absolute right-0 bottom-9 rounded-md overflow-hidden"
          style={{
            background: 'rgba(10,10,12,0.97)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            minWidth: 140,
            animation: 'hintIn 140ms ease-out',
          }}
        >
          <div className="px-2.5 py-1.5 border-b border-zinc-800/70 text-[9px] uppercase tracking-[0.16em] font-mono text-zinc-500">
            Move to…
          </div>
          {items.map((it) => (
            <button
              key={it.id}
              onClick={(e) => {
                e.stopPropagation();
                onMove(it.id);
                setOpen(false);
              }}
              className="w-full px-3 py-2 flex items-center gap-2.5 text-left transition-colors hover:bg-zinc-800/60"
            >
              <span className="font-mono text-sm" style={{ color: it.color, width: 14, textAlign: 'center' }}>
                {it.symbol}
              </span>
              <span className="text-zinc-100 text-[12px] flex-1">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CounterWidget({
  count,
  onAdd,
}: {
  count: number;
  onAdd: (delta: number) => void;
}) {
  // Visible when there's at least one counter, or on hover (via group-hover from the renderCreature wrapper).
  const visible = count > 0;
  return (
    <div
      className={`absolute -bottom-2 -left-2 flex items-center gap-1 transition-opacity ${visible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      style={{ zIndex: 4 }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd(1);
        }}
        className="rounded-full font-mono font-bold flex items-center justify-center transition-all active:scale-95"
        style={{
          minWidth: 26,
          height: 22,
          padding: '0 6px',
          fontSize: 11,
          background: count > 0 ? '#16a34a' : 'rgba(24,24,27,0.92)',
          color: count > 0 ? '#f0fdf4' : '#a1a1aa',
          border: `1.5px solid ${count > 0 ? '#16a34a' : '#3f3f46'}`,
          boxShadow: count > 0
            ? '0 0 0 1.5px rgba(0,0,0,0.45), 0 0 10px rgba(22,163,74,0.5)'
            : '0 0 0 1.5px rgba(0,0,0,0.45)',
        }}
        title={count > 0 ? `+${count}/+${count} counters — click to add another` : 'Add +1/+1 counter'}
      >
        {count > 0 ? `+${count}/+${count}` : '+1/+1'}
      </button>
      {count > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd(-1);
          }}
          className="w-5 h-5 rounded-full font-mono font-bold text-[11px] flex items-center justify-center transition-all active:scale-95"
          style={{
            background: 'rgba(24,24,27,0.92)',
            color: '#a1a1aa',
            border: '1.5px solid #3f3f46',
            boxShadow: '0 0 0 1.5px rgba(0,0,0,0.45)',
          }}
          title="Remove a +1/+1 counter"
        >
          −
        </button>
      )}
    </div>
  );
}

function HandZone({
  cards,
  onCardClick,
  onCardZoom,
  label,
}: {
  cards: Card[];
  onCardClick: (id: string) => void;
  onCardZoom: (card: Card) => void;
  label: string;
  side: 'ai' | 'human';
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">{label}</div>
        <div className="text-[10px] text-zinc-600 font-mono">{cards.length}</div>
      </div>
      <div
        className="rounded-lg p-3 overflow-x-auto"
        style={{
          background: 'rgba(248,113,113,0.04)',
          border: '1px solid rgba(248,113,113,0.1)',
        }}
      >
        <div className="flex gap-2 min-w-min">
          {cards.map((c) => (
            <CardToken
              key={c.id}
              card={c}
              size="xs"
              hideRemove
              onClick={() => onCardClick(c.id)}
              onZoom={() => onCardZoom(c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShowHandButton({
  side,
  count,
  open,
  onToggle,
}: {
  side: 'ai' | 'human';
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  const accent = side === 'ai' ? 'rgba(248,113,113,0.18)' : 'var(--accent-glow)';
  const fg = side === 'ai' ? '#f87171' : 'var(--accent)';
  return (
    <button
      onClick={onToggle}
      className="px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all flex items-center gap-2 active:scale-[0.98]"
      style={{
        background: open ? accent : 'rgba(24,24,27,0.6)',
        color: open ? fg : '#a1a1aa',
        border: `1px solid ${open ? accent : 'rgba(255,255,255,0.06)'}`,
      }}
      title={open ? 'Hide hand' : 'Show hand'}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <rect x="1.5" y="3" width="9" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M3.5 5h5M3.5 7h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <span>{open ? 'Hide' : 'Show'} hand</span>
      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.4)', color: fg }}>
        {count}
      </span>
    </button>
  );
}

function CreateTokenButton({ side, onClick }: { side: 'ai' | 'human'; onClick: () => void }) {
  const accent = side === 'ai' ? 'rgba(248,113,113,0.18)' : 'var(--accent-glow)';
  const fg = side === 'ai' ? '#f87171' : 'var(--accent)';
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-[0.98]"
      style={{
        background: 'rgba(24,24,27,0.6)',
        color: '#a1a1aa',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = accent;
        (e.currentTarget as HTMLButtonElement).style.color = fg;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(24,24,27,0.6)';
        (e.currentTarget as HTMLButtonElement).style.color = '#a1a1aa';
      }}
      title={`Create a token for ${side === 'human' ? 'your' : "the AI's"} side`}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      Token
    </button>
  );
}

function HandOverlay({
  side,
  cards,
  count,
  untrackedCount,
  anchor,
  onClose,
  onCardZoom,
  onRemove,
}: {
  side: 'ai' | 'human';
  cards: Card[];
  count: number;
  /** For the human side only: physical cards in hand that aren't tracked individually (e.g. from a count-only draw). */
  untrackedCount?: number;
  /** Which edge to anchor to. AI hand drops from the top of the play area; human hand rises from above the bottom toolbar. */
  anchor: 'top' | 'bottom';
  onClose: () => void;
  onCardZoom: (card: Card) => void;
  /** Optional — when provided, each card gets a remove button. */
  onRemove?: (cardId: string) => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isAI = side === 'ai';
  const ring = isAI ? 'rgba(248,113,113,0.35)' : 'var(--accent-glow)';
  const tint = isAI ? 'rgba(248,113,113,0.08)' : 'rgba(160,120,255,0.08)';
  const fg = isAI ? '#f87171' : 'var(--accent)';
  const positionClass = anchor === 'top' ? 'top-20' : 'bottom-28';

  return (
    <>
      {/* Click-outside dismiss layer (transparent — keep the board visible). */}
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className={`fixed left-1/2 -translate-x-1/2 ${positionClass} z-40 rounded-xl overflow-hidden`}
        style={{
          background: `linear-gradient(180deg, #1a1a1e, #131316)`,
          border: `1px solid ${ring}`,
          boxShadow: `0 20px 60px rgba(0,0,0,0.55), 0 0 80px ${tint}`,
          animation: 'popupIn 220ms cubic-bezier(.2,.9,.3,1.2)',
          width: 'min(880px, 92vw)',
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center gap-3 shrink-0">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center font-mono text-[11px] font-bold"
            style={{ background: fg, color: '#18181b' }}
          >
            {isAI ? 'AI' : 'P1'}
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">
              {isAI ? "AI's hand" : 'Your hand'}
            </div>
            <div className="text-zinc-100 text-sm font-medium">
              {count} {count === 1 ? 'card' : 'cards'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-center"
            aria-label="Close"
            title="Close (Esc)"
          >
            <svg width="11" height="11" viewBox="0 0 10 10">
              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-3 overflow-auto min-h-0 flex flex-col gap-3">
          {cards.length === 0 && (untrackedCount ?? 0) === 0 ? (
            <EmptyHandNote
              text={
                isAI
                  ? "AI's hand is empty. As the AI draws, those cards will appear here."
                  : 'Your hand is empty. Use the play bar to log cards you draw — they will appear here.'
              }
              accent={fg}
            />
          ) : (
            <>
              {cards.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {cards.map((c) => (
                    <CardToken
                      key={c.id}
                      card={c}
                      size="sm"
                      hideRemove={!onRemove}
                      onRemove={onRemove ? () => onRemove(c.id) : undefined}
                      onZoom={() => onCardZoom(c)}
                    />
                  ))}
                </div>
              )}
              {!isAI && (untrackedCount ?? 0) > 0 && (
                <EmptyHandNote
                  text={`${untrackedCount} additional ${untrackedCount === 1 ? 'card' : 'cards'} in hand untracked (kept as a count). Use the play bar with "for: You → Hand" to track them individually.`}
                  accent={fg}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function CreateTokenModal({
  defaultSide,
  onClose,
  onCreate,
}: {
  defaultSide: 'human' | 'ai';
  onClose: () => void;
  onCreate: (token: { name: string; pt: string; type: string; color: ManaColor; side: 'human' | 'ai' }) => void;
}) {
  const [name, setName] = React.useState('Soldier');
  const [power, setPower] = React.useState(1);
  const [toughness, setToughness] = React.useState(1);
  const [type, setType] = React.useState('Token Creature — Soldier');
  const [color, setColor] = React.useState<ManaColor>('W');
  const [side, setSide] = React.useState<'human' | 'ai'>(defaultSide);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const create = () => {
    const safeName = name.trim() || 'Token';
    onCreate({
      name: safeName,
      pt: `${power}/${toughness}`,
      type: type.trim() || 'Token Creature',
      color,
      side,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-[460px] rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1c1c20, #131316)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), 0 0 80px rgba(160,120,255,0.15)',
          animation: 'popupIn 280ms cubic-bezier(.2,.9,.3,1.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center font-mono text-xs font-bold"
            style={{ background: 'var(--accent)', color: '#18181b' }}
          >
            ◆
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Create token</div>
            <div className="text-zinc-100 text-sm font-medium">Custom creature token onto the battlefield</div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 flex flex-col gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 text-base focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Token name (e.g. Soldier, Treasure, Goblin)"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Power</label>
              <input
                type="number"
                value={power}
                min={0}
                onChange={(e) => setPower(parseInt(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 font-mono text-base focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Toughness</label>
              <input
                type="number"
                value={toughness}
                min={0}
                onChange={(e) => setToughness(parseInt(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 font-mono text-base focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Color</label>
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-1">
                {(['W', 'U', 'B', 'R', 'G', 'C'] as ManaColor[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full font-mono text-[11px] font-bold flex items-center justify-center transition-all"
                    style={{
                      background: MANA_COLORS[c].bg,
                      color: MANA_COLORS[c].fg,
                      boxShadow: color === c ? `inset 0 0 0 2px var(--accent), 0 0 8px var(--accent-glow)` : `inset 0 -1px 0 ${MANA_COLORS[c].ring}`,
                    }}
                    title={MANA_COLORS[c].name}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Type line</label>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 text-base focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Token Creature — Soldier"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">For</label>
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
              {(['human', 'ai'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                    side === s ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {s === 'human' ? 'You' : 'AI'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-800/80 flex gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <div className="flex-1" />
          <button
            onClick={create}
            className="px-4 py-2 rounded-md text-sm font-medium text-zinc-950 transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'var(--accent)' }}
          >
            Create token →
          </button>
        </div>
      </div>
    </div>
  );
}

function CombatResultPopup({
  attackingSide,
  defenderDamage,
  deadAttackers,
  deadBlockers,
  perAttackerLog,
  onClose,
}: {
  attackingSide: 'human' | 'ai';
  defenderDamage: number;
  deadAttackers: Card[];
  deadBlockers: Card[];
  perAttackerLog: { attacker: string; blocker?: string; outcome: 'hits' | 'trades' | 'kills' | 'dies' | 'clashes'; damage: number }[];
  onClose: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const defenderLabel = attackingSide === 'human' ? 'AI' : 'You';
  const aiAttacked = attackingSide === 'ai';
  const accent = aiAttacked ? '#f87171' : 'var(--accent)';
  const tint = aiAttacked ? 'rgba(248,113,113,0.15)' : 'rgba(160,120,255,0.15)';

  const outcomePhrase = (entry: typeof perAttackerLog[number]): string => {
    switch (entry.outcome) {
      case 'hits': return `hits ${defenderLabel.toLowerCase()} for ${entry.damage}`;
      case 'trades': return `trades with ${entry.blocker}`;
      case 'kills': return `kills ${entry.blocker}`;
      case 'dies': return `dies to ${entry.blocker}`;
      case 'clashes': return `clashes with ${entry.blocker} (no damage)`;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-[480px] rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1c1c20, #131316)',
          boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), 0 0 80px ${tint}`,
          animation: 'popupIn 240ms cubic-bezier(.2,.9,.3,1.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center font-mono text-xs font-bold"
            style={{ background: accent, color: '#18181b' }}
          >
            ⚔
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Combat resolved</div>
            <div className="text-zinc-100 text-sm font-medium">
              {aiAttacked ? 'AI attacked you' : 'You attacked the AI'}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Headline numbers */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-500">Damage to {defenderLabel.toLowerCase()}</div>
              <div className="font-mono font-bold text-3xl" style={{ color: defenderDamage > 0 ? '#f87171' : '#52525b' }}>
                {defenderDamage}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-500">Creatures killed</div>
              <div className="font-mono font-bold text-3xl text-zinc-200">
                {deadAttackers.length + deadBlockers.length}
              </div>
            </div>
          </div>

          {/* Per-attacker breakdown */}
          {perAttackerLog.length > 0 && (
            <div className="rounded-md border border-zinc-800/80 bg-zinc-950/60 divide-y divide-zinc-800/60">
              {perAttackerLog.map((entry, i) => (
                <div key={i} className="px-3 py-2 flex items-baseline gap-2 text-[12.5px]">
                  <span className="text-zinc-100 font-medium">{entry.attacker}</span>
                  <span className="text-zinc-400">{outcomePhrase(entry)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Dead lists */}
          {(deadAttackers.length > 0 || deadBlockers.length > 0) && (
            <div className="flex flex-col gap-1.5 text-[12px]">
              {deadAttackers.length > 0 && (
                <DeadRow
                  label={`${aiAttacked ? "AI's" : 'Your'} dead attacker${deadAttackers.length === 1 ? '' : 's'}`}
                  cards={deadAttackers}
                />
              )}
              {deadBlockers.length > 0 && (
                <DeadRow
                  label={`${aiAttacked ? 'Your' : "AI's"} dead blocker${deadBlockers.length === 1 ? '' : 's'}`}
                  cards={deadBlockers}
                />
              )}
            </div>
          )}

          {/* Nothing-happened note (purely informational so the user doesn't think nothing fired) */}
          {defenderDamage === 0 && deadAttackers.length === 0 && deadBlockers.length === 0 && (
            <div className="text-zinc-400 text-[12.5px] text-center py-2">
              All attackers blocked harmlessly — no damage, no deaths.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-800/80 flex justify-end">
          <button
            autoFocus
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: accent, color: '#18181b' }}
          >
            OK (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}

function DeadRow({ label, cards }: { label: string; cards: Card[] }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {cards.map((c) => (
          <span
            key={c.id}
            className="px-2 py-0.5 rounded text-zinc-300 font-mono text-[11px]"
            style={{ background: 'rgba(63,63,70,0.55)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            {c.name}{c.pt ? ` (${c.pt})` : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function NewGameConfirmModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onConfirm]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-[420px] rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1c1c20, #131316)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), 0 0 80px rgba(248,113,113,0.18)',
          animation: 'popupIn 220ms cubic-bezier(.2,.9,.3,1.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center font-mono text-xs font-bold"
            style={{ background: '#f87171', color: '#18181b' }}
          >
            !
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Start new game?</div>
            <div className="text-zinc-100 text-sm font-medium">Your current game state will be wiped</div>
          </div>
        </div>
        <div className="px-6 py-5 text-zinc-300 text-sm leading-relaxed">
          Hands, battlefields, life totals, and the action log will all reset. This can't be undone.
        </div>
        <div className="px-6 py-4 border-t border-zinc-800/80 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            autoFocus
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-md text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: '#f87171', color: '#18181b' }}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyHandNote({ text, accent }: { text: string; accent: string }) {
  return (
    <div
      className="rounded-lg px-4 py-6 text-center text-zinc-300 text-[13px] leading-relaxed"
      style={{ background: 'rgba(24,24,27,0.5)', border: `1px dashed ${accent}` }}
    >
      {text}
    </div>
  );
}

function MicButton({
  recording,
  onMouseDown,
  onMouseUp,
}: {
  recording: boolean;
  onMouseDown: () => void;
  onMouseUp: () => void;
}) {
  return (
    <div className="relative">
      {recording && (
        <>
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'var(--accent)', animation: 'micPulse 1.4s ease-out infinite' }}
          />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'var(--accent)', animation: 'micPulse 1.4s ease-out infinite 0.4s' }}
          />
        </>
      )}
      <button
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onMouseDown}
        onTouchEnd={onMouseUp}
        className="relative w-[88px] h-[88px] rounded-full flex items-center justify-center transition-all active:scale-95"
        style={{
          background: recording
            ? 'radial-gradient(circle at 35% 30%, var(--accent), color-mix(in oklab, var(--accent) 60%, #000))'
            : 'radial-gradient(circle at 35% 30%, #3f3f46, #18181b)',
          boxShadow: recording
            ? '0 0 0 4px rgba(160,120,255,0.2), 0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)'
            : '0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ color: recording ? '#fff' : '#d4d4d8' }}>
          <rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.2em] font-mono whitespace-nowrap text-zinc-500">
        {recording ? <span style={{ color: 'var(--accent)' }}>listening…</span> : 'hold to speak'}
      </div>
    </div>
  );
}

/** Re-exported for any callers that previously imported from this module. */
export type AIProposal = LLMProposal;

function AIDecisionPopup({
  proposal,
  onApprove,
  onReject,
}: {
  proposal: AIProposal | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (!proposal) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-[480px] rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1c1c20, #131316)',
          boxShadow:
            '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), 0 0 80px rgba(160,120,255,0.15)',
          animation: 'popupIn 280ms cubic-bezier(.2,.9,.3,1.2)',
        }}
      >
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center font-mono text-xs font-bold"
            style={{ background: 'var(--accent)', color: '#18181b' }}
          >
            AI
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Proposed move</div>
            <div className="text-zinc-100 text-sm font-medium">{proposal.title}</div>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">
            confidence <span className="text-zinc-200">{proposal.confidence.toFixed(2)}</span>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="text-zinc-200 text-base leading-relaxed mb-4">{proposal.summary}</div>
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-md p-3 space-y-2">
            {proposal.reasons.map((r, i) => (
              <ReasonRow key={i} label={r.label} detail={r.detail} />
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-800/80 flex gap-2.5">
          <button
            onClick={onReject}
            className="flex-1 py-2.5 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            className="flex-1 py-2.5 rounded-md text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'var(--accent)', color: '#18181b' }}
          >
            Approve →
          </button>
        </div>
      </div>
    </div>
  );
}

function ReasonRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-baseline gap-3 text-xs">
      <div className="font-mono uppercase tracking-wider text-zinc-500 w-16 shrink-0">{label}</div>
      <div className="text-zinc-300">{detail}</div>
    </div>
  );
}

function DeckPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-500">{label}</div>
      <div className="font-mono text-sm text-zinc-200">{value}</div>
    </div>
  );
}

export function Battlefield() {
  const { state, dispatch } = useGame();
  const deckLib = useDeckLibrary();

  // UI-only state (not part of the game snapshot)
  const [voiceParsing, setVoiceParsing] = React.useState(false);
  const [voiceError, setVoiceError] = React.useState<string | null>(null);
  const [popup, setPopup] = React.useState(false);
  const [newGameOpen, setNewGameOpen] = React.useState(false);
  const [aiName, setAiName] = React.useState('Pyro the Reckless');
  const [zoomCard, setZoomCard] = React.useState<Card | null>(null);
  const [aiDeckId, setAiDeckId] = React.useState<string | null>(null);
  const [humanDeckId, setHumanDeckId] = React.useState<string | null>(() => deckLib.activeId);
  const aiDeckCards = React.useMemo(
    () => (aiDeckId ? deckLib.decks.find((d) => d.id === aiDeckId)?.cards ?? [] : []),
    [aiDeckId, deckLib.decks],
  );
  const humanDeckCards = React.useMemo(
    () => (humanDeckId ? deckLib.decks.find((d) => d.id === humanDeckId)?.cards ?? [] : []),
    [humanDeckId, deckLib.decks],
  );
  const [showHumanHand, setShowHumanHand] = React.useState(false);
  const [showAiHand, setShowAiHand] = React.useState(false);
  const [tokenModalSide, setTokenModalSide] = React.useState<'human' | 'ai' | null>(null);
  const [confirmNewGame, setConfirmNewGame] = React.useState(false);
  // Snapshot of the most recent combat result + the cards that died, kept so the popup can render
  // names/PT after the cards have already been removed from the battlefield.
  const [combatSummary, setCombatSummary] = React.useState<{
    attackingSide: 'human' | 'ai';
    defenderDamage: number;
    deadAttackers: Card[];
    deadBlockers: Card[];
    perAttackerLog: { attacker: string; blocker?: string; outcome: 'hits' | 'trades' | 'kills' | 'dies' | 'clashes'; damage: number }[];
  } | null>(null);
  const [density, setDensity] = React.useState<'normal' | 'compact'>('normal');
  const [aiNarration, setAiNarration] = React.useState("Your move. Let's see what you've got.");
  const [aiSpeaking, setAiSpeaking] = React.useState(false);
  const [aiTaking, setAiTaking] = React.useState(false);
  const [aiProposal, setAiProposal] = React.useState<AIProposal | null>(null);
  const [lastPlayed, setLastPlayed] = React.useState<{ key: number; text: string } | null>(null);
  const [log, setLog] = React.useState<LogEntry[]>([
    { who: 'human', text: 'Tapped Island for U' },
    { who: 'human', text: 'Cast Brainstorm' },
    { who: 'ai', text: 'Played Mountain' },
    { who: 'ai', text: 'Drew a card' },
  ]);
  const [hintVisible, setHintVisible] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('mtg.hintHidden') !== '1';
    } catch {
      return true;
    }
  });
  const dismissHint = () => {
    setHintVisible(false);
    try {
      localStorage.setItem('mtg.hintHidden', '1');
    } catch {
      /* ignore */
    }
  };
  const showHint = () => {
    setHintVisible(true);
    try {
      localStorage.setItem('mtg.hintHidden', '0');
    } catch {
      /* ignore */
    }
  };

  // Convenience aliases
  const humanLife = state.players.human.lifeTotal;
  const aiLife = state.players.ai.lifeTotal;
  const phase = state.currentPhase;
  const turn = state.turnNumber;
  const activeSide = state.activePlayer;
  const humanBoard = state.players.human.zones.battlefield;
  const aiBoard = state.players.ai.zones.battlefield;
  const aiHand = state.players.ai.zones.hand;
  const attackers = state.attackers;
  const combatStep = state.combatStep;
  const blockerMap = state.blockerMap;
  const pickingBlockerFor = state.pickingBlockerFor;
  const humanLibrary = state.players.human.libraryCount;
  const humanHand = state.players.human.zones.hand;
  const humanUntrackedHand = state.players.human.handCount;
  /** Total cards in the human's hand — tracked Card[] plus untracked count-only physical cards. */
  const humanHandCount = humanHand.length + humanUntrackedHand;
  const humanGraveyard = state.players.human.zones.graveyard.length;
  const humanExile = state.players.human.zones.exile.length;

  const setAiLife = React.useCallback(
    (v: number) => dispatch({ type: 'SET_LIFE', player: 'ai', value: v }),
    [dispatch],
  );
  const setHumanLife = React.useCallback(
    (v: number) => dispatch({ type: 'SET_LIFE', player: 'human', value: v }),
    [dispatch],
  );

  // Persona speech helper
  const aiSpeakTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const speak = React.useCallback((text: string, duration = 1100) => {
    setAiSpeaking(true);
    setAiNarration(text);
    if (aiSpeakTimer.current) clearTimeout(aiSpeakTimer.current);
    aiSpeakTimer.current = setTimeout(() => setAiSpeaking(false), duration);
  }, []);

  // PlayBar handlers (per-player; the bar picks the player via the side toggle).
  const playCardToZone = (card: Card, zone: PlayZone, player: PlaySide) => {
    const tappedFlag = zone === 'battlefield' ? { tapped: false } : {};
    // Place the card. Both sides now track hand contents as cards (previously human hand was count-only).
    dispatch({ type: 'PLACE_CARD', player, zone, card: { ...card, ...tappedFlag } });
    // Auto-remove from the same player's tracked hand when playing somewhere else.
    if (zone !== 'hand') {
      const fromHand = state.players[player].zones.hand.find(
        (h) => h.name.toLowerCase() === card.name.toLowerCase(),
      );
      if (fromHand) {
        dispatch({ type: 'REMOVE_CARD', cardId: fromHand.id });
      } else if (player === 'human' && state.players.human.handCount > 0) {
        // Played a physical card that wasn't tracked individually — decrement the untracked count.
        dispatch({ type: 'INC_HAND_COUNT', delta: -1 });
      }
    }
    // Adding to either side's hand also bumps library down by 1 (a card came from the library).
    if (zone === 'hand') {
      dispatch({ type: 'INC_LIBRARY_COUNT', player, delta: -1 });
    }
    const isLand = /Land/i.test(card.type);
    const sideLabel = player === 'human' ? 'You' : 'AI';
    if (zone === 'battlefield') {
      setLog((l) =>
        [{ who: player, text: `${sideLabel} played ${card.name} (${isLand ? 'land' : 'spell'})` }, ...l].slice(0, 12),
      );
      if (player === 'human' && !isLand) speak(`${card.name}? Let me see…`, 1400);
    } else if (zone === 'hand') {
      setLog((l) => [{ who: player, text: `${sideLabel} drew ${card.name}` }, ...l].slice(0, 12));
    } else {
      setLog((l) => [{ who: player, text: `${sideLabel}: ${card.name} → ${zone}` }, ...l].slice(0, 12));
    }
    setLastPlayed({ key: Date.now(), text: `+ ${card.name} → ${sideLabel}'s ${zone}` });
  };

  const createToken = ({
    name,
    pt,
    type,
    color,
    side,
  }: {
    name: string;
    pt: string;
    type: string;
    color: ManaColor;
    side: 'human' | 'ai';
  }) => {
    const card: Card = {
      id: `tok-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      cost: '',
      type,
      pt,
      colors: [color],
      rarity: 'common',
      token: true,
      tapped: false,
    };
    dispatch({ type: 'PLACE_CARD', player: side, zone: 'battlefield', card });
    const sideLabel = side === 'human' ? 'You' : 'AI';
    setLog((l) => [{ who: side, text: `${sideLabel} created ${name} ${pt} token` }, ...l].slice(0, 12));
    setLastPlayed({ key: Date.now(), text: `Created ${name} (${pt}) token` });
  };

  const handleNewGameClick = () => {
    // If a game is meaningfully in progress, confirm before wiping. Heuristic: past turn 1, or any
    // battlefield/hand/graveyard activity. New player on turn 1 with empty board goes straight in.
    const inProgress =
      state.turnNumber > 1 ||
      humanBoard.length > 0 ||
      aiBoard.length > 0 ||
      humanHand.length > 0 ||
      aiHand.length > 0 ||
      state.players.human.zones.graveyard.length > 0 ||
      state.players.ai.zones.graveyard.length > 0;
    if (inProgress) {
      setConfirmNewGame(true);
    } else {
      setNewGameOpen(true);
    }
  };

  const removeFromHand = (player: PlaySide, cardId: string) => {
    const card = state.players[player].zones.hand.find((c) => c.id === cardId);
    if (!card) return;
    dispatch({ type: 'REMOVE_CARD', cardId });
    const label = player === 'human' ? 'You' : 'AI';
    setLog((l) => [{ who: player, text: `${label} removed ${card.name} from hand` }, ...l].slice(0, 12));
  };

  const drawCard = (player: PlaySide) => {
    if (player === 'human') {
      if (humanLibrary <= 0) {
        speak('Empty library. You lose on your next draw.', 2200);
        return;
      }
      dispatch({ type: 'INC_LIBRARY_COUNT', player: 'human', delta: -1 });
      dispatch({ type: 'INC_HAND_COUNT', delta: 1 });
      setLog((l) => [{ who: 'human' as const, text: 'You drew a card' }, ...l].slice(0, 12));
      setLastPlayed({ key: Date.now(), text: 'You drew a card' });
    }
    // For AI, the PlayBar focuses the input instead — see PlayBar's Draw button.
  };

  const mulligan = (player: PlaySide) => {
    if (player !== 'human') return; // Mulligan only meaningful for the human's count.
    dispatch({ type: 'INC_LIBRARY_COUNT', player: 'human', delta: humanHandCount });
    dispatch({ type: 'SET_HAND_COUNT', value: 0 });
    setTimeout(() => dispatch({ type: 'SET_HAND_COUNT', value: 7 }), 200);
    setLog((l) => [{ who: 'human' as const, text: 'Mulligan — shuffled hand back' }, ...l].slice(0, 12));
    setLastPlayed({ key: Date.now(), text: 'Mulligan' });
  };

  // ---- AI persona derived state ----
  const aiCreatureCount = aiBoard.filter((c) => /Creature/i.test(c.type)).length;
  const aiPower = aiBoard
    .filter((c) => /Creature/i.test(c.type) && !c.tapped)
    .reduce((s, c) => s + (c.pt ? parseInt(c.pt.split('/')[0]) || 0 : 0), 0);

  const aiMood = React.useMemo(() => {
    if (aiTaking) return 'thinking' as const;
    if (combatStep === 'blockers' && attackers.length > 0) return 'worried' as const;
    if (aiLife <= 6) return 'worried' as const;
    if (humanLife <= 5 && aiPower >= humanLife) return 'smug' as const;
    if (humanLife <= 10) return 'aggressive' as const;
    if (
      aiCreatureCount >= 3 &&
      aiCreatureCount > humanBoard.filter((c) => /Creature/i.test(c.type)).length + 1
    )
      return 'confident' as const;
    if (activeSide === 'ai' && !aiTaking) return 'aggressive' as const;
    return 'neutral' as const;
  }, [aiTaking, aiLife, humanLife, aiPower, aiCreatureCount, humanBoard, activeSide, combatStep, attackers.length]);

  const aiConfidence = React.useMemo(() => {
    const lifeDelta = aiLife - humanLife;
    const boardDelta = aiCreatureCount - humanBoard.filter((c) => /Creature/i.test(c.type)).length;
    const clockPressure = Math.max(0, 20 - humanLife) / 20;
    const raw = 0.5 + lifeDelta * 0.02 + boardDelta * 0.06 + clockPressure * 0.25;
    return Math.max(8, Math.min(96, Math.round(raw * 100)));
  }, [aiLife, humanLife, aiCreatureCount, humanBoard]);

  const aiIntent = React.useMemo(() => {
    if (aiTaking) return 'Calculating optimal line of play…';
    if (combatStep === 'declare') return 'Bracing for incoming attack.';
    if (combatStep === 'blockers') {
      const unblocked = attackers.filter((a) => !blockerMap[a]).length;
      return `${unblocked} unblocked attacker${unblocked === 1 ? '' : 's'} — calculating trades.`;
    }
    if (humanLife <= 5) return 'Lethal damage available next combat.';
    if (humanLife <= 10) return 'Race to zero. Burn over blocks.';
    if (aiLife <= 6) return 'Conserve resources. Threaten lethal blockers.';
    return 'Apply pressure. Force a counter.';
  }, [aiTaking, combatStep, attackers, blockerMap, humanLife, aiLife]);

  React.useEffect(() => {
    if (phase === 'Combat' && activeSide === 'human') {
      speak("I see what you're doing. Bring them.");
    }
  }, [phase, activeSide, speak]);

  React.useEffect(() => {
    if (combatStep === 'blockers') {
      const unblockedPower = attackers
        .map((id) => humanBoard.find((c) => c.id === id))
        .filter((c): c is Card => Boolean(c))
        .filter((c) => !blockerMap[c.id])
        .reduce((s, c) => s + (parseInt(c.pt || '0') || 0), 0);
      if (unblockedPower >= aiLife) {
        speak("That's… potentially lethal. I need to find blocks.", 1600);
      } else if (Object.keys(blockerMap).length === 0) {
        speak('How am I supposed to block all of that?', 1400);
      }
    }
  }, [combatStep, attackers, blockerMap, aiLife, humanBoard, speak]);

  // ---- AI proposal ----
  // Fallback used when VITE_ANTHROPIC_API_KEY is missing — keeps the demo runnable.
  const buildMockProposal = (): AIProposal => {
    const aiCreatures = aiBoard.filter((c) => /Creature/i.test(c.type) && !c.tapped);
    const power = aiCreatures.reduce((s, c) => s + (parseInt(c.pt || '0') || 0), 0);
    const humanCreatures = humanBoard.filter((c) => /Creature/i.test(c.type));

    if (humanLife <= power && power > 0) {
      return {
        title: 'Combat — All-in for lethal (mock)',
        summary: `Attack with all ${aiCreatures.length} creatures for ${power} damage.`,
        damage: power,
        confidence: 0.92,
        actions: [{ kind: 'adjust_life', player: 'human', delta: -power }],
        reasons: [
          { label: 'Lethal', detail: `${power} damage ≥ your ${humanLife} life` },
          { label: 'Risk', detail: 'Trades off creatures but wins the game' },
          { label: 'Counters', detail: 'No removable threats from your hand' },
        ],
      };
    }
    if (aiCreatures.length > 0) {
      const aggro = aiCreatures.slice(0, Math.max(1, aiCreatures.length - 1));
      const aggrPower = aggro.reduce((s, c) => s + (parseInt(c.pt || '0') || 0), 0);
      return {
        title: 'Combat — Pressure attack (mock)',
        summary: `Attack with ${aggro.map((c) => c.name).join(' & ')} for ${aggrPower} damage. Hold back ${
          aiCreatures.length - aggro.length
        } for defense.`,
        damage: aggrPower,
        confidence: 0.78,
        actions: [{ kind: 'adjust_life', player: 'human', delta: -aggrPower }],
        reasons: [
          { label: 'Pressure', detail: `Drops you to ${humanLife - aggrPower} life` },
          { label: 'Threats', detail: humanCreatures.length > 0 ? `${humanCreatures.length} blocker(s) on your side` : 'No defenders' },
          { label: 'Reserve', detail: 'One creature held for crackback' },
        ],
      };
    }
    return {
      title: 'Main phase — Develop board (mock)',
      summary: 'Play Mountain and cast Eidolon of the Great Revel.',
      damage: 0,
      confidence: 0.71,
      actions: [],
      reasons: [
        { label: 'Tempo', detail: 'Adds a 2/2 that pings you for casting' },
        { label: 'Pressure', detail: 'Future turns deal ~4 damage minimum' },
        { label: 'Risk', detail: 'Vulnerable to your counterspells' },
      ],
    };
  };

  const [aiError, setAiError] = React.useState<string | null>(null);

  const takeAITurn = async () => {
    if (activeSide !== 'ai') {
      speak("It's your turn. Make a move and I'll respond.", 1600);
      return;
    }
    setAiTaking(true);
    setAiError(null);
    speak('Let me think about this…', 2400);
    try {
      const proposal: AIProposal = isLLMConfigured()
        ? await proposeAIMove(state)
        : buildMockProposal();
      setAiTaking(false);
      setAiProposal(proposal);
      speak(
        `I'll ${
          proposal.title.toLowerCase().includes('lethal')
            ? 'go for the win'
            : proposal.title.toLowerCase().includes('attack') || proposal.title.toLowerCase().includes('pressure')
            ? 'press the attack'
            : proposal.title.toLowerCase().includes('pass')
            ? 'hold for now'
            : 'develop my board'
        }.`,
        1400,
      );
      setPopup(true);
    } catch (err) {
      setAiTaking(false);
      const msg = err instanceof Error ? err.message : 'AI brain failed';
      setAiError(msg);
      setPopup(true);
      speak('Hmm. My brain hit a snag.', 1800);
    }
  };

  const explainAI = () => {
    if (humanLife <= 8) speak("My read: you're low. I'm racing — burn over blocks.", 3000);
    else if (humanBoard.filter((c) => /Creature/i.test(c.type)).length >= 3)
      speak('You have a board. I need to remove threats before they swing.', 3000);
    else speak('My read: 4 mana up means likely Counterspell. I want threats that survive.', 3200);
  };

  const nextPhase = () => {
    const isLastPhase = phase === PHASES[PHASES.length - 1];
    if (isLastPhase) {
      setLog((l) =>
        [{ who: activeSide === 'human' ? ('ai' as const) : ('human' as const), text: 'Turn passed' }, ...l].slice(0, 12),
      );
    }
    dispatch({ type: 'NEXT_PHASE' });
  };

  const tapCard = (side: Player, id: string) => {
    const board = state.players[side].zones.battlefield;
    const card = board.find((c) => c.id === id);
    if (!card) return;

    const attackingSide = state.attackingSide;
    const defendingSide: Player = attackingSide === 'human' ? 'ai' : 'human';

    if (combatStep === 'declare' && side === attackingSide && /Creature/i.test(card.type)) {
      const isAttacker = attackers.includes(id);
      dispatch({ type: 'COMBAT_TOGGLE_ATTACKER', cardId: id });
      setLog((l) =>
        [
          {
            who: attackingSide as 'ai' | 'human',
            text: `${isAttacker ? 'Removed' : 'Declared'} ${card.name} ${
              isAttacker ? 'from combat' : 'as attacker'
            }`,
          },
          ...l,
        ].slice(0, 12),
      );
      return;
    }

    if (combatStep === 'blockers') {
      // Click on an attacker (attacking side) → focus that attacker for blocker assignment.
      if (side === attackingSide && attackers.includes(id)) {
        dispatch({ type: 'COMBAT_PICK_BLOCKER_FOR', attackerId: pickingBlockerFor === id ? null : id });
        return;
      }
      // Click on a creature on the defending side → assign as blocker for the picked attacker.
      if (side === defendingSide && /Creature/i.test(card.type)) {
        const existingAttacker = Object.entries(blockerMap).find(([, blk]) => blk === id);
        if (existingAttacker) {
          dispatch({ type: 'COMBAT_REMOVE_BLOCKER', blockerId: id });
          setLog((l) =>
            [{ who: defendingSide as 'ai' | 'human', text: `Removed ${card.name} from blocking` }, ...l].slice(0, 12),
          );
          return;
        }
        if (pickingBlockerFor && !card.tapped) {
          const attackerBoard = state.players[attackingSide].zones.battlefield;
          const attCard = attackerBoard.find((c) => c.id === pickingBlockerFor);
          dispatch({ type: 'COMBAT_ASSIGN_BLOCKER', attackerId: pickingBlockerFor, blockerId: id });
          setLog((l) =>
            [{ who: defendingSide as 'ai' | 'human', text: `${card.name} blocks ${attCard ? attCard.name : ''}` }, ...l].slice(0, 12),
          );
          return;
        }
      }
      return;
    }

    dispatch({ type: 'TOGGLE_TAP', cardId: id });
    setLog((l) => [{ who: side, text: `${card.tapped ? 'Untapped' : 'Tapped'} ${card.name}` }, ...l].slice(0, 12));
  };

  const continueToBlockers = () => {
    dispatch({ type: 'COMBAT_CONTINUE_TO_BLOCKERS' });
    setLog((l) => [{ who: 'ai' as const, text: 'AI is declaring blockers…' }, ...l].slice(0, 12));
  };

  const autoBlock = () => {
    dispatch({ type: 'COMBAT_AUTO_BLOCK' });
    const defenderBoard = state.attackingSide === 'human' ? aiBoard : humanBoard;
    const available = defenderBoard.filter((c) => /Creature/i.test(c.type) && !c.tapped);
    const count = Math.min(available.length, attackers.length);
    const who: 'ai' | 'human' = state.attackingSide === 'human' ? 'ai' : 'human';
    setLog((l) => [{ who, text: `Auto-assigned ${count} blocker(s)` }, ...l].slice(0, 12));
  };

  const skipBlockers = () => {
    dispatch({ type: 'COMBAT_SKIP_BLOCKERS' });
    const who: 'ai' | 'human' = state.attackingSide === 'human' ? 'ai' : 'human';
    setLog((l) => [{ who, text: 'No blockers — all damage will go through' }, ...l].slice(0, 12));
  };

  const resolveCombat = () => {
    const result = computeCombatResult(state);
    const defenderLabel = state.attackingSide === 'human' ? 'AI' : 'You';
    const attackerBoard = state.attackingSide === 'human' ? humanBoard : aiBoard;
    const defenderBoardForLookup = state.attackingSide === 'human' ? aiBoard : humanBoard;
    // Snapshot the killed cards by id BEFORE dispatch, so the result popup can display names/PT
    // even though the cards will be moved out of the battlefield by COMBAT_APPLY_RESULT.
    const deadAttackerCards = attackerBoard.filter((c) => result.deadAttackerIds.includes(c.id));
    const deadBlockerCards = defenderBoardForLookup.filter((c) => result.deadBlockerIds.includes(c.id));
    dispatch({
      type: 'COMBAT_APPLY_RESULT',
      defenderDamage: result.defenderDamage,
      deadAttackerIds: result.deadAttackerIds,
      deadBlockerIds: result.deadBlockerIds,
    });
    setCombatSummary({
      attackingSide: state.attackingSide,
      defenderDamage: result.defenderDamage,
      deadAttackers: deadAttackerCards,
      deadBlockers: deadBlockerCards,
      perAttackerLog: result.perAttackerLog,
    });
    const resolveLog = result.perAttackerLog.map((entry) => {
      if (entry.outcome === 'hits') return `${entry.attacker} hits for ${entry.damage}`;
      const verb = entry.outcome === 'trades' ? 'trades with' : entry.outcome === 'kills' ? 'kills' : entry.outcome === 'dies' ? 'dies to' : 'clashes with';
      return `${entry.attacker} ${verb} ${entry.blocker}`;
    });
    setLog((l) =>
      [
        {
          who: state.attackingSide as 'ai' | 'human',
          text: `Combat: ${result.defenderDamage} to ${defenderLabel}, ${result.deadAttackerIds.length} attacker dead, ${result.deadBlockerIds.length} blocker dead`,
        },
        ...resolveLog.slice(0, 3).reverse().map((t) => ({ who: state.attackingSide as 'ai' | 'human', text: t })),
        ...l,
      ].slice(0, 12),
    );

    if (state.attackingSide === 'human') {
      if (result.defenderDamage >= 5) speak(`Ouch. ${result.defenderDamage} damage. I'm on the back foot.`, 2200);
      else if (result.defenderDamage === 0 && result.deadAttackerIds.length > 0) speak('Nice trade. Tempo win for me.', 1800);
      else if (result.defenderDamage > 0) speak(`${result.defenderDamage} through. Acceptable.`, 1400);
      else speak('Stalemate. We continue.', 1200);
    } else {
      if (result.defenderDamage >= 5) speak(`That's ${result.defenderDamage} damage to you. Feel it?`, 2200);
      else if (result.defenderDamage > 0) speak(`Through for ${result.defenderDamage}.`, 1400);
      else speak('Well-blocked. We trade.', 1400);
    }
  };

  const clearAttackers = () => {
    dispatch({ type: 'COMBAT_CLEAR_ATTACKERS' });
    setLog((l) => [{ who: 'human' as const, text: 'Cleared attackers' }, ...l].slice(0, 12));
  };

  // Auto-skip AI bookkeeping phases (Untap, End). The AI doesn't have a meaningful decision in these
  // phases and forcing the user to manually click Next phase here was a major source of confusion.
  // Draw is intentionally NOT skipped — the user still needs to log what the AI drew via the play bar.
  React.useEffect(() => {
    if (activeSide !== 'ai') return;
    if (phase !== 'Untap' && phase !== 'End') return;
    if (combatStep) return; // Don't advance while a combat resolution is pending.
    if (popup) return; // Don't advance while a decision popup is up.
    if (aiTaking) return; // Don't advance mid brain call.
    const t = setTimeout(() => dispatch({ type: 'NEXT_PHASE' }), 250);
    return () => clearTimeout(t);
  }, [activeSide, phase, combatStep, popup, aiTaking, dispatch]);

  // The "Take AI's turn" button is meaningful only when:
  //   (1) it's the AI's turn, and
  //   (2) we're in a phase where the AI normally decides something, and
  //   (3) the human isn't mid-combat (combat UI takes priority).
  // Untap/End auto-skip via effect. Draw is intentionally disabled — the user has to log the AI's draw.
  const aiPhaseHasAction = ['Upkeep', 'Main 1', 'Combat', 'Main 2'].includes(phase);
  const aiButtonDisabled = activeSide !== 'ai' || combatStep !== null || !aiPhaseHasAction;
  const aiButtonDisabledReason: string =
    activeSide !== 'ai'
      ? `Waiting — your ${phase}`
      : combatStep === 'declare'
      ? 'Waiting — pick your attackers'
      : combatStep === 'blockers'
      ? state.attackingSide === 'ai'
        ? 'Waiting — assign your blockers'
        : 'Waiting — AI is blocking'
      : phase === 'Draw'
      ? 'Log AI\'s drawn card via the play bar (for: AI → Hand)'
      : phase === 'Untap' || phase === 'End'
      ? `${phase} — advancing…`
      : `AI's ${phase}`;

  const moveCard = (cardId: string, toZone: 'graveyard' | 'exile' | 'hand') => {
    const allCards = [
      ...state.players.human.zones.battlefield,
      ...state.players.ai.zones.battlefield,
    ];
    const card = allCards.find((c) => c.id === cardId);
    if (!card) return;
    dispatch({ type: 'MOVE_CARD', cardId, toZone });
    const owner: 'human' | 'ai' = state.players.human.zones.battlefield.some((c) => c.id === cardId) ? 'human' : 'ai';
    const label = owner === 'human' ? 'You' : 'AI';
    const verb = toZone === 'graveyard' ? 'sent to graveyard' : toZone === 'exile' ? 'exiled' : 'returned to hand';
    setLog((l) => [{ who: owner, text: `${label}: ${card.name} ${verb}` }, ...l].slice(0, 12));
  };

  const adjustCounter = (cardId: string, kind: 'plusOne', delta: number) => {
    const board = [...state.players.human.zones.battlefield, ...state.players.ai.zones.battlefield];
    const card = board.find((c) => c.id === cardId);
    if (!card) return;
    dispatch({ type: 'ADJUST_COUNTER', cardId, kind, delta });
    const current = card.counters?.[kind] ?? 0;
    const next = Math.max(0, current + delta);
    setLog((l) =>
      [
        {
          who: state.players.human.zones.battlefield.some((c) => c.id === cardId) ? 'human' as const : 'ai' as const,
          text: `${card.name} now has ${next} ${kind === 'plusOne' ? '+1/+1' : kind} counter${next === 1 ? '' : 's'}`,
        },
        ...l,
      ].slice(0, 12),
    );
  };

  const approveAI = () => {
    if (!aiProposal) return;
    const declaresAttackers = aiProposal.actions.some((a) => a.kind === 'ai_declare_attackers');
    const result = applyActions(aiProposal.actions, state, dispatch);
    const dmg = aiProposal.damage;
    setLog((l) =>
      [
        {
          who: 'ai' as const,
          text: `${aiProposal.title} — approved (${result.applied}/${aiProposal.actions.length} actions${
            dmg > 0 ? `, ${dmg} dmg` : ''
          })`,
        },
        ...l,
      ].slice(0, 12),
    );
    // Persona line depends on what just happened — combat declaration needs the human to assign blockers next.
    if (declaresAttackers) speak('I attack. Block if you can.', 1800);
    else if (dmg > 0) speak(`That's ${dmg} to you. Your turn.`, 1800);
    else speak('Move resolved. Your turn.', 1800);
    setPopup(false);
    setAiProposal(null);
    setAiError(null);

    // Auto-advance the phase once the AI's decision is in. We skip this when:
    //  - The AI declared attackers (combat UI now needs human blockers; COMBAT_APPLY_RESULT will advance later)
    //  - It's no longer the AI's turn (e.g. mock proposal during human turn — defensive)
    // Without this the user had to manually hit Next phase between Main 1 → Combat → Main 2, which is the
    // primary source of the "wait, did the AI just pass?" confusion.
    if (!declaresAttackers && state.activePlayer === 'ai') {
      dispatch({ type: 'NEXT_PHASE' });
    }
  };
  const rejectAI = () => {
    setLog((l) => [{ who: 'human' as const, text: 'Rejected AI proposal' }, ...l]);
    speak("Fine. I'll find another line.", 1600);
    setPopup(false);
    setAiProposal(null);
    setAiError(null);
  };

  // Voice: webkitSpeechRecognition → Claude (Haiku) → applyActions
  // The shared structuredCall + VoiceActionsSchema + applyActions stack from Phase 5
  // is reused as-is; only the input source (transcript instead of game state) is new.
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const onTranscriptFinal = React.useCallback(async (transcript: string) => {
    const trimmed = transcript.trim();
    if (!trimmed) return;
    setLog((l) => [{ who: 'human' as const, text: `"${trimmed}"` }, ...l].slice(0, 12));
    if (!isLLMConfigured()) {
      setVoiceError('Voice parsing needs VITE_ANTHROPIC_API_KEY (see CLAUDE.md).');
      return;
    }
    setVoiceParsing(true);
    setVoiceError(null);
    try {
      const result = await parseVoiceTranscript(trimmed, stateRef.current);
      const applied = applyActions(result.actions, stateRef.current, dispatch);
      setLastPlayed({
        key: Date.now(),
        text:
          applied.applied > 0
            ? `Applied ${applied.applied} action${applied.applied === 1 ? '' : 's'}`
            : 'No actions',
      });
      setLog((l) =>
        [{ who: 'human' as const, text: `Voice → ${applied.applied} action(s)` }, ...l].slice(0, 12),
      );
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'voice parse failed');
    } finally {
      setVoiceParsing(false);
    }
  }, [dispatch]);

  const speech = useSpeech({ onFinal: onTranscriptFinal });

  // PlayBar autocomplete pulls from the human's selected deck (or active library deck) — falls back to the sample.
  const playBarDeck = humanDeckCards.length > 0 ? humanDeckCards : STARTER_DECK;

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden">
      <div
        className="flex-1 min-h-0 flex flex-col px-6 pt-5 pb-3"
        style={{
          background:
            'linear-gradient(180deg, rgba(248,113,113,0.05) 0%, rgba(248,113,113,0.02) 60%, rgba(0,0,0,0) 100%)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-5">
            <LifeCounter value={aiLife} onChange={setAiLife} label="AI Life" side="ai" />
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-zinc-600">
              opponent turn {activeSide === 'ai' ? '↻' : ''}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <DeckPill label="Library" value={state.players.ai.libraryCount} />
            <DeckPill label="Graveyard" value={state.players.ai.zones.graveyard.length} />
            <DeckPill label="Exile" value={state.players.ai.zones.exile.length} />
            <ShowHandButton
              side="ai"
              count={aiHand.length}
              open={showAiHand}
              onToggle={() => setShowAiHand((v) => !v)}
            />
            <CreateTokenButton side="ai" onClick={() => setTokenModalSide('ai')} />
          </div>
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex-1 min-w-0">
            <Zone
              label="AI battlefield"
              cards={aiBoard}
              onCardClick={(id) => tapCard('ai', id)}
              onCardZoom={setZoomCard}
              density={density}
              side="ai"
              accent="rgba(248,113,113,0.025)"
              attackerIds={attackers}
              blockerMap={blockerMap}
              combatStep={combatStep}
              attackingSide={state.attackingSide}
              pickingBlockerFor={pickingBlockerFor}
              onAdjustCounter={adjustCounter}
              onMoveCard={moveCard}
            />
          </div>
          <div className="w-[380px] shrink-0 flex flex-col gap-3 min-h-0">
            <AIPersona
              name={aiName}
              deck="Mono-Red Burn"
              mood={aiMood}
              narration={aiNarration}
              speaking={aiSpeaking}
              confidence={aiConfidence}
              intent={aiIntent}
              active={activeSide === 'ai'}
              taking={aiTaking}
              disabled={aiButtonDisabled}
              disabledReason={aiButtonDisabledReason}
              takeTurnLabel={
                phase === 'Combat' ? 'Declare AI attackers' : `Take AI ${phase}`
              }
              onTakeTurn={takeAITurn}
              onExplain={explainAI}
            />
          </div>
        </div>
      </div>

      <div
        className="shrink-0 px-6 py-3 flex items-center gap-4 border-y border-zinc-800/80"
        style={{ background: 'linear-gradient(180deg, #0a0a0c 0%, #131316 50%, #0a0a0c 100%)' }}
      >
        <PhaseIndicator phase={phase} turn={turn} activeSide={activeSide} onNext={nextPhase} />
        <div className="flex-1 min-w-0">
          <ActionLog entries={log} />
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
          <button
            onClick={() => setDensity('normal')}
            className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-mono rounded ${
              density === 'normal' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => setDensity('compact')}
            className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-mono rounded ${
              density === 'compact' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'
            }`}
          >
            Compact
          </button>
        </div>
        <div className="w-px h-6 bg-zinc-800 mx-2" />
        <button
          onClick={handleNewGameClick}
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:brightness-110 active:scale-[0.98] flex items-center gap-1.5"
          style={{
            background: 'rgba(248,113,113,0.14)',
            color: '#f87171',
            border: '1px solid rgba(248,113,113,0.35)',
          }}
          title="Start a new game (will confirm if a game is in progress)"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6a4 4 0 0 1 7-2.65M10 6a4 4 0 0 1-7 2.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M9 1v2.5H6.5M3 11V8.5h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          New game
        </button>
      </div>

      <div
        className="flex-1 min-h-0 flex flex-col px-6 pt-3 pb-5"
        style={{
          background:
            'linear-gradient(0deg, rgba(96,165,250,0.06) 0%, rgba(96,165,250,0.02) 60%, rgba(0,0,0,0) 100%)',
        }}
      >
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <Zone
              label="Your battlefield"
              cards={humanBoard}
              onCardClick={(id) => tapCard('human', id)}
              onCardZoom={setZoomCard}
              density={density}
              side="human"
              accent="rgba(96,165,250,0.03)"
              attackerIds={attackers}
              blockerMap={blockerMap}
              combatStep={combatStep}
              attackingSide={state.attackingSide}
              pickingBlockerFor={pickingBlockerFor}
              onAdjustCounter={adjustCounter}
              onMoveCard={moveCard}
            />
            {combatStep && (
              <CombatBar
                step={combatStep}
                attackingSide={state.attackingSide}
                attackers={(state.attackingSide === 'human' ? humanBoard : aiBoard).filter((c) => attackers.includes(c.id))}
                blockerMap={blockerMap}
                aiBoard={aiBoard}
                onContinueToBlockers={continueToBlockers}
                onResolve={resolveCombat}
                onClear={clearAttackers}
                onSkipBlockers={skipBlockers}
                onAutoBlock={autoBlock}
              />
            )}
          </div>

          <div className="w-[320px] shrink-0 flex flex-col">
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">coach</div>
              <div className="flex-1 h-px bg-zinc-800/60" />
              {!hintVisible && (
                <button
                  onClick={showHint}
                  className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded transition-colors"
                  style={{ color: 'oklch(0.78 0.13 75)', background: 'oklch(0.78 0.13 75 / 0.1)' }}
                >
                  Show
                </button>
              )}
            </div>
            <div className="flex-1 min-h-0">
              {hintVisible ? (
                <HintCard
                  visible
                  fullWidth
                  hint={deriveHint({
                    phase,
                    combatStep,
                    activeSide,
                    attackers,
                    blockerMap,
                    pickingBlockerFor,
                    humanBoard,
                    aiBoard,
                    aiTaking,
                    turn,
                    humanLife,
                    aiLife,
                  })}
                  onDismiss={dismissHint}
                />
              ) : (
                <div
                  className="rounded-xl h-full flex flex-col items-center justify-center text-center px-4 py-8"
                  style={{ background: 'rgba(24,24,27,0.3)', border: '1px dashed #27272a' }}
                >
                  <div className="text-zinc-600 text-xs font-mono uppercase tracking-wider mb-2">Hints hidden</div>
                  <div className="text-zinc-500 text-[11px] leading-relaxed mb-4">
                    Tap "Show" above to bring back contextual guidance.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">log a play</div>
            <div className="text-[10px] text-zinc-600">— record a card you put in play, drew, or discarded</div>
            <div className="flex-1 h-px bg-zinc-800/60 ml-1" />
            <kbd className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800">
              / to focus
            </kbd>
          </div>
          <PlayBar
            humanDeck={playBarDeck}
            aiDeck={aiDeckCards}
            activePlayer={activeSide}
            onPlay={playCardToZone}
            onDraw={drawCard}
            onMulligan={mulligan}
            lastPlayed={lastPlayed}
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-5">
            <Avatar name="You" side="human" active={activeSide === 'human'} />
            <LifeCounter value={humanLife} onChange={setHumanLife} label="Your Life" side="human" />
          </div>
          <div className="flex items-center gap-4">
            <DeckPill label="Library" value={humanLibrary} />
            <DeckPill label="Graveyard" value={humanGraveyard} />
            <DeckPill label="Exile" value={humanExile} />
            <ShowHandButton
              side="human"
              count={humanHandCount}
              open={showHumanHand}
              onToggle={() => setShowHumanHand((v) => !v)}
            />
            <CreateTokenButton side="human" onClick={() => setTokenModalSide('human')} />
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
        {(speech.transcript || voiceParsing || voiceError) && (
          <div
            className="px-3 py-1.5 rounded-md font-mono text-[11px] max-w-[420px] text-center"
            style={{
              background: voiceError
                ? 'rgba(248,113,113,0.14)'
                : voiceParsing
                ? 'rgba(160,120,255,0.14)'
                : 'rgba(24,24,27,0.8)',
              color: voiceError ? '#f87171' : voiceParsing ? 'var(--accent)' : '#e4e4e7',
              border: `1px solid ${voiceError ? 'rgba(248,113,113,0.35)' : voiceParsing ? 'var(--accent-glow)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {voiceError
              ? voiceError
              : voiceParsing
              ? 'Parsing…'
              : `"${speech.transcript}"`}
          </div>
        )}
        <MicButton
          recording={speech.recording}
          onMouseDown={speech.supported ? speech.start : () => setVoiceError('Voice input not supported in this browser (Chromium only).')}
          onMouseUp={speech.stop}
        />
      </div>

      {popup && aiError && <AIErrorPopup message={aiError} onClose={rejectAI} />}
      {popup && !aiError && <AIDecisionPopup proposal={aiProposal} onApprove={approveAI} onReject={rejectAI} />}

      <CardDetailModal card={zoomCard} onClose={() => setZoomCard(null)} />

      {showAiHand && (
        <HandOverlay
          side="ai"
          cards={aiHand}
          count={aiHand.length}
          anchor="top"
          onClose={() => setShowAiHand(false)}
          onCardZoom={setZoomCard}
          onRemove={(id) => removeFromHand('ai', id)}
        />
      )}
      {showHumanHand && (
        <HandOverlay
          side="human"
          cards={humanHand}
          count={humanHandCount}
          untrackedCount={humanUntrackedHand}
          anchor="bottom"
          onClose={() => setShowHumanHand(false)}
          onCardZoom={setZoomCard}
          onRemove={(id) => removeFromHand('human', id)}
        />
      )}

      {tokenModalSide && (
        <CreateTokenModal
          defaultSide={tokenModalSide}
          onClose={() => setTokenModalSide(null)}
          onCreate={createToken}
        />
      )}

      {combatSummary && (
        <CombatResultPopup
          attackingSide={combatSummary.attackingSide}
          defenderDamage={combatSummary.defenderDamage}
          deadAttackers={combatSummary.deadAttackers}
          deadBlockers={combatSummary.deadBlockers}
          perAttackerLog={combatSummary.perAttackerLog}
          onClose={() => setCombatSummary(null)}
        />
      )}

      {confirmNewGame && (
        <NewGameConfirmModal
          onClose={() => setConfirmNewGame(false)}
          onConfirm={() => {
            setConfirmNewGame(false);
            setNewGameOpen(true);
          }}
        />
      )}

      <NewGameModal
        open={newGameOpen}
        onClose={() => setNewGameOpen(false)}
        onStarted={({ aiName: name, aiDeckId: aiId, humanDeckId: humanId }) => {
          if (name) setAiName(name);
          setAiDeckId(aiId ?? null);
          setHumanDeckId(humanId ?? null);
          // Wipe transient UI state so the fresh game starts clean.
          setPopup(false);
          setAiProposal(null);
          setAiError(null);
          setLastPlayed(null);
          setLog([{ who: 'human' as const, text: 'New game' }]);
        }}
      />
    </div>
  );
}

function AIErrorPopup({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-[480px] rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1c1c20, #131316)',
          boxShadow:
            '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), 0 0 80px rgba(248,113,113,0.15)',
          animation: 'popupIn 280ms cubic-bezier(.2,.9,.3,1.2)',
        }}
      >
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center font-mono text-xs font-bold"
            style={{ background: '#f87171', color: '#18181b' }}
          >
            !
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">AI brain error</div>
            <div className="text-zinc-100 text-sm font-medium">Couldn't get a move from the model</div>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="text-zinc-300 text-sm leading-relaxed font-mono whitespace-pre-wrap break-words">
            {message}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-zinc-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
