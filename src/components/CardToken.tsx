// Original card visualization — abstract token treatment.
// Not a recreation of WotC's card frame.
// Visual styling lifted verbatim from claude-design-mockup/card-token.jsx.

import type { Card } from '../types';
import { MANA_COLORS } from '../types';

export function parseCost(cost?: string): string[] {
  if (!cost) return [];
  const out: string[] = [];
  let i = 0;
  while (i < cost.length) {
    const ch = cost[i];
    if (/\d/.test(ch)) {
      let n = '';
      while (i < cost.length && /\d/.test(cost[i])) { n += cost[i]; i++; }
      out.push(n);
    } else {
      out.push(ch);
      i++;
    }
  }
  return out;
}

export function ManaPip({ symbol, size = 18 }: { symbol: string; size?: number }) {
  const isGeneric = /^\d+$/.test(symbol);
  const c = isGeneric ? MANA_COLORS.C : (MANA_COLORS[symbol as keyof typeof MANA_COLORS] || MANA_COLORS.C);
  return (
    <span
      className="inline-flex items-center justify-center font-mono font-bold shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: c.bg,
        color: c.fg,
        fontSize: size * 0.6,
        boxShadow: `inset 0 -1px 0 ${c.ring}, 0 1px 2px rgba(0,0,0,0.4)`,
        lineHeight: 1,
      }}
    >
      {symbol}
    </span>
  );
}

export function ManaCost({ cost, size = 18 }: { cost?: string; size?: number }) {
  const pips = parseCost(cost);
  if (!pips.length) return null;
  return (
    <span className="inline-flex gap-1 items-center">
      {pips.map((s, i) => <ManaPip key={i} symbol={s} size={size} />)}
    </span>
  );
}

type CardSize = 'xs' | 'sm' | 'md' | 'lg';

interface CardTokenProps {
  card: Card;
  onClick?: () => void;
  onRemove?: () => void;
  /** When provided, a small magnifier button appears in the art area; clicking it fires onZoom without firing onClick. */
  onZoom?: () => void;
  size?: CardSize;
  tapped?: boolean;
  hideRemove?: boolean;
  hideQty?: boolean;
  qty?: number | null;
}

