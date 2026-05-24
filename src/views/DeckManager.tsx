// Deck Manager view.
// Visual styling lifted verbatim from claude-design-mockup/deck-manager.jsx.
// Phase 2: add/bulk-import now hit Scryfall; deck is persisted to localStorage.

import * as React from 'react';
import { CardToken } from '../components/CardToken';
import { CardDetailModal } from '../components/CardDetailModal';
import { useDeck } from '../state/deckStore';
import { useDeckLibrary, mergeDeckCards } from '../state/deckLibrary';
import { exportDeckToList, parseDeckList } from '../state/deckIO';
import { fetchByName, fetchBySetAndNumber, fetchCollection, parseBulkLine, looksLikeCollectorNumber, type CollectionRequest } from '../api/scryfall';

const SET_LOCK_KEY = 'mtg.lockedSet.v1';

export function DeckManager() {
  const { deck, addCards, removeCard } = useDeck();
  const lib = useDeckLibrary();
  const [switcherOpen, setSwitcherOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [exportFeedback, setExportFeedback] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);
  const [zoomCard, setZoomCard] = React.useState<import('../types').Card | null>(null);
  const switcherRef = React.useRef<HTMLDivElement>(null);

  // Close switcher when clicking outside.
  React.useEffect(() => {
    if (!switcherOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!switcherRef.current?.contains(e.target as Node)) setSwitcherOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [switcherOpen]);

  // Clear the "Copied!" toast after a moment.
  React.useEffect(() => {
    if (!exportFeedback) return;
    const t = setTimeout(() => setExportFeedback(null), 1800);
    return () => clearTimeout(t);
  }, [exportFeedback]);

  const [qtyInput, setQtyInput] = React.useState('1');
  const [nameInput, setNameInput] = React.useState('');
  const [bulkText, setBulkText] = React.useState('');
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [lockedSet, setLockedSetState] = React.useState<string>(() => {
    try { return localStorage.getItem(SET_LOCK_KEY) || ''; } catch { return ''; }
  });
  const setLockedSet = (v: string) => {
    setLockedSetState(v);
    try {
      if (v.trim()) localStorage.setItem(SET_LOCK_KEY, v.trim());
      else localStorage.removeItem(SET_LOCK_KEY);
    } catch { /* ignore */ }
  };
  const lockActive = lockedSet.trim().length > 0;
  const [filter, setFilter] = React.useState<'all' | 'creatures' | 'spells' | 'lands'>('all');
  const [search, setSearch] = React.useState('');
  const [addPending, setAddPending] = React.useState(false);
  const [bulkPending, setBulkPending] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);
  const [bulkSummary, setBulkSummary] = React.useState<string | null>(null);
  const nameRef = React.useRef<HTMLInputElement>(null);

  const totalCards = deck.reduce((s, c) => s + (c.qty || 1), 0);
  const lands = deck.filter((c) => /Land/i.test(c.type)).reduce((s, c) => s + (c.qty || 1), 0);
  const creatures = deck.filter((c) => /Creature/i.test(c.type)).reduce((s, c) => s + (c.qty || 1), 0);
  const spells = totalCards - lands - creatures;

  const addCard = async (e?: React.FormEvent) => {
    e && e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    const qty = Math.max(1, parseInt(qtyInput) || 1);
    setAddPending(true);
    setAddError(null);
    try {
      // When a set lock is active AND the input looks like a collector number,
      // route through fetchBySetAndNumber. Otherwise, fall through to name lookup.
      const card =
        lockActive && looksLikeCollectorNumber(name)
          ? await fetchBySetAndNumber(lockedSet.trim().toLowerCase(), name)
          : await fetchByName(name);
      addCards([{ ...card, qty }]);
      setNameInput('');
      setQtyInput('1');
      nameRef.current?.focus();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Card not found');
    } finally {
      setAddPending(false);
    }
  };

  const importBulk = async () => {
    const requests = bulkText
      .split('\n')
      .map((line) => parseBulkLine(line, lockedSet))
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (requests.length === 0) return;

    setBulkPending(true);
    setBulkSummary(null);
    try {
      const { found, notFound } = await fetchCollection(requests);
      // Carry qty from request → card. fetchCollection sets qty by name when possible;
      // for set+collector entries we patch qty here.
      const withQty = found.map((c) => {
        if (c.qty && c.qty > 1) return c;
        const match = requests.find(
          (r) =>
            ('name' in r && r.name.toLowerCase() === c.name.toLowerCase()) ||
            ('set' in r && 'collector_number' in r && r.set === c.set && r.collector_number === c.collectorNumber),
        );
        return match?.qty ? { ...c, qty: match.qty } : c;
      });
      addCards(withQty);
      setBulkText('');
      setBulkOpen(false);
      setBulkSummary(
        notFound.length === 0
          ? `Imported ${withQty.length} cards.`
          : `Imported ${withQty.length}. ${notFound.length} not found.`,
      );
    } catch (err) {
      setBulkSummary(err instanceof Error ? `Error: ${err.message}` : 'Bulk import failed');
    } finally {
      setBulkPending(false);
    }
  };

  const filtered = deck.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'creatures') return /Creature/i.test(c.type);
    if (filter === 'spells') return !/Creature|Land/i.test(c.type);
    if (filter === 'lands') return /Land/i.test(c.type);
    return true;
  });

  const grouped: Record<string, typeof deck> = {
    Creatures: filtered.filter((c) => /Creature/i.test(c.type)),
    Spells: filtered.filter((c) => !/Creature|Land/i.test(c.type)),
    Lands: filtered.filter((c) => /Land/i.test(c.type)),
  };

  const bulkLineCount = bulkText.split('\n').filter((l) => parseBulkLine(l, lockedSet) !== null).length;

  const handleExport = async () => {
    if (!lib.active) return;
    const text = exportDeckToList(lib.active.cards);
    try {
      await navigator.clipboard.writeText(text);
      setExportFeedback('Copied to clipboard');
    } catch {
      // Fallback: open in a prompt the user can copy from.
      window.prompt('Copy deck list:', text);
      setExportFeedback('Copied');
    }
  };

  const handleConfirmDelete = () => {
    if (pendingDelete) {
      lib.deleteDeck(pendingDelete);
      setPendingDelete(null);
    }
  };

  return (
    <div className="h-full flex bg-zinc-950">
      <aside className="w-[340px] shrink-0 border-r border-zinc-800/80 flex flex-col bg-zinc-950">
        <div className="px-5 py-4 border-b border-zinc-800/80">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Add cards</div>
          <h2 className="text-zinc-100 text-lg font-medium mt-0.5">Wizard</h2>
        </div>

        <form onSubmit={addCard} className="px-5 py-4 space-y-3 border-b border-zinc-800/80">
          <div className="flex gap-2">
            <div className="w-20">
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Qty</label>
              <input
                type="number"
                min="1"
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 font-mono text-base focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">
                {lockActive ? `Card name or ${lockedSet.toUpperCase()} #` : 'Card name / ID'}
              </label>
              <input
                ref={nameRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={lockActive ? 'e.g. 186 or Brainstorm' : 'e.g. Brainstorm'}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 text-base focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={addPending}
            className="w-full py-2.5 rounded-md text-sm font-medium text-zinc-950 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
            style={{ background: 'var(--accent)' }}
          >
            {addPending ? 'Fetching…' : 'Add to deck →'}
          </button>
          <div className="text-[11px] text-zinc-500 font-mono">
            {addError ? (
              <span style={{ color: 'oklch(0.78 0.13 75)' }}>{addError}</span>
            ) : (
              '↵ enter to add quickly'
            )}
          </div>
        </form>

        <div className="px-5 py-4 border-b border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Set lock</label>
            {lockActive && (
              <button
                onClick={() => setLockedSet('')}
                className="text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-300 font-mono"
              >
                clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={lockedSet}
              onChange={(e) => setLockedSet(e.target.value.toUpperCase())}
              placeholder="e.g. FIN"
              maxLength={5}
              className="flex-1 bg-zinc-900 border rounded-md px-2.5 py-1.5 text-zinc-100 font-mono text-sm focus:outline-none transition-colors placeholder:text-zinc-600 uppercase"
              style={{ borderColor: lockActive ? 'var(--accent)' : '#27272a' }}
            />
            {lockActive && (
              <div
                className="px-2 py-1 rounded font-mono text-[10px] uppercase tracking-wider"
                style={{ background: 'rgba(160,120,255,0.18)', color: 'var(--accent)' }}
              >
                locked
              </div>
            )}
          </div>
          <div className="text-[11px] text-zinc-600 font-mono mt-2 leading-snug">
            {lockActive
              ? `Numbers like "4 186" resolve to ${lockedSet.toUpperCase()} #186.`
              : 'Set a 2–5 char set code to enter cards by collector number only.'}
          </div>
        </div>

        <div className="px-5 py-4 border-b border-zinc-800/80">
          <button
            onClick={() => setBulkOpen(!bulkOpen)}
            className="w-full flex items-center justify-between text-left text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            <span className="text-sm font-medium">Bulk paste</span>
            <span className="text-zinc-500 text-xs font-mono">{bulkOpen ? '−' : '+'}</span>
          </button>
          {bulkOpen && (
            <div className="mt-3 space-y-2">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={
                  lockActive
                    ? `4 186\n2 245\n1 12a\n(or full lines: "4 ${lockedSet.toUpperCase()} 186")`
                    : '4 Brainstorm\n4 Ponder\n4 MH2 186'
                }
                rows={8}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-200 font-mono text-xs focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
              />
              <button
                onClick={importBulk}
                disabled={bulkPending || bulkLineCount === 0}
                className="w-full py-2 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-wait"
              >
                {bulkPending ? 'Importing…' : `Import ${bulkLineCount} lines`}
              </button>
            </div>
          )}
          {bulkSummary && (
            <div className="text-[11px] text-zinc-500 font-mono mt-2">{bulkSummary}</div>
          )}
        </div>

        <div className="px-5 py-4 mt-auto">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3 font-mono">Composition</div>
          <div className="space-y-2.5">
            <StatRow label="Total" value={totalCards} target={60} accent />
            <StatRow label="Creatures" value={creatures} />
            <StatRow label="Spells" value={spells} />
            <StatRow label="Lands" value={lands} />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="px-7 py-4 border-b border-zinc-800/80 flex flex-col gap-3">
          {/* Row 1 — label, filters, search */}
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Active deck</div>
            </div>
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
              {(['all', 'creatures', 'spells', 'lands'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs rounded transition-colors capitalize ${
                    filter === f ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-48 bg-zinc-900 border border-zinc-800 rounded-md pl-7 pr-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              <svg
                className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500"
                width="13"
                height="13"
                viewBox="0 0 14 14"
                fill="none"
              >
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" />
                <path d="M9.5 9.5L13 13" stroke="currentColor" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Row 2 — name input, switcher, action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {lib.active ? (
              <input
                value={lib.active.name}
                onChange={(e) => lib.renameDeck(lib.active!.id, e.target.value)}
                placeholder="Untitled deck"
                className="text-zinc-100 text-xl font-medium bg-transparent border-b border-transparent focus:border-[var(--accent)] focus:outline-none transition-colors min-w-[200px] max-w-[400px] py-0.5"
              />
            ) : (
              <span className="text-zinc-500 text-xl font-medium italic">No deck selected</span>
            )}
            {lib.active && (
              <span className="text-zinc-500 text-sm font-mono font-normal">{totalCards}/60</span>
            )}

            <div className="flex-1" />

            {/* Switcher */}
            <div className="relative" ref={switcherRef}>
              <button
                onClick={() => setSwitcherOpen((o) => !o)}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition-colors flex items-center gap-1.5"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Decks
                <span className="text-zinc-500 font-mono">{lib.decks.length}</span>
              </button>
              {switcherOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-[280px] rounded-lg overflow-hidden z-30"
                  style={{
                    background: 'rgba(10,10,12,0.97)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(160,120,255,0.22)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                    animation: 'hintIn 180ms ease-out',
                  }}
                >
                  <div className="px-3 py-2 border-b border-zinc-800/70 text-[10px] uppercase tracking-[0.16em] font-mono text-zinc-500">
                    Your decks
                  </div>
                  {lib.decks.length === 0 ? (
                    <div className="px-3 py-4 text-zinc-500 text-xs font-mono text-center">
                      No saved decks. Click + New.
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                      {lib.decks.map((d) => (
                        <div
                          key={d.id}
                          className="group flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 transition-colors cursor-pointer"
                          style={{
                            background: d.id === lib.activeId ? 'rgba(160,120,255,0.08)' : 'transparent',
                            borderLeft: `2px solid ${d.id === lib.activeId ? 'var(--accent)' : 'transparent'}`,
                          }}
                          onClick={() => {
                            lib.setActive(d.id);
                            setSwitcherOpen(false);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-zinc-100 text-sm truncate">{d.name || 'Untitled'}</div>
                            <div className="text-zinc-600 text-[10px] font-mono">
                              {d.cards.reduce((s, c) => s + (c.qty ?? 1), 0)} cards
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              lib.duplicateDeck(d.id);
                              setSwitcherOpen(false);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-200 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors"
                            title="Duplicate"
                          >
                            dup
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDelete(d.id);
                              setSwitcherOpen(false);
                            }}
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors flex items-center justify-center"
                            title="Delete"
                          >
                            <svg width="9" height="9" viewBox="0 0 10 10">
                              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => lib.createDeck('Untitled deck')}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition-colors"
              title="Create a new empty deck"
            >
              + New
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition-colors"
              title="Import a deck from a list"
            >
              ↓ Import
            </button>
            <button
              onClick={handleExport}
              disabled={!lib.active || lib.active.cards.length === 0}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-950 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent)' }}
              title="Copy deck list to clipboard"
            >
              {exportFeedback ?? '↑ Export'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6">
          {!lib.active ? (
            <div className="text-center text-zinc-500 py-20 font-mono text-sm">
              <div className="text-zinc-300 mb-3 text-base">No deck selected.</div>
              <div className="mb-5">Create one to start adding cards, or import an existing list.</div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => lib.createDeck('Untitled deck')}
                  className="px-4 py-2 rounded-md text-sm font-medium text-zinc-950 transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ background: 'var(--accent)' }}
                >
                  + New deck
                </button>
                <button
                  onClick={() => setImportOpen(true)}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition-colors"
                >
                  ↓ Import from list
                </button>
              </div>
            </div>
          ) : null}
          {lib.active && deck.length === 0 && (
            <div className="text-center text-zinc-500 py-20 font-mono text-sm">
              <div className="text-zinc-300 mb-2">"{lib.active.name}" is empty.</div>
              <div>Add cards via the Wizard, or paste a list in Bulk paste.</div>
            </div>
          )}
          {Object.entries(grouped).map(
            ([label, cards]) =>
              cards.length > 0 && (
                <section key={label} className="mb-8">
                  <div className="flex items-baseline gap-3 mb-4">
                    <h3 className="text-zinc-300 text-sm font-medium uppercase tracking-wider">{label}</h3>
                    <div className="text-zinc-600 text-xs font-mono">
                      {cards.reduce((s, c) => s + (c.qty || 1), 0)} cards
                    </div>
                    <div className="flex-1 h-px bg-zinc-800/80" />
                  </div>
                  <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(156px, 1fr))' }}
                  >
                    {cards.map((c) => (
                      <div key={c.id} className="flex justify-center">
                        <CardToken
                          card={c}
                          qty={c.qty}
                          size="md"
                          onRemove={() => removeCard(c.id)}
                          onClick={() => setZoomCard(c)}
                          onZoom={() => setZoomCard(c)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ),
          )}
          {deck.length > 0 && filtered.length === 0 && (
            <div className="text-center text-zinc-600 py-20 font-mono text-sm">No cards match.</div>
          )}
        </div>
      </main>

      <CardDetailModal card={zoomCard} onClose={() => setZoomCard(null)} />

      {importOpen && (
        <ImportDeckModal
          lockedSet={lockedSet}
          onClose={() => setImportOpen(false)}
          onCreate={(name, cards) => {
            const id = lib.createDeck(name, mergeDeckCards([], cards));
            lib.setActive(id);
            setImportOpen(false);
          }}
        />
      )}
      {pendingDelete && (
        <DeleteConfirmModal
          deckName={lib.decks.find((d) => d.id === pendingDelete)?.name ?? 'this deck'}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  target,
  accent,
}: {
  label: string;
  value: number;
  target?: number;
  accent?: boolean;
}) {
  const pct = target ? Math.min(100, (value / target) * 100) : 100;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-zinc-200">
          {value}
          {target ? `/${target}` : ''}
        </span>
      </div>
      <div className="mt-1.5 h-1 bg-zinc-900 rounded-full overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, background: accent ? 'var(--accent)' : '#3f3f46' }}
        />
      </div>
    </div>
  );
}

interface ImportDeckModalProps {
  lockedSet: string;
  onClose: () => void;
  onCreate: (name: string, cards: import('../types').Card[]) => void;
}

function ImportDeckModal({ lockedSet, onClose, onCreate }: ImportDeckModalProps) {
  const [name, setName] = React.useState('Imported deck');
  const [text, setText] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<string | null>(null);

  const handleImport = async () => {
    setError(null);
    setSummary(null);
    const parsed = parseDeckList(text);
    const lines = parsed.mainboard;
    if (lines.length === 0) {
      setError('No cards detected. Paste lines like "4 Lightning Bolt".');
      return;
    }
    setPending(true);
    try {
      const requests: CollectionRequest[] = lines.map((l) => {
        if (l.set && l.collectorNumber) {
          return { qty: l.qty, set: l.set, collector_number: l.collectorNumber };
        }
        if (l.name) return { qty: l.qty, name: l.name };
        return { qty: l.qty, name: '' };
      });
      const { found, notFound } = await fetchCollection(requests);
      const withQty = found.map((c) => {
        if (c.qty && c.qty > 1) return c;
        const match = requests.find(
          (r) =>
            ('name' in r && r.name && r.name.toLowerCase() === c.name.toLowerCase()) ||
            ('set' in r &&
              'collector_number' in r &&
              r.set === c.set &&
              r.collector_number === c.collectorNumber),
        );
        return match?.qty ? { ...c, qty: match.qty } : c;
      });
      if (withQty.length === 0) {
        setError(`Couldn't resolve any cards. ${notFound.length} not found.`);
        setPending(false);
        return;
      }
      onCreate(name.trim() || 'Imported deck', withQty);
      if (notFound.length > 0) {
        setSummary(`Imported ${withQty.length}, ${notFound.length} not found.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setPending(false);
    }
  };

  const lineCount = text.split('\n').filter((l) => l.trim().length > 0).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-[560px] max-h-[80vh] rounded-xl overflow-hidden flex flex-col"
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
            ↓
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Import deck</div>
            <div className="text-zinc-100 text-sm font-medium">Paste a standard deck list</div>
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

        <div className="px-6 py-4 flex flex-col gap-3 overflow-y-auto">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">
              Deck name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 text-base focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">
              List
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'4 Brainstorm\n4 Counterspell\n4 Lightning Bolt (LEA) 161\n2 MH2 186'}
              rows={12}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-200 font-mono text-xs focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            />
            <div className="text-[11px] text-zinc-600 font-mono mt-1">
              Supports Arena, MTGO, and plain list formats. Sideboard sections are ignored for now.
              {lockedSet ? ` (Set lock "${lockedSet.toUpperCase()}" applies to bare collector numbers.)` : ''}
            </div>
          </div>
          {error && (
            <div
              className="px-3 py-2 rounded font-mono text-xs"
              style={{
                background: 'rgba(248,113,113,0.14)',
                color: '#f87171',
                border: '1px solid rgba(248,113,113,0.35)',
              }}
            >
              {error}
            </div>
          )}
          {summary && (
            <div
              className="px-3 py-2 rounded font-mono text-xs text-zinc-300"
              style={{ background: 'rgba(160,120,255,0.10)' }}
            >
              {summary}
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
            onClick={handleImport}
            disabled={pending || lineCount === 0}
            className="px-4 py-2 rounded-md text-sm font-medium text-zinc-950 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)' }}
          >
            {pending ? 'Fetching…' : `Import ${lineCount} line${lineCount === 1 ? '' : 's'} →`}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  deckName,
  onCancel,
  onConfirm,
}: {
  deckName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        className="w-[420px] rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1c1c20, #131316)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
          animation: 'popupIn 280ms cubic-bezier(.2,.9,.3,1.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-800/80">
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Delete deck</div>
          <div className="text-zinc-100 text-sm font-medium mt-0.5">Delete "{deckName}"?</div>
        </div>
        <div className="px-6 py-4 text-zinc-300 text-sm">
          This can't be undone. The cards in this deck will be removed from your library.
        </div>
        <div className="px-6 py-4 border-t border-zinc-800/80 flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-md bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-md text-sm font-medium transition-colors"
            style={{ background: 'rgba(248,113,113,0.85)', color: '#18181b' }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
