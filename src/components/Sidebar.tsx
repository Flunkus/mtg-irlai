// Sidebar — vertical nav with logo, view switcher, JSON debug toggle, and tweaks gear.
// Visual styling lifted verbatim from claude-design-mockup/MTG Trainer.html.

type View = 'battlefield' | 'deck' | 'viewer';

interface SidebarProps {
  view: View;
  setView: (v: View) => void;
  onOpenTweaks: () => void;
  onToggleJson: () => void;
  jsonOpen: boolean;
}

function BattleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="11" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 11l5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function DeckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="3" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function ViewerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Sidebar({ view, setView, onOpenTweaks, onToggleJson, jsonOpen }: SidebarProps) {
  const items: { id: View; label: string; icon: () => JSX.Element; hint: string }[] = [
    { id: 'battlefield', label: 'Battlefield',  icon: BattleIcon, hint: 'Active game' },
    { id: 'deck',        label: 'Deck Manager', icon: DeckIcon,   hint: '60-card lists' },
    { id: 'viewer',      label: 'Card Viewer',  icon: ViewerIcon, hint: 'Look up any card' },
  ];
  return (
    <aside className="w-[72px] shrink-0 bg-zinc-950 border-r border-zinc-800/80 flex flex-col items-center py-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-zinc-50 mb-6"
        style={{
          background: 'linear-gradient(135deg, var(--accent), oklch(0.5 0.12 280))',
          boxShadow: '0 4px 12px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)',
          fontSize: 15,
        }}
      >
        ⌘
      </div>
      <nav className="flex flex-col gap-1.5 w-full px-2">
        {items.map((item) => {
          const Active = view === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className="group relative aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all"
              style={{
                background: Active ? 'rgba(160,120,255,0.12)' : 'transparent',
                color: Active ? 'var(--accent)' : '#71717a',
              }}
              onMouseEnter={(e) => {
                if (!Active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                if (!Active) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon />
              <div className="text-[9px] font-mono uppercase tracking-wider">{item.label.split(' ')[0]}</div>
              {Active && (
                <div
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1.5 w-full px-2">
        <button
          onClick={onToggleJson}
          className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors"
          style={{
            color: jsonOpen ? 'var(--accent)' : '#52525b',
            background: jsonOpen ? 'rgba(160,120,255,0.08)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!jsonOpen) e.currentTarget.style.color = '#a1a1aa';
          }}
          onMouseLeave={(e) => {
            if (!jsonOpen) e.currentTarget.style.color = '#52525b';
          }}
          title="Toggle canonical game JSON (debug)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M5 3.5L2.5 8L5 12.5M11 3.5L13.5 8L11 12.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[8px] font-mono uppercase tracking-wider">json</span>
        </button>
        <button
          onClick={onOpenTweaks}
          className="aspect-square rounded-lg flex items-center justify-center text-zinc-600 cursor-pointer hover:text-zinc-300 transition-colors"
          title="Tweaks"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M10 1v3M10 16v3M1 10h3M16 10h3M3.5 3.5l2 2M14.5 14.5l2 2M3.5 16.5l2-2M14.5 5.5l2-2"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}
