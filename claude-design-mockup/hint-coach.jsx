// Contextual hint coach — watches game state and tells the user what to do next.

function deriveHint({ phase, combatStep, activeSide, attackers, blockerMap, pickingBlockerFor, humanBoard, aiBoard, aiTaking, turn, humanLife, aiLife }) {
  // Highest priority: AI turn
  if (activeSide === 'ai' && !aiTaking) {
    return {
      title: "It's the AI's turn",
      body: 'Click "Take turn" on the AI panel to let them play, then approve or reject the proposed move.',
      action: 'Take turn →',
      step: null,
    };
  }
  if (aiTaking) {
    return {
      title: 'AI is thinking',
      body: "Wait while the AI evaluates the board…",
      action: null,
      step: null,
    };
  }

  // Combat sub-steps
  if (combatStep === 'declare') {
    if (attackers.length === 0) {
      return {
        title: 'Declare attackers',
        body: 'Click any of your untapped creatures to send them at the AI. Each one adds its power to your damage total.',
        action: 'Pick attackers',
        step: { current: 1, total: 3, label: 'declare' },
      };
    }
    return {
      title: 'Confirm attackers',
      body: `${attackers.length} attacker${attackers.length > 1 ? 's' : ''} selected. Click "Continue to blockers →" when you're done.`,
      action: 'Continue →',
      step: { current: 1, total: 3, label: 'declare' },
    };
  }

  if (combatStep === 'blockers') {
    if (pickingBlockerFor) {
      return {
        title: 'Pick a blocker',
        body: 'Now click any untapped AI creature to make it block this attacker. Click the attacker again to cancel.',
        action: null,
        step: { current: 2, total: 3, label: 'blockers' },
      };
    }
    if (Object.keys(blockerMap).length === 0) {
      return {
        title: 'Assign blockers (or skip)',
        body: 'Click an attacker on your side, then click an AI creature to assign it as a blocker. Or click "Auto-block (AI)" to let the AI choose, or "No blocks" to send all damage through.',
        action: null,
        step: { current: 2, total: 3, label: 'blockers' },
      };
    }
    return {
      title: 'Resolve combat',
      body: 'Blockers are set. Click "Resolve combat →" to compute damage and resolve trades.',
      action: 'Resolve →',
      step: { current: 3, total: 3, label: 'resolve' },
    };
  }

  // Regular phase tips
  const aiCreatures = aiBoard.filter(c => /Creature/i.test(c.type));
  if (phase === 'Untap') {
    return {
      title: 'Untap step',
      body: "Your creatures and lands ready up. Click any tapped (sideways) card to untap it, then advance.",
      action: 'Next phase →',
      step: null,
    };
  }
  if (phase === 'Upkeep') {
    return {
      title: 'Upkeep',
      body: 'Trigger any "at the beginning of upkeep" effects. Most turns, just advance.',
      action: 'Next phase →',
      step: null,
    };
  }
  if (phase === 'Draw') {
    return {
      title: 'Draw step',
      body: 'You draw a card here. Advance to play it.',
      action: 'Next phase →',
      step: null,
    };
  }
  if (phase === 'Main 1') {
    return {
      title: 'Main phase 1',
      body: 'Played a card IRL? Type its name in the play bar below and press Enter — it appears on your battlefield. Use Tab to switch zones (graveyard, exile, hand).',
      action: 'Log a play ↓',
      step: null,
    };
  }
  if (phase === 'Combat') {
    return {
      title: 'Combat begins',
      body: 'Time to attack. Move to declare attackers if you want to swing — or skip combat by advancing again.',
      action: 'Declare attackers',
      step: null,
    };
  }
  if (phase === 'Main 2') {
    return {
      title: 'Main phase 2',
      body: 'Anything left to play? Use the play bar (or press "/" to focus it quickly). When you\'re done, advance to End.',
      action: 'Cast or advance →',
      step: null,
    };
  }
  if (phase === 'End') {
    return {
      title: 'End step',
      body: 'Discard down to 7 if you have more. Advance to pass the turn to the AI.',
      action: 'Pass turn →',
      step: null,
    };
  }

  return {
    title: "Your move",
    body: 'Play, attack, or pass. Click "Next phase →" to advance time.',
    action: null,
    step: null,
  };
}

function HintCard({ hint, onDismiss, visible, fullWidth }) {
  if (!visible) return null;
  const accent = 'oklch(0.78 0.13 75)'; // soft amber

  return (
    <div
      className="rounded-xl overflow-hidden relative h-full flex flex-col"
      style={{
        width: fullWidth ? '100%' : 320,
        background: 'linear-gradient(180deg, rgba(28,24,16,0.96) 0%, rgba(18,16,12,0.96) 100%)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${accent}33`,
        boxShadow: `0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), 0 0 32px ${accent}1a`,
        animation: 'hintIn 320ms cubic-bezier(.2,.9,.3,1.1)',
      }}
    >
      {/* glowing strip on top */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      {/* header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center relative"
          style={{ background: `${accent}22`, color: accent }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M6 1.5a3.5 3.5 0 0 0-2 6.4V9a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V7.9A3.5 3.5 0 0 0 6 1.5zM5 11h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 10px ${accent}88`, animation: 'hintPulse 2.4s ease-in-out infinite' }}
          />
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono" style={{ color: accent }}>
          coach
        </div>
        {hint.step && (
          <>
            <div className="text-zinc-700">·</div>
            <div className="flex items-center gap-1">
              {Array.from({ length: hint.step.total }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all"
                  style={{
                    width: i + 1 === hint.step.current ? 14 : 6,
                    background: i + 1 <= hint.step.current ? accent : '#3f3f46',
                    opacity: i + 1 <= hint.step.current ? 1 : 0.5,
                  }}
                />
              ))}
            </div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              {hint.step.current}/{hint.step.total}
            </div>
          </>
        )}
        <div className="flex-1" />
        <button
          onClick={onDismiss}
          className="w-5 h-5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-center"
          aria-label="Hide hint"
        >
          <svg width="9" height="9" viewBox="0 0 10 10"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* content */}
      <div key={hint.title} style={{ animation: 'hintSwap 280ms ease-out' }}>
        <div className="px-4 pb-3">
          <div className="text-zinc-50 text-sm font-medium leading-tight mb-1.5">{hint.title}</div>
          <div className="text-zinc-400 text-[12.5px] leading-relaxed">{hint.body}</div>
        </div>

        {hint.action && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <div
              className="px-2 py-1 rounded font-mono text-[10px] uppercase tracking-wider flex items-center gap-1"
              style={{ background: `${accent}1a`, color: accent, border: `1px solid ${accent}33` }}
            >
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M2 5h6m0 0L5 2m3 3L5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {hint.action}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HintToggle({ onClick }) {
  const accent = 'oklch(0.78 0.13 75)';
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all hover:scale-105 active:scale-95"
      style={{
        background: 'rgba(28,24,16,0.92)',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${accent}44`,
        color: accent,
        boxShadow: `0 4px 14px rgba(0,0,0,0.5), 0 0 16px ${accent}22`,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
        <path d="M6 1.5a3.5 3.5 0 0 0-2 6.4V9a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V7.9A3.5 3.5 0 0 0 6 1.5zM5 11h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      <span className="text-[11px] font-mono uppercase tracking-wider">Show hint</span>
    </button>
  );
}

Object.assign(window, { deriveHint, HintCard, HintToggle });
