// Deck Manager view

function DeckManager() {
  const [deck, setDeck] = React.useState(STARTER_DECK);
  const [qtyInput, setQtyInput] = React.useState('1');
  const [nameInput, setNameInput] = React.useState('');
  const [bulkText, setBulkText] = React.useState('');
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const nameRef = React.useRef(null);

  const totalCards = deck.reduce((s, c) => s + c.qty, 0);
  const lands = deck.filter(c => /Land/i.test(c.type)).reduce((s, c) => s + c.qty, 0);
  const creatures = deck.filter(c => /Creature/i.test(c.type)).reduce((s, c) => s + c.qty, 0);
  const spells = totalCards - lands - creatures;

  const addCard = (e) => {
    e && e.preventDefault();
    if (!nameInput.trim()) return;
    const qty = Math.max(1, parseInt(qtyInput) || 1);
    const newCard = {
      id: 'new-' + Date.now(),
      qty,
      name: nameInput.trim(),
      cost: '2U',
      type: 'Creature — Mock',
      pt: '2/2',
      colors: ['U'],
      rarity: 'uncommon',
    };
    setDeck([newCard, ...deck]);
    setNameInput('');
    setQtyInput('1');
    nameRef.current && nameRef.current.focus();
  };

  const removeCard = (id) => setDeck(deck.filter(c => c.id !== id));

  const adjustQty = (id, delta) => {
    setDeck(deck.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const importBulk = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const added = lines.map((line, i) => {
      const m = line.match(/^(\d+)\s*x?\s+(.+)$/i);
      const qty = m ? parseInt(m[1]) : 1;
      const name = m ? m[2] : line;
      return {
        id: 'bulk-' + Date.now() + '-' + i,
        qty,
        name,
        cost: '1U',
        type: 'Sorcery',
        pt: null,
        colors: ['U'],
        rarity: 'common',
      };
    });
    setDeck([...added, ...deck]);
    setBulkText('');
    setBulkOpen(false);
  };

  const filtered = deck.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'creatures') return /Creature/i.test(c.type);
    if (filter === 'spells') return !/Creature|Land/i.test(c.type);
    if (filter === 'lands') return /Land/i.test(c.type);
    return true;
  });

  // Group filtered cards by category for the grid
  const grouped = {
    Creatures: filtered.filter(c => /Creature/i.test(c.type)),
    Spells: filtered.filter(c => !/Creature|Land/i.test(c.type)),
    Lands: filtered.filter(c => /Land/i.test(c.type)),
  };

  return (
    <div className="h-full flex bg-zinc-950">
      {/* Left column — input */}
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
                onChange={e => setQtyInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 font-mono text-base focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-mono">Card name / ID</label>
              <input
                ref={nameRef}
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="e.g. Brainstorm"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 text-base focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-md text-sm font-medium text-zinc-950 transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'var(--accent)' }}
          >
            Add to deck →
          </button>
          <div className="text-[11px] text-zinc-500 font-mono">↵ enter to add quickly</div>
        </form>

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
                onChange={e => setBulkText(e.target.value)}
                placeholder={"4 Brainstorm\n4 Ponder\n2 Counterspell"}
                rows={8}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-200 font-mono text-xs focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
              />
              <button
                onClick={importBulk}
                className="w-full py-2 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
              >
                Import {bulkText.split('\n').filter(Boolean).length} lines
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
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

      {/* Main grid */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="px-7 py-4 border-b border-zinc-800/80 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Active deck</div>
            <h1 className="text-zinc-100 text-xl font-medium mt-0.5 flex items-baseline gap-3">
              Azure Tempo
              <span className="text-zinc-500 text-sm font-mono font-normal">{totalCards}/60</span>
            </h1>
          </div>
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
            {['all', 'creatures', 'spells', 'lands'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded transition-colors capitalize ${filter === f ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >{f}</button>
            ))}
          </div>
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-48 bg-zinc-900 border border-zinc-800 rounded-md pl-7 pr-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor"/>
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6">
          {Object.entries(grouped).map(([label, cards]) => cards.length > 0 && (
            <section key={label} className="mb-8">
              <div className="flex items-baseline gap-3 mb-4">
                <h3 className="text-zinc-300 text-sm font-medium uppercase tracking-wider">{label}</h3>
                <div className="text-zinc-600 text-xs font-mono">{cards.reduce((s, c) => s + c.qty, 0)} cards</div>
                <div className="flex-1 h-px bg-zinc-800/80" />
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(156px, 1fr))' }}>
                {cards.map(c => (
                  <div key={c.id} className="flex justify-center">
                    <CardToken
                      card={c}
                      qty={c.qty}
                      size="md"
                      onRemove={() => removeCard(c.id)}
                      onClick={() => {}}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-zinc-600 py-20 font-mono text-sm">No cards match.</div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatRow({ label, value, target, accent }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 100;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-zinc-200">{value}{target ? `/${target}` : ''}</span>
      </div>
      <div className="mt-1.5 h-1 bg-zinc-900 rounded-full overflow-hidden">
        <div
          className="h-full transition-all"
          style={{
            width: `${pct}%`,
            background: accent ? 'var(--accent)' : '#3f3f46',
          }}
        />
      </div>
    </div>
  );
}

window.DeckManager = DeckManager;
