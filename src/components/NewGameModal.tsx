// "New game" modal — pick a human deck, an AI deck, starting life, and hand size.
// Confirm to dispatch RESET_GAME with a freshly shuffled state.

import * as React from 'react';
import { useDeckLibrary } from '../state/deckLibrary';
import { usePersonaLibrary } from '../state/personaLibrary';
import { useGame, buildNewGameState } from '../state/gameStore';

interface NewGameModalProps {
  open: boolean;
  onClose: () => void;
  /** Notified after a successful reset so the host can clear its UI-only state (logs, popups). */
  onStarted?: (opts: {
    aiName?: string;
    aiDeckId?: string;
    humanDeckId?: string;
    personaId?: string;
  }) => void;
}

export function NewGameModal({ open, onClose, onStarted }: NewGameModalProps) {
  const { dispatch } = useGame();
  const lib = useDeckLibrary();
  const personas = usePersonaLibrary();

  const [humanDeckId, setHumanDeckId] = React.useState<string>('');
  const [aiDeckId, setAiDeckId] = React.useState<string>('');
  const [startingLife, setStartingLife] = React.useState(20);
  const [handSize, setHandSize] = React.useState(7);
  const [personaId, setPersonaId] = React.useState<string>('');
  const [activePlayer, setActivePlayer] = React.useState<'human' | 'ai'>('human');

  // Seed sensible defaults when the modal opens.
  // We treat a stale id (set, but no longer present in the library — e.g. the deck was
  // deleted between games) the same as empty: needs re-seeding. Without this, the modal
  // carried the dead id over and the eventual game start propagated it into Battlefield,
  // leaving the PlayBar's AI autocomplete with no usable deck.
  React.useEffect(() => {
    if (!open) return;
    const humanDeckMissing = !humanDeckId || !lib.decks.some((d) => d.id === humanDeckId);
    const aiDeckMissing = !aiDeckId || !lib.decks.some((d) => d.id === aiDeckId);
    if (humanDeckMissing && lib.activeId) setHumanDeckId(lib.activeId);
    if (!personaId && personas.activeId) setPersonaId(personas.activeId);
    if (aiDeckMissing) {
      // If the seeded persona has a defaultDeckId, prefer that; otherwise pick any deck that isn't the human's.
      const seededPersona =
        personas.personas.find((p) => p.id === (personaId || personas.activeId));
      if (seededPersona?.defaultDeckId && lib.decks.some((d) => d.id === seededPersona.defaultDeckId)) {
        setAiDeckId(seededPersona.defaultDeckId);
      } else {
        const second = lib.decks.find((d) => d.id !== lib.activeId);
        if (second) setAiDeckId(second.id);
        else if (lib.activeId) setAiDeckId(lib.activeId);
        else setAiDeckId(''); // no decks at all — leave blank, the warning at the bottom kicks in
      }
    }
  }, [open, lib.activeId, lib.decks, humanDeckId, aiDeckId, personaId, personas.activeId, personas.personas]);

  const persona = personas.personas.find((p) => p.id === personaId) ?? null;

  // When the user picks a different persona mid-modal, jump the AI deck to that
  // persona's default deck (if any) so the choice feels coupled.
  const handlePersonaChange = (id: string) => {
    setPersonaId(id);
    const p = personas.personas.find((x) => x.id === id);
    if (p?.defaultDeckId && lib.decks.some((d) => d.id === p.defaultDeckId)) {
      setAiDeckId(p.defaultDeckId);
    }
  };

  if (!open) return null;

  const humanDeck = lib.decks.find((d) => d.id === humanDeckId);
  const aiDeck = lib.decks.find((d) => d.id === aiDeckId);
  const humanCount = humanDeck?.cards.reduce((s, c) => s + (c.qty ?? 1), 0) ?? 0;
  const aiCount = aiDeck?.cards.reduce((s, c) => s + (c.qty ?? 1), 0) ?? 0;

  const start = () => {
    const newState = buildNewGameState({
      humanDeckCards: humanDeck?.cards ?? [],
      aiDeckCards: aiDeck?.cards ?? [],
      startingLife,
      handSize,
      activePlayer,
    });
    // Sync the persona library's active selection so Battlefield + the brain pick this persona up.
    if (personaId) personas.setActive(personaId);
    const aiName = persona?.name;
    dispatch({ type: 'RESET_GAME', state: newState, aiName });
    onStarted?.({ aiName, aiDeckId, humanDeckId, personaId: personaId || undefined });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-[520px] rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #1c1c20, #131316)',
          boxShadow:
            '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), 0 0 80px rgba(160,120,255,0.15)',
          animation: 'popupIn 280ms cubic-bezier(.2,.9,.3,1.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center font-mono text-xs font-bold"
            style={{ background: 'var(--accent)', color: '#18181b' }}
          >
            ↻
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">New game</div>
            <div className="text-zinc-100 text-sm font-medium">Pick decks and starting conditions</div>
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

        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Human deck */}
          <DeckSelect
            label="Your deck"
            decks={lib.decks}
            value={humanDeckId}
            onChange={setHumanDeckId}
            count={humanCount}
          />
          {/* AI deck */}
          <DeckSelect
            label="AI deck"
            decks={lib.decks}
            value={aiDeckId}
            onChange={setAiDeckId}
            count={aiCount}
          />

          <div className="flex items-center gap-4">
            <NumberField label="Starting life" value={startingLife} onChange={setStartingLife} min={1} max={99} />
            <NumberField label="Hand size" value={handSize} onChange={setHandSize} min={0} max={20} />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">
              AI persona
            </label>
            <select
              value={personaId}
              onChange={(e) => handlePersonaChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 text-base focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="">(none — generic AI)</option>
              {personas.personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || 'Untitled persona'}
                </option>
              ))}
            </select>
            {persona ? (
              <div className="text-[11px] text-zinc-500 font-mono mt-1.5 leading-snug">
                <span className="text-zinc-400">{persona.archetypeLabel || '—'}</span>
                <span className="text-zinc-700"> · </span>
                <span>
                  voice {persona.voice.voiceName || 'default'} ·
                  rate {persona.voice.rate.toFixed(2)} ·
                  pitch {persona.voice.pitch.toFixed(2)}
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-zinc-600 font-mono mt-1.5 leading-snug">
                Manage personas from the sidebar → Personas to add personality and a voice.
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">
              Who goes first
            </label>
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
              {(['human', 'ai'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePlayer(p)}
                  className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors capitalize ${
                    activePlayer === p ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {p === 'human' ? 'You' : 'AI'}
                </button>
              ))}
            </div>
          </div>

          {lib.decks.length === 0 && (
            <div
              className="px-3 py-2 rounded font-mono text-xs"
              style={{
                background: 'rgba(248,113,113,0.14)',
                color: '#f87171',
                border: '1px solid rgba(248,113,113,0.35)',
              }}
            >
              You don't have any saved decks yet. Open Deck Manager → + New to create one first.
            </div>
          )}
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
            onClick={start}
            disabled={lib.decks.length === 0}
            className="px-4 py-2 rounded-md text-sm font-medium text-zinc-950 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)' }}
          >
            Start game →
          </button>
        </div>
      </div>
    </div>
  );
}

function DeckSelect({
  label,
  decks,
  value,
  onChange,
  count,
}: {
  label: string;
  decks: { id: string; name: string; cards: { qty?: number }[] }[];
  value: string;
  onChange: (id: string) => void;
  count: number;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 text-base focus:outline-none focus:border-[var(--accent)] transition-colors"
        >
          <option value="">(none — empty)</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name || 'Untitled'}
            </option>
          ))}
        </select>
        <div className="text-zinc-500 text-sm font-mono w-20 text-right">{count} cards</div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex-1">
      <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 font-mono text-base focus:outline-none focus:border-[var(--accent)] transition-colors"
      />
    </div>
  );
}
