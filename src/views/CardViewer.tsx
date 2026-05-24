// Card Viewer — look up any Scryfall card by name, set+collector, or Scryfall ID.
// Display the large art + full oracle text + metadata. Recent lookups are kept
// in a short local history (in-memory only — not persisted).

import * as React from 'react';
import { CardToken } from '../components/CardToken';
import { fetchAny } from '../api/scryfall';
import type { Card } from '../types';

export function CardViewer() {
  const [query, setQuery] = React.useState('');
  const [card, setCard] = React.useState<Card | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [recent, setRecent] = React.useState<Card[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const lookup = async (e?: React.FormEvent) => {
    e && e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const c = await fetchAny(q);
      setCard(c);
      setRecent((prev) => {
        const without = prev.filter((p) => p.scryfallId !== c.scryfallId);
        return [c, ...without].slice(0, 8);
      });
      setQuery('');
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Not found');
      setCard(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex bg-zinc-950">
      <aside className="w-[340px] shrink-0 border-r border-zinc-800/80 flex flex-col bg-zinc-950">
        <div className="px-5 py-4 border-b border-zinc-800/80">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Look up</div>
          <h2 className="text-zinc-100 text-lg font-medium mt-0.5">Card Viewer</h2>
        </div>

        <form onSubmit={lookup} className="px-5 py-4 space-y-3 border-b border-zinc-800/80">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">
              Name, set + collector, or Scryfall ID
            </label>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Brainstorm, MH2 186, 77c6fa74-…"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 text-base focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-zinc-600"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md text-sm font-medium text-zinc-950 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? 'Fetching…' : 'Look up →'}
          </button>
          <div className="text-[11px] text-zinc-500 font-mono">
            {error ? (
              <span style={{ color: 'oklch(0.78 0.13 75)' }}>{error}</span>
            ) : (
              '↵ enter to lookup'
            )}
          </div>
        </form>

        <div className="px-5 py-4 flex-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3 font-mono">Recent</div>
          {recent.length === 0 ? (
            <div className="text-zinc-600 text-xs font-mono">No lookups yet.</div>
          ) : (
            <div className="space-y-1">
              {recent.map((r) => (
                <button
                  key={r.scryfallId}
                  onClick={() => setCard(r)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-900 transition-colors group flex items-center gap-2"
                  style={{
                    background: card?.scryfallId === r.scryfallId ? 'rgba(160,120,255,0.08)' : 'transparent',
                    borderLeft: `2px solid ${card?.scryfallId === r.scryfallId ? 'var(--accent)' : 'transparent'}`,
                  }}
                >
                  <span className="text-zinc-200 text-sm flex-1 truncate">{r.name}</span>
                  <span className="text-zinc-600 text-[10px] font-mono uppercase tracking-wider truncate">
                    {r.type.split('—')[0].trim()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="px-7 py-4 border-b border-zinc-800/80 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Viewing</div>
            <h1 className="text-zinc-100 text-xl font-medium mt-0.5">
              {card ? card.name : <span className="text-zinc-500 font-normal">No card loaded</span>}
            </h1>
          </div>
          {card && (
            <div className="text-zinc-500 text-[11px] font-mono uppercase tracking-wider">
              {card.set} · #{card.collectorNumber}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {!card ? (
            <div className="h-full flex items-center justify-center text-center text-zinc-600 font-mono text-sm">
              <div>
                <div className="text-zinc-400 mb-2">Type a card identifier on the left.</div>
                <div>Names: <span className="text-zinc-500">Lightning Bolt</span></div>
                <div>Set + #: <span className="text-zinc-500">MH2 186</span></div>
                <div>Scryfall ID: <span className="text-zinc-500">77c6fa74-…</span></div>
              </div>
            </div>
          ) : (
            <div className="px-7 py-6 flex gap-8 max-w-[1100px]">
              <div className="shrink-0 flex justify-center">
                <CardToken card={card} size="lg" hideRemove onClick={() => {}} />
              </div>
              <div className="flex-1 min-w-0 space-y-5">
                <MetaRow label="Mana cost" value={card.cost || '—'} mono />
                <MetaRow label="Type" value={card.type} />
                {card.pt && <MetaRow label="P/T" value={card.pt} mono />}
                <MetaRow label="Rarity" value={card.rarity || '—'} />
                <MetaRow label="Set" value={`${card.set?.toUpperCase()} #${card.collectorNumber}`} mono />
                {card.cmc != null && <MetaRow label="Mana value" value={String(card.cmc)} mono />}

                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mb-2">
                    Oracle text
                  </div>
                  <div
                    className="rounded-md p-4 text-zinc-200 text-sm leading-relaxed whitespace-pre-line"
                    style={{
                      background: 'rgba(24,24,27,0.6)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    {card.oracleText || <span className="text-zinc-500 italic">(no oracle text)</span>}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mb-2">
                    Scryfall ID
                  </div>
                  <div className="font-mono text-[12px] text-zinc-400 break-all">{card.scryfallId}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono w-24 shrink-0">{label}</div>
      <div className={`text-zinc-200 text-sm ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