export function CardToken({
  card,
  onClick,
  onRemove,
  onZoom,
  size = 'md',
  tapped = false,
  hideRemove = false,
  qty = null,
}: CardTokenProps) {
  const isLand = /Land/i.test(card.type);
  const isCreature = /Creature/i.test(card.type);
  const primary = (card.colors && card.colors[0]) || 'C';
  const cm = MANA_COLORS[primary];

  const dims = {
    xs: { w: 96,  h: 134, name: 11, type: 8,  pt: 13, padX: 6,  padY: 6  },
    sm: { w: 124, h: 174, name: 13, type: 9,  pt: 16, padX: 8,  padY: 8  },
    md: { w: 156, h: 218, name: 14, type: 10, pt: 18, padX: 10, padY: 10 },
    lg: { w: 188, h: 264, name: 16, type: 11, pt: 20, padX: 12, padY: 12 },
  }[size];

  const rarityDot = ({
    common:   '#cfcabe',
    uncommon: '#9ec5db',
    rare:     '#d4b25a',
    mythic:   '#e07b3a',
  } as const)[card.rarity || 'common'];

  return (
    <div
      className="card-token relative select-none group"
      style={{
        width: dims.w,
        height: dims.h,
        transform: tapped ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 320ms cubic-bezier(.34,.8,.4,1), box-shadow 200ms',
        transformOrigin: 'center center',
      }}
      onClick={onClick}
    >
      <div
        className="absolute inset-0 rounded-[10px] overflow-hidden cursor-pointer"
        style={{
          background: 'linear-gradient(180deg, #1b1b1f 0%, #131316 100%)',
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 14px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {/* mana color stripe */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{ height: 4, background: cm.bg, opacity: 0.85 }}
        />

        {/* header */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between"
          style={{ padding: `${dims.padY + 3}px ${dims.padX}px 0` }}
        >
          <div
            className="font-medium text-zinc-100 leading-tight truncate pr-1"
            style={{ fontSize: dims.name, maxWidth: dims.w - 60 }}
          >
            {card.name}
          </div>
          <ManaCost cost={card.cost} size={dims.name + 2} />
        </div>

        {/* art — Scryfall image when present, otherwise abstract striped block */}
        <div
          className="absolute left-2 right-2 rounded-[5px] overflow-hidden"
          style={{
            top: dims.padY + dims.name + 10,
            bottom: dims.padY + dims.type + 22,
            background: card.imageUrl
              ? '#000'
              : `repeating-linear-gradient(135deg, ${cm.bg}22 0px, ${cm.bg}22 6px, ${cm.bg}11 6px, ${cm.bg}11 12px)`,
            border: `1px solid ${cm.bg}33`,
          }}
        >
          {card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.name}
              loading="lazy"
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 22%',
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="font-mono uppercase tracking-widest opacity-30"
                style={{ fontSize: dims.type, color: cm.bg }}
              >
                {isLand ? '◇ land' : isCreature ? '◆ creature' : '◈ spell'}
              </div>
            </div>
          )}

          {/* Zoom — small magnifier, always visible at low opacity, full on hover.
              Click stops propagation so it doesn't accidentally tap/play the card. */}
          {onZoom && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onZoom();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute rounded-full bg-black/65 text-zinc-100 opacity-50 group-hover:opacity-100 hover:bg-black/85 transition-opacity flex items-center justify-center"
              style={{
                top: 4,
                right: 4,
                width: size === 'xs' ? 18 : 22,
                height: size === 'xs' ? 18 : 22,
                backdropFilter: 'blur(2px)',
                zIndex: 5,
              }}
              title="Zoom in"
              aria-label="Zoom in"
            >
              <svg
                width={size === 'xs' ? 9 : 11}
                height={size === 'xs' ? 9 : 11}
                viewBox="0 0 14 14"
                fill="none"
              >
                <circle cx="6" cy="6" r="3.8" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 9L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* type line */}
        <div
          className="absolute left-0 right-0 flex items-center justify-between"
          style={{ bottom: dims.padY + 2, padding: `0 ${dims.padX}px` }}
        >
          <div className="text-zinc-400 truncate font-mono" style={{ fontSize: dims.type }}>
            {card.type}
          </div>
          {card.pt && (
            <div
              className="font-mono font-semibold text-zinc-100 px-1.5 py-0.5 rounded"
              style={{
                fontSize: dims.pt - 4,
                background: '#0008',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
              }}
            >
              {card.pt}
            </div>
          )}
        </div>

        {/* rarity dot */}
        <div
          className="absolute"
          style={{
            top: dims.padY + 5,
            right: dims.padX + 1,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: rarityDot,
            boxShadow: `0 0 6px ${rarityDot}88`,
            display: card.rarity ? 'block' : 'none',
          }}
        />

        {/* freeform indicator */}
        {card.freeform && (
          <div
            className="absolute font-mono font-bold uppercase"
            style={{
              top: dims.padY + 2,
              right: dims.padX + 8,
              fontSize: 8,
              letterSpacing: '0.05em',
              color: 'oklch(0.78 0.13 75)',
              opacity: 0.75,
            }}
            title="Added as freeform — not matched to your deck"
          >
            ~
          </div>
        )}
      </div>

      {/* quantity badge */}
      {qty != null && (
        <div
          className="absolute -top-2 -left-2 font-mono font-bold text-zinc-100 rounded-full flex items-center justify-center"
          style={{
            width: 26,
            height: 26,
            fontSize: 13,
            background: '#0a0a0a',
            boxShadow: '0 0 0 1.5px var(--accent), 0 2px 6px rgba(0,0,0,0.5)',
            zIndex: 2,
          }}
        >
          ×{qty}
        </div>
      )}

      {/* remove button */}
      {!hideRemove && (
        <button
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-zinc-900 text-zinc-400 hover:bg-red-500/90 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          style={{ boxShadow: '0 0 0 1.5px #27272a, 0 2px 6px rgba(0,0,0,0.5)', zIndex: 3 }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove && onRemove();
          }}
          aria-label="Remove"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
