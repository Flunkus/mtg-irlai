// Play Bar — the user's primary way to log physical plays into the trainer.
// Type a card name → autocomplete from your deck → Enter to add to a zone.
// Visual styling lifted verbatim from claude-design-mockup/play-bar.jsx.

import * as React from 'react';
import { ManaCost } from './CardToken';
import type { Card } from '../types';

export type Zone = 'battlefield' | 'graveyard' | 'exile' | 'hand';
export type Side = 'human' | 'ai';

interface ZoneDef {
  id: Zone;
  label: string;
  shortcut: string;
  icon: string;
}

const ZONES: ZoneDef[] = [
  { id: 'battlefield', label: 'Battlefield', shortcut: 'P', icon: '◆' },
  { id: 'graveyard',   label: 'Graveyard',   shortcut: 'G', icon: '✕' },
  { id: 'exile',       label: 'Exile',       shortcut: 'E', icon: '⊘' },
  { id: 'hand',        label: 'Hand',        shortcut: 'H', icon: '◦' },
];

function ZoneTab({ zone, active, onClick }: { zone: ZoneDef; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-all"
      style={{
        background: active ? 'rgba(160,120,255,0.14)' : 'transparent',
        color: active ? 'var(--accent)' : '#71717a',
        border: `1px solid ${active ? 'var(--accent-glow)' : 'transparent'}`,
      }}
      title={`Play to ${zone.label} (${zone.shortcut})`}
    >
      <span className="font-mono text-xs leading-none">{zone.icon}</span>
      <span className="text-[11px] font-mono uppercase tracking-wider">{zone.label}</span>
    </button>
  );
}

interface PlayBarProps {
  /** Deck cards for the human side (used for autocomplete when "for: You"). */
  humanDeck: Card[];
  /** Deck cards for the AI side (used for autocomplete when "for: AI"). */
  aiDeck: Card[];
  /** Whose turn it is. The play bar auto-selects this side as the default target. */
  activePlayer: Side;
  /** Place a card. The handler is responsible for any library-count side-effects. */
  onPlay: (card: Card, zone: Zone, side: Side) => void;
  onDraw: (side: Side) => void;
  onDiscard?: () => void;
  onMulligan: (side: Side) => void;
  lastPlayed: { key: number; text: string } | null;
}

