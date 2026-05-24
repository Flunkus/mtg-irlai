// Full-size card detail overlay. Shows the real Scryfall art at a comfortable
// reading size + the full oracle text and metadata. Click backdrop or × to close.

import { CardToken, ManaCost } from './CardToken';
import type { Card } from '../types';

interface CardDetailModalProps {
  card: Card | null;
  onClose: () => void;
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  if (!card) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl overflow-hidden flex flex-col sm:flex-row max-w-[860px] w-full max-h-[92vh] relative"
        style={{
          background: 'linear-gradient(180deg, #1c1c20, #131316)',
          boxShadow:
            '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), 0 0 80px rgba(160,120,255,0.15)',
          animation: 'popupIn 280ms cubic-bezier(.2,.9,.3,1.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center justify-center z-10"
          aria-label="Close"
        >
          <svg width="11" height="11" viewBox="0 0 10 10">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        {/* Left — large card display */}
        <div className="shrink-0 bg-zinc-950/60 flex items-center justify-center p-5">
          {card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.name}
              draggable={false}
              className="rounded-lg shadow-2xl"
              style={{ width: 340, maxWidth: '100%', height: 'auto' }}
            />
          ) : (
            <CardToken card={card} size="lg" hideRemove />
          )}
        </div>

        {/* Right — metadata + oracle text */}
        <div className="flex-1 min-w-0 p-5 overflow-y-auto" style={{ minWidth: 260 }}>
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h2 className="text-zinc-50 text-xl font-medium leading-tight">{card.name}</h2>
            <ManaCost cost={card.cost} size={16} />
          </div>

          <div className="space-y-2.5">
            <MetaRow label="Type" value={card.type} />
            {card.pt && <MetaRow label="P/T" value={card.pt} mono />}
            <MetaRow label="Rarity" value={card.rarity || '—'} />
            {card.set && (
              <MetaRow
                label="Set"
                value={`${card.set.toUpperCase()}${card.collectorNumber ? ` · #${card.collectorNumber}` : ''}`}
                mono
              />
            )}
            {card.cmc != null && <MetaRow label="Mana value" value={String(card.cmc)} mono />}
          </div>

          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mb-2">
              Oracle text
            </div>
            <div
              className="rounded-md p-3 text-zinc-200 text-sm leading-relaxed whitespace-pre-line"
              style={{
                background: 'rgba(24,24,27,0.6)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {card.oracleText || <span className="text-zinc-500 italic">(no oracle text)</span>}
            </div>
          </div>

          {card.scryfallId && (
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono mb-1">
                Scryfall ID
              </div>
              <div className="font-mono text-[11px] text-zinc-500 break-all">{card.scryfallId}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono w-20 shrink-0">
        {label}
      </div>
      <div className={`text-zinc-200 text-sm ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
