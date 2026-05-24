// Sandbox Battlefield view

function LifeCounter({ value, onChange, label, side }) {
  const isAI = side === 'ai';
  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={() => onChange(value - 1)}
        className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all font-mono text-lg flex items-center justify-center active:scale-95"
      >−</button>
      <div className="flex flex-col items-center min-w-[80px]">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono leading-none">{label}</div>
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
      >+</button>
    </div>
  );
}

function Avatar({ name, side, active }) {
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
          boxShadow: active ? '0 0 0 2px var(--accent), 0 0 20px var(--accent-glow)' : '0 0 0 1px rgba(255,255,255,0.06)',
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

function PhaseIndicator({ phase, turn, onNext }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {PHASES.map(p => (
          <div
            key={p}
            className="px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-wider transition-all"
            style={{
              background: p === phase ? 'var(--accent)' : 'transparent',
              color: p === phase ? '#18181b' : '#52525b',
              fontWeight: p === phase ? 700 : 500,
            }}
          >
            {p}
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        className="ml-1 px-4 py-2 rounded-md bg-zinc-900 border border-zinc-800 hover:border-[var(--accent)] hover:bg-zinc-800 text-zinc-200 text-sm font-medium transition-all flex items-center gap-2 active:scale-[0.98]"
      >
        Next phase
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 6h6m0 0L6 3m3 3L6 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="text-zinc-500 text-xs font-mono ml-1">turn <span className="text-zinc-300">{turn}</span></div>
    </div>
  );
}

function ActionLog({ entries }) {
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

// Color hues for combat pairings (1, 2, 3 attackers each get a distinct hue)
const PAIRING_HUES = [280, 200, 35, 145, 320, 100];
function pairingColor(idx) { return `oklch(0.78 0.16 ${PAIRING_HUES[idx % PAIRING_HUES.length]})`; }

function PairBadge({ pairIdx, role, color }) {
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

function AttackBadge({ damage }) {
  return (
    <div
      className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded font-mono text-[10px] font-bold flex items-center gap-1 whitespace-nowrap"
      style={{
        background: 'var(--accent)',
        color: '#18181b',
        boxShadow: '0 2px 8px var(--accent-glow), 0 0 0 1.5px rgba(0,0,0,0.4)',
        zIndex: 4,
      }}
    >
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
        <path d="M5 1v8M5 1L2 4M5 1l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {damage}
    </div>
  );
}

function Zone({
  label, cards, onCardClick, density, side, accent,
  attackerIds = [], blockerMap = {}, combatStep = null, pickingBlockerFor = null,
}) {
  const cardSize = density === 'compact' ? 'xs' : 'sm';
  const lands = cards.filter(c => /Land/i.test(c.type));
  const nonlands = cards.filter(c => !/Land/i.test(c.type));

  // Pairing index map: attackerId -> idx
  const attackerOrder = attackerIds;
  const pairIdxFor = (cardId) => {
    if (side === 'human') return attackerOrder.indexOf(cardId);
    // AI side — find which attacker this card is blocking
    const entry = Object.entries(blockerMap).find(([att, blk]) => blk === cardId);
    return entry ? attackerOrder.indexOf(entry[0]) : -1;
  };

  const showLabel = (
    combatStep === 'declare' && side === 'human' ? 'select attackers' :
    combatStep === 'blockers' && side === 'human' ? (pickingBlockerFor ? 'pick a blocker →' : 'click attacker') :
    combatStep === 'blockers' && side === 'ai' ? (pickingBlockerFor ? '← assign blocker' : 'AI creatures available') :
    null
  );

  const renderCreature = (c) => {
    const isAttacker = side === 'human' && attackerIds.includes(c.id);
    const isBlocker = side === 'ai' && Object.values(blockerMap).includes(c.id);
    const isPicking = side === 'human' && pickingBlockerFor === c.id;
    const canInteract = (
      (combatStep === 'declare' && side === 'human' && /Creature/i.test(c.type)) ||
      (combatStep === 'blockers' && side === 'human' && isAttacker) ||
      (combatStep === 'blockers' && side === 'ai' && /Creature/i.test(c.type) && !c.tapped)
    );
    const pIdx = pairIdxFor(c.id);
    const pColor = pIdx >= 0 ? pairingColor(pIdx) : null;
    const lifted = isAttacker || isBlocker || isPicking;

    let hint = null;
    if (combatStep === 'declare' && side === 'human' && /Creature/i.test(c.type) && !isAttacker) hint = 'click to attack';
    if (combatStep === 'blockers' && side === 'human' && isAttacker && !pickingBlockerFor) hint = 'assign blocker';
    if (combatStep === 'blockers' && side === 'ai' && pickingBlockerFor && !c.tapped && /Creature/i.test(c.type) && !isBlocker) hint = 'click to block';

    return (
      <div
        key={c.id}
        className="relative"
        style={{
          filter: lifted ? `drop-shadow(0 0 14px ${pColor || 'var(--accent-glow)'})` : 'none',
          transition: 'filter 200ms, transform 200ms',
          transform: lifted ? 'translateY(-6px)' : 'none',
        }}
      >
        <div
          style={{
            position: 'absolute', inset: -4, borderRadius: 14, pointerEvents: 'none',
            boxShadow: (isAttacker || isBlocker)
              ? `0 0 0 2px ${pColor}, inset 0 0 0 2px rgba(255,255,255,0.06)`
              : isPicking ? '0 0 0 2px var(--accent), inset 0 0 0 2px rgba(255,255,255,0.06)' : 'none',
            opacity: (isAttacker || isBlocker || isPicking) ? 1 : 0,
            transition: 'opacity 200ms',
          }}
        />
        {pIdx >= 0 && pColor && (
          <PairBadge pairIdx={pIdx} color={pColor} role={side === 'human' ? 'attacker' : 'blocker'} />
        )}
        <CardToken
          card={c}
          size={cardSize}
          tapped={c.tapped || isAttacker}
          hideRemove
          onClick={canInteract ? () => onCardClick(c.id) : undefined}
        />
        {canInteract && !isAttacker && !isBlocker && !isPicking && hint && (
          <div
            className="absolute inset-0 rounded-[10px] pointer-events-none flex items-end justify-center pb-2 opacity-0 hover:opacity-100"
            style={{
              background: 'linear-gradient(180deg, transparent 50%, rgba(160,120,255,0.18))',
              transition: 'opacity 200ms',
            }}
          >
            <div className="px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider" style={{ background: 'var(--accent)', color: '#18181b' }}>
              {hint}
            </div>
          </div>
        )}
      </div>
    );
  };

  const combatHighlight = (
    (combatStep === 'declare' && side === 'human') ||
    (combatStep === 'blockers' && side === 'ai')
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">{label}</div>
        <div className="text-[10px] text-zinc-600 font-mono">{cards.length}</div>
        {showLabel && (
          <div className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: '#18181b' }}>
            {showLabel}
          </div>
        )}
        <div className="flex-1 h-px bg-zinc-800/60" />
      </div>
      <div
        className="flex-1 rounded-lg flex flex-col gap-3 p-3 min-h-0 overflow-hidden"
        style={{
          background: accent || 'rgba(24,24,27,0.4)',
          border: combatHighlight ? '1px solid var(--accent-glow)' : '1px solid rgba(255,255,255,0.04)',
          transition: 'border-color 200ms',
        }}
      >
        {nonlands.length > 0 && (
          <div className="flex gap-3 flex-wrap items-start pt-1">
            {nonlands.map(renderCreature)}
          </div>
        )}
        {lands.length > 0 && (
          <div className="flex gap-2 flex-wrap items-start mt-auto">
            {lands.map(c => (
              <CardToken key={c.id} card={c} size="xs" tapped={c.tapped} hideRemove onClick={() => onCardClick(c.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CombatBar({ step, attackers, blockerMap, aiBoard, onContinueToBlockers, onResolve, onClear, onSkipBlockers, onAutoBlock }) {
  const totalDamage = attackers.reduce((s, c) => s + (c.pt ? parseInt(c.pt.split('/')[0]) || 0 : 0), 0);
  const blockedCount = attackers.filter(a => blockerMap[a.id]).length;
  const unblockedDmg = attackers
    .filter(a => !blockerMap[a.id])
    .reduce((s, c) => s + (c.pt ? parseInt(c.pt.split('/')[0]) || 0 : 0), 0);

  return (
    <div
      className="rounded-lg mt-3 overflow-hidden"
      style={{
        background: 'linear-gradient(90deg, rgba(160,120,255,0.12), rgba(160,120,255,0.04))',
        border: '1px solid var(--accent-glow)',
        animation: 'fadeIn 240ms ease-out',
      }}
    >
      {/* Stats row */}
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
              {attackers.length === 0 ? 'No attackers' : `${attackers.length} attacker${attackers.length > 1 ? 's' : ''}`}
            </div>
            {attackers.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-xs shrink-0">
                  <span className="text-zinc-500 font-mono uppercase tracking-wider text-[10px]">dealing</span>
                  <span className="font-mono font-bold text-base" style={{ color: 'var(--accent)' }}>{totalDamage}</span>
                  <span className="text-zinc-500 font-mono">damage</span>
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                  {attackers.map(a => (
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
              {blockedCount}/{attackers.length} blocked
            </div>
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <span className="text-zinc-500 font-mono uppercase tracking-wider text-[10px]">unblocked</span>
              <span className="font-mono font-bold text-base" style={{ color: unblockedDmg > 0 ? '#f87171' : '#52525b' }}>{unblockedDmg}</span>
              <span className="text-zinc-500 font-mono">→ AI life</span>
            </div>
          </>
        )}
      </div>

      {/* Actions row — always its own row so buttons never get clipped */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t" style={{ borderColor: 'rgba(160,120,255,0.18)', background: 'rgba(0,0,0,0.2)' }}>
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
                background: attackers.length === 0 ? '#27272a' : 'var(--accent)',
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
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="6" cy="2" r="0.8" fill="currentColor"/>
              </svg>
              Auto-block (AI)
            </button>
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
              style={{ background: 'var(--accent)', color: '#18181b' }}
            >
              Resolve combat
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M3 6h6m0 0L6 3m3 3L6 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StepDot({ active, done, label }) {
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

function HandZone({ cards, onCardClick, label, side }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">{label}</div>
        <div className="text-[10px] text-zinc-600 font-mono">{cards.length}</div>
      </div>
      <div
        className="rounded-lg p-3"
        style={{
          background: 'rgba(248,113,113,0.04)',
          border: '1px solid rgba(248,113,113,0.1)',
        }}
      >
        <div className="flex gap-2">
          {cards.map(c => (
            <CardToken key={c.id} card={c} size="xs" hideRemove onClick={() => onCardClick(c.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MicButton({ recording, onMouseDown, onMouseUp }) {
  return (
    <div className="relative">
      {recording && (
        <>
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'var(--accent)',
              animation: 'micPulse 1.4s ease-out infinite',
            }}
          />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'var(--accent)',
              animation: 'micPulse 1.4s ease-out infinite 0.4s',
            }}
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
          <rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor"/>
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.2em] font-mono whitespace-nowrap text-zinc-500">
        {recording ? <span style={{ color: 'var(--accent)' }}>listening…</span> : 'hold to speak'}
      </div>
    </div>
  );
}

function AIDecisionPopup({ proposal, onApprove, onReject }) {
  if (!proposal) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div
        className="w-[480px] rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1c1c20, #131316)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), 0 0 80px rgba(160,120,255,0.15)',
          animation: 'popupIn 280ms cubic-bezier(.2,.9,.3,1.2)',
        }}
      >
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md flex items-center justify-center font-mono text-xs font-bold" style={{ background: 'var(--accent)', color: '#18181b' }}>AI</div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Proposed move</div>
            <div className="text-zinc-100 text-sm font-medium">{proposal.title}</div>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">confidence <span className="text-zinc-200">{proposal.confidence.toFixed(2)}</span></div>
        </div>

        <div className="px-6 py-5">
          <div className="text-zinc-200 text-base leading-relaxed mb-4">
            {proposal.summary}
          </div>
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

function ReasonRow({ label, detail }) {
  return (
    <div className="flex items-baseline gap-3 text-xs">
      <div className="font-mono uppercase tracking-wider text-zinc-500 w-16 shrink-0">{label}</div>
      <div className="text-zinc-300">{detail}</div>
    </div>
  );
}

function Battlefield() {
  const [aiLife, setAiLife] = React.useState(20);
  const [humanLife, setHumanLife] = React.useState(20);
  const [phase, setPhase] = React.useState('Main 1');
  const [turn, setTurn] = React.useState(3);
  const [activeSide, setActiveSide] = React.useState('human');
  const [aiBoard, setAiBoard] = React.useState(AI_BATTLEFIELD);
  const [humanBoard, setHumanBoard] = React.useState(HUMAN_BATTLEFIELD);
  const [aiHand] = React.useState(AI_HAND);
  const [recording, setRecording] = React.useState(false);
  const [popup, setPopup] = React.useState(false);
  const [density, setDensity] = React.useState('normal');
  const [attackers, setAttackers] = React.useState([]); // array of card ids
  const [combatStep, setCombatStep] = React.useState(null); // 'declare' | 'blockers' | null
  const [blockerMap, setBlockerMap] = React.useState({}); // attackerId -> aiCardId
  const [pickingBlockerFor, setPickingBlockerFor] = React.useState(null); // attackerId

  // AI persona state
  const [aiNarration, setAiNarration] = React.useState("Your move. Let's see what you've got.");
  const [aiSpeaking, setAiSpeaking] = React.useState(false);
  const [aiTaking, setAiTaking] = React.useState(false);

  // Hint coach
  const [hintVisible, setHintVisible] = React.useState(() => {
    try { return localStorage.getItem('mtg.hintHidden') !== '1'; } catch { return true; }
  });
  const dismissHint = () => {
    setHintVisible(false);
    try { localStorage.setItem('mtg.hintHidden', '1'); } catch {}
  };
  const showHint = () => {
    setHintVisible(true);
    try { localStorage.setItem('mtg.hintHidden', '0'); } catch {}
  };

  // Zone counters for the human side (Library, Graveyard, Exile, Hand)
  const [humanGraveyard, setHumanGraveyard] = React.useState(2);
  const [humanExile, setHumanExile] = React.useState(0);
  const [humanHandCount, setHumanHandCount] = React.useState(4);
  const [humanLibrary, setHumanLibrary] = React.useState(52);
  const [lastPlayed, setLastPlayed] = React.useState(null);

  const playCardToZone = (card, zone) => {
    if (zone === 'battlefield') {
      const isLand = /Land/i.test(card.type);
      setHumanBoard(prev => [...prev, { ...card, tapped: false }]);
      setLog(l => [{ who: 'human', text: `Played ${card.name} (${isLand ? 'land' : 'spell'})` }, ...l].slice(0, 12));
      if (!isLand) speak(`${card.name}? Let me see…`, 1400);
    } else if (zone === 'graveyard') {
      setHumanGraveyard(g => g + 1);
      setLog(l => [{ who: 'human', text: `${card.name} → graveyard` }, ...l].slice(0, 12));
    } else if (zone === 'exile') {
      setHumanExile(e => e + 1);
      setLog(l => [{ who: 'human', text: `${card.name} → exile` }, ...l].slice(0, 12));
    } else if (zone === 'hand') {
      setHumanHandCount(h => h + 1);
      setLog(l => [{ who: 'human', text: `${card.name} → hand` }, ...l].slice(0, 12));
    }
    setLastPlayed({ key: Date.now(), text: `+ ${card.name} → ${zone}` });
  };

  const drawCard = () => {
    if (humanLibrary <= 0) {
      speak('Empty library. You lose on your next draw.', 2200);
      return;
    }
    setHumanLibrary(l => l - 1);
    setHumanHandCount(h => h + 1);
    setLog(l => [{ who: 'human', text: 'Drew a card' }, ...l].slice(0, 12));
    setLastPlayed({ key: Date.now(), text: 'Drew a card' });
  };

  const mulligan = () => {
    setHumanLibrary(l => l + humanHandCount);
    setHumanHandCount(0);
    setTimeout(() => setHumanHandCount(7), 200);
    setLog(l => [{ who: 'human', text: 'Mulligan — shuffled hand back' }, ...l].slice(0, 12));
    setLastPlayed({ key: Date.now(), text: 'Mulligan' });
  };

  // Enter/exit combat steps
  React.useEffect(() => {
    if (phase === 'Combat' && activeSide === 'human') {
      setCombatStep('declare');
    } else {
      setCombatStep(null);
      setAttackers([]);
      setBlockerMap({});
      setPickingBlockerFor(null);
    }
  }, [phase, activeSide]);

  // Helper: AI speaks a line (with typing animation)
  const aiSpeakTimer = React.useRef(null);
  const speak = React.useCallback((text, duration = 1100) => {
    setAiSpeaking(true);
    setAiNarration(text);
    if (aiSpeakTimer.current) clearTimeout(aiSpeakTimer.current);
    aiSpeakTimer.current = setTimeout(() => setAiSpeaking(false), duration);
  }, []);

  // ---- Derived persona state ----
  const aiCreatureCount = aiBoard.filter(c => /Creature/i.test(c.type)).length;
  const aiPower = aiBoard
    .filter(c => /Creature/i.test(c.type) && !c.tapped)
    .reduce((s, c) => s + (c.pt ? parseInt(c.pt.split('/')[0]) || 0 : 0), 0);

  const aiMood = React.useMemo(() => {
    if (aiTaking) return 'thinking';
    if (combatStep === 'blockers' && attackers.length > 0) return 'worried';
    if (aiLife <= 6) return 'worried';
    if (humanLife <= 5 && aiPower >= humanLife) return 'smug';
    if (humanLife <= 10) return 'aggressive';
    if (aiCreatureCount >= 3 && aiCreatureCount > humanBoard.filter(c => /Creature/i.test(c.type)).length + 1) return 'confident';
    if (activeSide === 'ai' && !aiTaking) return 'aggressive';
    return 'neutral';
  }, [aiTaking, aiLife, humanLife, aiPower, aiCreatureCount, humanBoard, activeSide, combatStep, attackers.length]);

  const aiConfidence = React.useMemo(() => {
    // Rough heuristic: their life advantage + board pressure
    const lifeDelta = aiLife - humanLife;
    const boardDelta = aiCreatureCount - humanBoard.filter(c => /Creature/i.test(c.type)).length;
    const clockPressure = Math.max(0, 20 - humanLife) / 20;
    let raw = 0.5 + lifeDelta * 0.02 + boardDelta * 0.06 + clockPressure * 0.25;
    return Math.max(8, Math.min(96, Math.round(raw * 100)));
  }, [aiLife, humanLife, aiCreatureCount, humanBoard]);

  const aiIntent = React.useMemo(() => {
    if (aiTaking) return 'Calculating optimal line of play…';
    if (combatStep === 'declare') return 'Bracing for incoming attack.';
    if (combatStep === 'blockers') {
      const unblocked = attackers.filter(a => !blockerMap[a]).length;
      return `${unblocked} unblocked attacker${unblocked === 1 ? '' : 's'} — calculating trades.`;
    }
    if (humanLife <= 5) return 'Lethal damage available next combat.';
    if (humanLife <= 10) return 'Race to zero. Burn over blocks.';
    if (aiLife <= 6) return 'Conserve resources. Threaten lethal blockers.';
    return 'Apply pressure. Force a counter.';
  }, [aiTaking, combatStep, attackers, blockerMap, humanLife, aiLife]);

  // Narration triggers on phase / combat events
  React.useEffect(() => {
    if (phase === 'Combat' && activeSide === 'human') {
      speak("I see what you're doing. Bring them.");
    }
  }, [phase, activeSide, speak]);

  React.useEffect(() => {
    if (combatStep === 'blockers') {
      const unblockedPower = attackers
        .map(id => humanBoard.find(c => c.id === id))
        .filter(Boolean)
        .filter(c => !blockerMap[c.id])
        .reduce((s, c) => s + (parseInt(c.pt) || 0), 0);
      if (unblockedPower >= aiLife) {
        speak("That's… potentially lethal. I need to find blocks.", 1600);
      } else if (Object.keys(blockerMap).length === 0) {
        speak("How am I supposed to block all of that?", 1400);
      }
    }
  }, [combatStep, attackers, blockerMap, aiLife, humanBoard, speak]);

  // Take AI turn (animated thinking → opens decision popup)
  // Build a context-aware proposal based on current game state
  const buildAIProposal = () => {
    const aiCreatures = aiBoard.filter(c => /Creature/i.test(c.type) && !c.tapped);
    const aiPower = aiCreatures.reduce((s, c) => s + (parseInt(c.pt) || 0), 0);
    const humanCreatures = humanBoard.filter(c => /Creature/i.test(c.type));

    // Pick the most relevant action based on context
    if (humanLife <= aiPower && aiPower > 0) {
      return {
        title: 'Combat — All-in for lethal',
        summary: `Attack with all ${aiCreatures.length} creatures for ${aiPower} damage.`,
        creatures: aiCreatures.map(c => c.name),
        damage: aiPower,
        confidence: 0.92,
        reasons: [
          { label: 'Lethal', detail: `${aiPower} damage ≥ your ${humanLife} life` },
          { label: 'Risk', detail: 'Trades off creatures but wins the game' },
          { label: 'Counters', detail: 'No removable threats from your hand' },
        ],
      };
    }
    if (aiCreatures.length > 0) {
      const aggro = aiCreatures.slice(0, Math.max(1, aiCreatures.length - 1));
      const aggrPower = aggro.reduce((s, c) => s + (parseInt(c.pt) || 0), 0);
      return {
        title: 'Combat — Pressure attack',
        summary: `Attack with ${aggro.map(c => c.name).join(' & ')} for ${aggrPower} damage. Hold back ${aiCreatures.length - aggro.length} for defense.`,
        creatures: aggro.map(c => c.name),
        damage: aggrPower,
        confidence: 0.78,
        reasons: [
          { label: 'Pressure', detail: `Drops you to ${humanLife - aggrPower} life` },
          { label: 'Threats', detail: humanCreatures.length > 0 ? `${humanCreatures.length} blocker(s) on your side` : 'No defenders' },
          { label: 'Reserve', detail: 'One creature held for crackback' },
        ],
      };
    }
    return {
      title: 'Main phase — Develop board',
      summary: 'Play Mountain and cast Eidolon of the Great Revel.',
      creatures: ['Eidolon of the Great Revel'],
      damage: 0,
      confidence: 0.71,
      reasons: [
        { label: 'Tempo', detail: 'Adds a 2/2 that pings you for casting' },
        { label: 'Pressure', detail: 'Future turns deal ~4 damage minimum' },
        { label: 'Risk', detail: 'Vulnerable to your counterspells' },
      ],
    };
  };
  const [aiProposal, setAiProposal] = React.useState(null);

  const takeAITurn = () => {
    if (activeSide !== 'ai') {
      // Coaching mode: just narrate, no popup
      speak("It's your turn. Make a move and I'll respond.", 1600);
      return;
    }
    setAiTaking(true);
    speak('Let me think about this…', 1400);
    setTimeout(() => {
      setAiTaking(false);
      const proposal = buildAIProposal();
      setAiProposal(proposal);
      speak(`I'll ${proposal.title.toLowerCase().includes('lethal') ? 'go for the win' : proposal.title.toLowerCase().includes('pressure') ? 'press the attack' : 'develop my board'}.`, 1400);
      setPopup(true);
    }, 1500);
  };

  const explainAI = () => {
    if (humanLife <= 8) speak("My read: you're low. I'm racing — burn over blocks.", 3000);
    else if (humanBoard.filter(c => /Creature/i.test(c.type)).length >= 3) speak("You have a board. I need to remove threats before they swing.", 3000);
    else speak('My read: 4 mana up means likely Counterspell. I want threats that survive.', 3200);
  };
  const [log, setLog] = React.useState([
    { who: 'human', text: 'Tapped Island for U' },
    { who: 'human', text: 'Cast Brainstorm' },
    { who: 'ai', text: 'Played Mountain' },
    { who: 'ai', text: 'Drew a card' },
  ]);

  const nextPhase = () => {
    const idx = PHASES.indexOf(phase);
    if (idx === PHASES.length - 1) {
      setPhase(PHASES[0]);
      setTurn(t => t + 1);
      setActiveSide(s => s === 'human' ? 'ai' : 'human');
      setLog(l => [{ who: activeSide === 'human' ? 'ai' : 'human', text: 'Turn passed' }, ...l]);
    } else {
      setPhase(PHASES[idx + 1]);
    }
  };

  const tapCard = (side, id) => {
    const board = side === 'ai' ? aiBoard : humanBoard;
    const card = board.find(c => c.id === id);
    if (!card) return;

    // STEP 1: Declare attackers — click your own creatures to toggle attacker
    if (combatStep === 'declare' && side === 'human' && /Creature/i.test(card.type)) {
      setAttackers(prev => {
        const isAttacker = prev.includes(id);
        const next = isAttacker ? prev.filter(x => x !== id) : [...prev, id];
        setLog(l => [{ who: 'human', text: `${isAttacker ? 'Removed' : 'Declared'} ${card.name} ${isAttacker ? 'from combat' : 'as attacker'}` }, ...l].slice(0, 12));
        return next;
      });
      return;
    }

    // STEP 2: Declare blockers
    if (combatStep === 'blockers') {
      // Click your own attacker to start picking a blocker (or unselect)
      if (side === 'human' && attackers.includes(id)) {
        setPickingBlockerFor(prev => prev === id ? null : id);
        return;
      }
      // Click an AI creature
      if (side === 'ai' && /Creature/i.test(card.type)) {
        // Already a blocker? clear that assignment
        const existingAttacker = Object.entries(blockerMap).find(([, blk]) => blk === id);
        if (existingAttacker) {
          setBlockerMap(prev => {
            const next = { ...prev };
            delete next[existingAttacker[0]];
            return next;
          });
          setLog(l => [{ who: 'ai', text: `Removed ${card.name} from blocking` }, ...l].slice(0, 12));
          return;
        }
        // Assign to currently-picking attacker
        if (pickingBlockerFor && !card.tapped) {
          const attCard = humanBoard.find(c => c.id === pickingBlockerFor);
          setBlockerMap(prev => ({ ...prev, [pickingBlockerFor]: id }));
          setPickingBlockerFor(null);
          setLog(l => [{ who: 'ai', text: `${card.name} blocks ${attCard ? attCard.name : ''}` }, ...l].slice(0, 12));
          return;
        }
      }
      return;
    }

    // Default: tap/untap
    const setter = side === 'ai' ? setAiBoard : setHumanBoard;
    setter(prev => prev.map(c => c.id === id ? { ...c, tapped: !c.tapped } : c));
    setLog(l => [{ who: side, text: `${card.tapped ? 'Untapped' : 'Tapped'} ${card.name}` }, ...l].slice(0, 12));
  };

  const continueToBlockers = () => {
    setCombatStep('blockers');
    setLog(l => [{ who: 'ai', text: 'AI is declaring blockers…' }, ...l].slice(0, 12));
  };

  const autoBlock = () => {
    // Naive AI: assign each available AI creature to the highest-power attacker first
    const available = aiBoard.filter(c => /Creature/i.test(c.type) && !c.tapped);
    const sortedAttackers = [...attackers]
      .map(id => humanBoard.find(c => c.id === id))
      .filter(Boolean)
      .sort((a, b) => (parseInt(b.pt) || 0) - (parseInt(a.pt) || 0));
    const map = {};
    let i = 0;
    for (const att of sortedAttackers) {
      if (i >= available.length) break;
      map[att.id] = available[i].id;
      i++;
    }
    setBlockerMap(map);
    setPickingBlockerFor(null);
    setLog(l => [{ who: 'ai', text: `AI assigned ${Object.keys(map).length} blocker(s)` }, ...l].slice(0, 12));
  };

  const skipBlockers = () => {
    setBlockerMap({});
    setPickingBlockerFor(null);
    setLog(l => [{ who: 'ai', text: 'AI declines to block' }, ...l].slice(0, 12));
  };

  const parsePT = (pt) => {
    if (!pt) return [0, 0];
    const [p, t] = pt.split('/').map(s => parseInt(s) || 0);
    return [p, t];
  };

  const resolveCombat = () => {
    let aiDamage = 0;
    const deadAttackers = new Set();
    const deadBlockers = new Set();
    const resolveLog = [];

    for (const attId of attackers) {
      const att = humanBoard.find(c => c.id === attId);
      if (!att) continue;
      const [attP, attT] = parsePT(att.pt);
      const blkId = blockerMap[attId];
      if (!blkId) {
        aiDamage += attP;
        resolveLog.push(`${att.name} hits for ${attP}`);
      } else {
        const blk = aiBoard.find(c => c.id === blkId);
        if (!blk) continue;
        const [blkP, blkT] = parsePT(blk.pt);
        if (attP >= blkT) deadBlockers.add(blkId);
        if (blkP >= attT) deadAttackers.add(attId);
        const survived = !deadAttackers.has(attId) && !deadBlockers.has(blkId);
        const trade = deadAttackers.has(attId) && deadBlockers.has(blkId);
        resolveLog.push(`${att.name} ${trade ? 'trades with' : deadBlockers.has(blkId) ? 'kills' : deadAttackers.has(attId) ? 'dies to' : 'clashes with'} ${blk.name}`);
      }
    }

    setAiLife(l => Math.max(0, l - aiDamage));
    setHumanBoard(prev => prev
      .map(c => attackers.includes(c.id) ? { ...c, tapped: true } : c)
      .filter(c => !deadAttackers.has(c.id))
    );
    setAiBoard(prev => prev.filter(c => !deadBlockers.has(c.id)));

    setLog(l => [
      { who: 'human', text: `Combat: ${aiDamage} to AI, ${deadAttackers.size} dead, ${deadBlockers.size} AI dead` },
      ...resolveLog.slice(0, 3).reverse().map(t => ({ who: 'human', text: t })),
      ...l,
    ].slice(0, 12));

    // AI reacts to combat outcome
    if (aiDamage >= 5) speak(`Ouch. ${aiDamage} damage. I'm on the back foot.`, 2200);
    else if (aiDamage === 0 && deadAttackers.size > 0) speak("Nice trade. Tempo win for me.", 1800);
    else if (aiDamage > 0) speak(`${aiDamage} through. Acceptable.`, 1400);
    else speak("Stalemate. We continue.", 1200);

    setAttackers([]);
    setBlockerMap({});
    setPickingBlockerFor(null);
    setCombatStep(null);
    setPhase('Main 2');
  };

  const clearAttackers = () => {
    setAttackers([]);
    setLog(l => [{ who: 'human', text: 'Cleared attackers' }, ...l].slice(0, 12));
  };

  const approveAI = () => {
    const dmg = aiProposal?.damage || 4;
    setHumanLife(l => Math.max(0, l - dmg));
    setLog(l => [{ who: 'ai', text: `${aiProposal?.title || 'Move'} — approved (${dmg} damage)` }, ...l]);
    speak(dmg > 0 ? `That's ${dmg} to you. Your turn.` : 'Move resolved. Your turn.', 1800);
    setPopup(false);
    setAiProposal(null);
  };
  const rejectAI = () => {
    setLog(l => [{ who: 'human', text: 'Rejected AI proposal' }, ...l]);
    speak('Fine. I\'ll find another line.', 1600);
    setPopup(false);
    setAiProposal(null);
  };

  // Simulate recording auto-release after 2.5s for demo
  React.useEffect(() => {
    if (!recording) return;
    const t = setTimeout(() => {
      setRecording(false);
      setLog(l => [{ who: 'human', text: '“Tap two islands and counter it”' }, ...l]);
    }, 2500);
    return () => clearTimeout(t);
  }, [recording]);

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* AI half */}
      <div
        className="flex-1 min-h-0 flex flex-col px-6 pt-5 pb-3"
        style={{
          background: 'linear-gradient(180deg, rgba(248,113,113,0.05) 0%, rgba(248,113,113,0.02) 60%, rgba(0,0,0,0) 100%)',
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
            <DeckPill label="Library" value="48" />
            <DeckPill label="Graveyard" value="3" />
            <DeckPill label="Exile" value="0" />
          </div>
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex-1 min-w-0">
            <Zone
              label="AI battlefield"
              cards={aiBoard}
              onCardClick={(id) => tapCard('ai', id)}
              density={density}
              side="ai"
              accent="rgba(248,113,113,0.025)"
              attackerIds={attackers}
              blockerMap={blockerMap}
              combatStep={combatStep}
              pickingBlockerFor={pickingBlockerFor}
            />
          </div>
          <div className="w-[380px] shrink-0 flex flex-col gap-3 min-h-0">
            <AIPersona
              name="Pyro the Reckless"
              deck="Mono-Red Burn"
              mood={aiMood}
              narration={aiNarration}
              speaking={aiSpeaking}
              confidence={aiConfidence}
              intent={aiIntent}
              active={activeSide === 'ai'}
              taking={aiTaking}
              disabled={activeSide !== 'ai'}
              disabledReason={
                combatStep === 'declare'  ? 'Waiting — pick your attackers' :
                combatStep === 'blockers' ? 'Waiting — assign blockers' :
                'Waiting on your move'
              }
              onTakeTurn={takeAITurn}
              onExplain={explainAI}
            />
            <div className="min-h-0 flex-1 flex flex-col">
              <HandZone cards={aiHand} onCardClick={() => {}} label="AI Hand (open)" side="ai" />
            </div>
          </div>
        </div>
      </div>

      {/* Center divider */}
      <div
        className="shrink-0 px-6 py-3 flex items-center gap-4 border-y border-zinc-800/80"
        style={{
          background: 'linear-gradient(180deg, #0a0a0c 0%, #131316 50%, #0a0a0c 100%)',
        }}
      >
        <PhaseIndicator phase={phase} turn={turn} onNext={nextPhase} />
        <div className="flex-1 min-w-0">
          <ActionLog entries={log} />
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
          <button
            onClick={() => setDensity('normal')}
            className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-mono rounded ${density === 'normal' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}`}
          >Normal</button>
          <button
            onClick={() => setDensity('compact')}
            className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-mono rounded ${density === 'compact' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}`}
          >Compact</button>
        </div>
      </div>

      {/* Human half */}
      <div
        className="flex-1 min-h-0 flex flex-col px-6 pt-3 pb-5"
        style={{
          background: 'linear-gradient(0deg, rgba(96,165,250,0.06) 0%, rgba(96,165,250,0.02) 60%, rgba(0,0,0,0) 100%)',
        }}
      >
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <Zone
              label="Your battlefield"
              cards={humanBoard}
              onCardClick={(id) => tapCard('human', id)}
              density={density}
              side="human"
              accent="rgba(96,165,250,0.03)"
              attackerIds={attackers}
              blockerMap={blockerMap}
              combatStep={combatStep}
              pickingBlockerFor={pickingBlockerFor}
            />
            {combatStep && (
              <CombatBar
                step={combatStep}
                attackers={humanBoard.filter(c => attackers.includes(c.id))}
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

          {/* Coach column — mirrors AI persona column on top half */}
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
                  visible={true}
                  fullWidth
                  hint={deriveHint({
                    phase, combatStep, activeSide, attackers, blockerMap, pickingBlockerFor,
                    humanBoard, aiBoard, aiTaking, turn, humanLife, aiLife,
                  })}
                  onDismiss={dismissHint}
                />
              ) : (
                <div
                  className="rounded-xl h-full flex flex-col items-center justify-center text-center px-4 py-8"
                  style={{
                    background: 'rgba(24,24,27,0.3)',
                    border: '1px dashed #27272a',
                  }}
                >
                  <div className="text-zinc-600 text-xs font-mono uppercase tracking-wider mb-2">Hints hidden</div>
                  <div className="text-zinc-500 text-[11px] leading-relaxed mb-4">Tap "Show" above to bring back contextual guidance.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Play bar — log physical plays */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">log a play</div>
            <div className="text-[10px] text-zinc-600">— record a card you put in play, drew, or discarded</div>
            <div className="flex-1 h-px bg-zinc-800/60 ml-1" />
            <kbd className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800">/ to focus</kbd>
          </div>
          <PlayBar
            deck={STARTER_DECK}
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
            <DeckPill label="Hand" value={humanHandCount} />
          </div>
        </div>
      </div>

      {/* Floating mic */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
        <MicButton
          recording={recording}
          onMouseDown={() => setRecording(true)}
          onMouseUp={() => setRecording(false)}
        />
      </div>

      {popup && <AIDecisionPopup proposal={aiProposal} onApprove={approveAI} onReject={rejectAI} />}
    </div>
  );
}

function DeckPill({ label, value }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-500">{label}</div>
      <div className="font-mono text-sm text-zinc-200">{value}</div>
    </div>
  );
}

window.Battlefield = Battlefield;
