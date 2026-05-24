// Floating panel that shows the live canonical game JSON.
// Toggle from the sidebar; useful for sanity-checking that every UI
// interaction round-trips through useGame().

import * as React from 'react';
import { useGame, gameToCanonicalJson } from '../state/gameStore';

export function JsonDebugPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useGame();
  if (!open) return null;
  const json = JSON.stringify(gameToCanonicalJson(state), null, 2);
  return (
    <div
      className="fixed top-4 right-4 z-40 w-[420px] max-h-[calc(100vh-32px)] rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(180deg, rgba(15,15,18,0.96), rgba(10,10,12,0.96))',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(160,120,255,0.22)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), 0 0 32px rgba(160,120,255,0.12)',
        animation: 'fadeIn 200ms ease-out',
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/80">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono" style={{ color: 'var(--accent)' }}>
          canonical game state
        </div>
        <div className="flex-1" />
        <button
          onClick={() => navigator.clipboard?.writeText(json)}
          className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 hover:text-zinc-200 px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors"
          title="Copy JSON"
        >
          copy
        </button>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-center"
          aria-label="Close"
        >
          <svg width="9" height="9" viewBox="0 0 10 10">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <pre className="px-3 py-2 text-[11px] leading-snug text-zinc-300 font-mono overflow-auto whitespace-pre">
        {json}
      </pre>
    </div>
  );
}