export function PlayBar({ humanDeck, aiDeck, activePlayer, onPlay, onDraw, onMulligan, lastPlayed }: PlayBarProps) {
  const [query, setQuery] = React.useState('');
  const [zone, setZone] = React.useState<Zone>('battlefield');
  const [forSide, setForSide] = React.useState<Side>(activePlayer);
  const [showMenu, setShowMenu] = React.useState(false);
  const [highlightIdx, setHighlightIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-sync the target side when the active player changes (start of next turn, etc.).
  // The user can still override manually.
  React.useEffect(() => {
    setForSide(activePlayer);
  }, [activePlayer]);

  const deckForSide = forSide === 'human' ? humanDeck : aiDeck;

  const catalogue = React.useMemo(() => {
    const seen = new Set<string>();
    return deckForSide.filter((c) => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  }, [deckForSide]);

  const matches = query.trim()
    ? catalogue.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  const playCard = (card: Card | null) => {
    const data: Card =
      card ||
      ({
        id: '',
        name: query.trim(),
        cost: '',
        type: 'Spell',
        pt: null,
        colors: ['C'],
        rarity: 'common',
        freeform: true,
      } as Card);
    if (!data.name) return;
    onPlay(
      { ...data, id: 'play-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) },
      zone,
      forSide,
    );
    setQuery('');
    setShowMenu(false);
    setHighlightIdx(0);
  };

  const trimmedQuery = query.trim();
  const hasMatches = matches.length > 0;

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(Math.max(0, matches.length - 1), i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hasMatches) {
        playCard(matches[highlightIdx]);
      } else if (trimmedQuery && e.shiftKey) {
        playCard(null);
      }
    } else if (e.key === 'Escape') {
      setShowMenu(false);
      if (!query) inputRef.current?.blur();
      setQuery('');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const idx = ZONES.findIndex((z) => z.id === zone);
      setZone(ZONES[(idx + (e.shiftKey ? -1 + ZONES.length : 1)) % ZONES.length].id);
    }
  };

  React.useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="relative rounded-xl"
      style={{
        background: 'linear-gradient(180deg, rgba(24,24,27,0.92), rgba(16,16,19,0.92))',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-stretch gap-2 p-2">
        {/* "FOR" side toggle — defaults to whoever's turn it is. */}
        <div className="flex items-center gap-1 pl-1 pr-2 border-r border-zinc-800">
          <div className="text-[9px] uppercase tracking-[0.16em] font-mono text-zinc-600 mr-1">for</div>
          {(['human', 'ai'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setForSide(s)}
              className="px-2.5 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all"
              style={{
                background: forSide === s ? (s === 'ai' ? 'rgba(248,113,113,0.14)' : 'rgba(160,120,255,0.14)') : 'transparent',
                color: forSide === s ? (s === 'ai' ? '#f87171' : 'var(--accent)') : '#71717a',
                border: `1px solid ${forSide === s ? (s === 'ai' ? 'rgba(248,113,113,0.35)' : 'var(--accent-glow)') : 'transparent'}`,
              }}
              title={s === 'human' ? "You — log a card you're playing" : 'AI — log a card the AI is playing (or drawing)'}
            >
              {s === 'human' ? 'You' : 'AI'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 pl-1 pr-2 border-r border-zinc-800">
          <div className="text-[9px] uppercase tracking-[0.16em] font-mono text-zinc-600 mr-1">send to</div>
          {ZONES.map((z) => (
            <ZoneTab key={z.id} zone={z} active={zone === z.id} onClick={() => setZone(z.id)} />
          ))}
        </div>

        <div className="flex-1 relative min-w-0">
          <div className="relative h-full">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
              width="13"
              height="13"
              viewBox="0 0 14 14"
              fill="none"
            >
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" />
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowMenu(true);
              }}
              onKeyDown={handleKey}
              onFocus={() => setShowMenu(true)}
              onBlur={() => setTimeout(() => setShowMenu(false), 150)}
              placeholder="Card name — type to search your deck (e.g. Brainstorm)"
              className="w-full h-full bg-zinc-950/80 rounded-md pl-8 pr-20 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors border"
              style={{
                borderColor:
                  trimmedQuery && !hasMatches
                    ? 'oklch(0.78 0.13 75 / 0.55)'
                    : trimmedQuery && hasMatches
                    ? 'var(--accent)'
                    : '#27272a',
              }}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {trimmedQuery && !hasMatches ? (
                <kbd
                  className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: 'oklch(0.78 0.13 75 / 0.18)', color: 'oklch(0.78 0.13 75)' }}
                >
                  not found
                </kbd>
              ) : trimmedQuery && hasMatches ? (
                <kbd
                  className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(160,120,255,0.18)', color: 'var(--accent)' }}
                >
                  ↵ Add
                </kbd>
              ) : (
                <>
                  <kbd className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    ↵ Add
                  </kbd>
                  <kbd className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 hidden sm:inline">
                    ⇥ Zone
                  </kbd>
                </>
              )}
            </div>
          </div>

          {showMenu && trimmedQuery && (
            hasMatches ? (
              <div
                className="absolute bottom-full left-0 right-0 mb-2 rounded-lg overflow-hidden z-30"
                style={{
                  background: 'rgba(10,10,12,0.97)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(160,120,255,0.22)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
                  animation: 'hintIn 180ms ease-out',
                }}
              >
                <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-zinc-800/70">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                    <span
                      className="text-[9px] uppercase tracking-[0.16em] font-mono"
                      style={{ color: 'var(--accent)' }}
                    >
                      {matches.length} match{matches.length === 1 ? '' : 'es'} in your deck
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-zinc-600">↑↓ to pick · ↵ to add</div>
                </div>
                {matches.map((m, i) => (
                  <div
                    key={m.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      playCard(m);
                    }}
                    onMouseEnter={() => setHighlightIdx(i)}
                    className="px-3 py-2 flex items-center gap-2.5 cursor-pointer transition-colors"
                    style={{
                      background: i === highlightIdx ? 'rgba(160,120,255,0.14)' : 'transparent',
                      borderLeft: `2px solid ${i === highlightIdx ? 'var(--accent)' : 'transparent'}`,
                    }}
                  >
                    <ManaCost cost={m.cost} size={13} />
                    <span className="text-zinc-100 text-sm flex-1 truncate">{m.name}</span>
                    <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider truncate">
                      {m.type.split('—')[0].trim()}
                    </span>
                    {m.pt && (
                      <span className="font-mono text-[10px] text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded">
                        {m.pt}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="absolute bottom-full left-0 right-0 mb-2 rounded-lg overflow-hidden z-30"
                style={{
                  background: 'rgba(20,16,8,0.97)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid oklch(0.78 0.13 75 / 0.3)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
                  animation: 'hintIn 180ms ease-out',
                }}
              >
                <div className="px-3 py-2 border-b" style={{ borderColor: 'oklch(0.78 0.13 75 / 0.18)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ color: 'oklch(0.78 0.13 75)' }}>
                      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M6 3v3.5M6 8.5v0.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    <span
                      className="text-[9px] uppercase tracking-[0.16em] font-mono"
                      style={{ color: 'oklch(0.78 0.13 75)' }}
                    >
                      not found in your deck
                    </span>
                  </div>
                  <div className="text-zinc-300 text-[13px] leading-snug">
                    No card matching{' '}
                    <span className="text-zinc-50 font-medium">"{trimmedQuery}"</span> in your active deck.
                  </div>
                </div>

                <div className="p-2 flex gap-2">
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="flex-1 px-3 py-2 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors flex items-center justify-center gap-1.5 border border-zinc-800"
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Clear & try again
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      playCard(null);
                    }}
                    className="flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all hover:brightness-110 flex items-center justify-center gap-1.5"
                    style={{ background: 'oklch(0.78 0.13 75)', color: '#1a1408' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    Add as freeform
                  </button>
                </div>

                <div
                  className="px-3 py-1.5 border-t flex items-center gap-2 text-[10px] font-mono text-zinc-600"
                  style={{ borderColor: 'oklch(0.78 0.13 75 / 0.12)' }}
                >
                  <span>Tip:</span>
                  <span>↵ does nothing here · ⇧↵ confirms freeform · esc clears</span>
                </div>
              </div>
            )
          )}
        </div>

        <div className="flex items-center gap-1 pl-2 border-l border-zinc-800">
          <ActionBtn
            label="Draw"
            onClick={() => {
              if (forSide === 'ai') {
                // AI hand needs a specific card — focus the input instead of an opaque count-only draw.
                setZone('hand');
                inputRef.current?.focus();
                return;
              }
              onDraw(forSide);
            }}
            shortcut="D"
          />
          <ActionBtn
            label="Mill"
            onClick={() =>
              onPlay(
                { id: 'mill-' + Date.now(), name: 'milled card', cost: '', type: 'Spell', pt: null, colors: ['C'] },
                'graveyard',
                forSide,
              )
            }
            shortcut="M"
          />
          <ActionBtn label="Mulligan" onClick={() => onMulligan(forSide)} shortcut="" />
        </div>
      </div>

      {lastPlayed && (
        <div
          key={lastPlayed.key}
          className="absolute -top-9 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-[11px] font-mono whitespace-nowrap flex items-center gap-1.5"
          style={{
            background: 'var(--accent)',
            color: '#0a0a0b',
            boxShadow: '0 6px 16px var(--accent-glow)',
            animation: 'playedToast 1.6s ease-out forwards',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
            <path d="M3.5 7.5L1.5 5.5l.7-.7 1.3 1.3 4.3-4.3.7.7z" />
          </svg>
          <span>{lastPlayed.text}</span>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, onClick, shortcut }: { label: string; onClick: () => void; shortcut: string }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-2 rounded-md text-[11px] font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors flex flex-col items-center leading-none gap-0.5"
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      <span>{label}</span>
      {shortcut && <span className="text-[8px] text-zinc-600">{shortcut}</span>}
    </button>
  );
}
