// AI Persona — the "face" of the opponent.
// Reactive mood + scripted narration + confidence display.
// Visual styling lifted verbatim from claude-design-mockup/ai-persona.jsx.

import * as React from 'react';

export type AIMood = 'neutral' | 'thinking' | 'confident' | 'aggressive' | 'worried' | 'smug';

interface MoodDef {
  color: string;
  label: string;
  eye: string;
  eyeWidth: number;
}

export const AI_MOODS: Record<AIMood, MoodDef> = {
  neutral:    { color: '#a1a1aa', label: 'Observing',   eye: 'M30,50 L42,50 M58,50 L70,50',             eyeWidth: 3 },
  thinking:   { color: '#fbbf24', label: 'Calculating', eye: 'M30,50 L42,50 M58,50 L70,50',             eyeWidth: 3 },
  confident:  { color: '#a78bfa', label: 'Confident',   eye: 'M30,53 L36,47 L42,53 M58,53 L64,47 L70,53', eyeWidth: 3 },
  aggressive: { color: '#f87171', label: 'Aggressive',  eye: 'M30,46 L42,52 M58,52 L70,46',             eyeWidth: 3 },
  worried:    { color: '#60a5fa', label: 'Cautious',    eye: 'M30,47 L36,53 L42,47 M58,47 L64,53 L70,47', eyeWidth: 3 },
  smug:       { color: '#34d399', label: 'Smug',        eye: 'M30,50 Q36,56 42,50 M58,50 Q64,56 70,50', eyeWidth: 2.5 },
};

export function AIFace({
  mood,
  speaking,
  size = 96,
}: {
  mood: AIMood;
  speaking?: boolean;
  size?: number;
}) {
  const m = AI_MOODS[mood] || AI_MOODS.neutral;
  const color = m.color;
  const [eyePath, setEyePath] = React.useState(m.eye);

  React.useEffect(() => {
    const t = setTimeout(() => setEyePath(m.eye), 30);
    return () => clearTimeout(t);
  }, [m.eye]);

  const [blink, setBlink] = React.useState(false);
  React.useEffect(() => {
    const tick = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    };
    const interval = setInterval(tick, 3200 + Math.random() * 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          position: 'absolute',
          inset: -3,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}22, transparent 70%)`,
          filter: `blur(8px)`,
          animation:
            mood === 'thinking'
              ? 'aiThinkPulse 1.6s ease-in-out infinite'
              : speaking
              ? 'aiSpeakPulse 0.8s ease-in-out infinite'
              : 'none',
          pointerEvents: 'none',
        }}
      />
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ position: 'relative', zIndex: 1 }}>
        <defs>
          <radialGradient id="aiFaceBg" cx="0.5" cy="0.4">
            <stop offset="0%"  stopColor={color} stopOpacity="0.18" />
            <stop offset="65%" stopColor={color} stopOpacity="0.04" />
            <stop offset="100%" stopColor="#0a0a0b" stopOpacity="1" />
          </radialGradient>
        </defs>

        <polygon
          points="50,4 91,27 91,73 50,96 9,73 9,27"
          fill="url(#aiFaceBg)"
          stroke={color}
          strokeWidth="1.4"
          opacity="0.85"
          style={{ transition: 'stroke 400ms' }}
        />
        {[[15, 30], [85, 30], [15, 70], [85, 70]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.2" fill={color} opacity="0.5" />
        ))}

        <path
          d={eyePath}
          stroke={color}
          strokeWidth={m.eyeWidth}
          fill="none"
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 3px ${color}99)`,
            transition: 'd 280ms ease, stroke 400ms',
            transform: blink ? 'scaleY(0.05)' : 'scaleY(1)',
            transformOrigin: '50px 50px',
            transitionProperty: 'transform, d, stroke',
            transitionDuration: '140ms, 280ms, 400ms',
          }}
        />

        {speaking ? (
          <g>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect
                key={i}
                x={32 + i * 6.4}
                y="70"
                width="3"
                height="6"
                rx="1.5"
                fill={color}
                style={{
                  transformOrigin: `${33.5 + i * 6.4}px 73px`,
                  animation: `aiSpeakBar 0.55s ease-in-out infinite ${i * 0.06}s alternate`,
                }}
              />
            ))}
          </g>
        ) : (
          <line
            x1={mood === 'smug' ? 40 : 42}
            y1={mood === 'worried' ? 75 : 73}
            x2={mood === 'smug' ? 60 : 58}
            y2={mood === 'worried' ? 75 : 73}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
            style={{ transition: 'all 300ms' }}
          />
        )}
      </svg>
    </div>
  );
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: color, boxShadow: `0 0 8px ${color}99` }}
        />
      </div>
      <span className="font-mono text-[10px] text-zinc-400 tabular-nums">{value}%</span>
    </div>
  );
}

function SpeechBubble({
  text,
  mood,
  speaking,
}: {
  text: string;
  mood: AIMood;
  speaking?: boolean;
}) {
  const color = (AI_MOODS[mood] || AI_MOODS.neutral).color;
  return (
    <div
      className="relative rounded-lg p-3"
      style={{
        background: 'rgba(10,10,12,0.7)',
        border: `1px solid ${color}33`,
        minHeight: 64,
      }}
    >
      <div
        className="absolute -top-1.5 left-7 w-3 h-3 rotate-45"
        style={{
          background: 'rgba(10,10,12,0.95)',
          borderLeft: `1px solid ${color}33`,
          borderTop: `1px solid ${color}33`,
        }}
      />
      <div className="flex items-start gap-2">
        {speaking && (
          <div className="flex items-center gap-0.5 mt-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full"
                style={{
                  background: color,
                  animation: `aiTyping 1s ease-in-out infinite ${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}
        <div className="text-[13px] leading-relaxed text-zinc-200" style={{ fontStyle: 'italic' }}>
          {text}
        </div>
      </div>
    </div>
  );
}

interface AIPersonaProps {
  name: string;
  deck: string;
  mood: AIMood;
  narration: string;
  speaking?: boolean;
  confidence: number;
  intent: string;
  active?: boolean;
  onTakeTurn?: () => void;
  onExplain?: () => void;
  taking?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  /** Label shown on the Take Turn button. Defaults to "Take turn"; pass a phase-aware string for clarity. */
  takeTurnLabel?: string;
  /** TTS mute state. When undefined the mute toggle is hidden. */
  ttsMuted?: boolean;
  /** Toggle TTS mute. Required for the toggle to render. */
  onToggleMute?: () => void;
  /** When false (TTS unsupported), the toggle becomes a passive "no audio" indicator. */
  ttsSupported?: boolean;
}

export function AIPersona({
  name,
  deck,
  mood,
  narration,
  speaking,
  confidence,
  intent,
  active,
  onTakeTurn,
  onExplain,
  taking,
  disabled,
  disabledReason,
  takeTurnLabel,
  ttsMuted,
  onToggleMute,
  ttsSupported,
}: AIPersonaProps) {
  const m = AI_MOODS[mood] || AI_MOODS.neutral;
  const isDisabled = disabled || taking;
  const showMuteToggle = onToggleMute !== undefined;
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #16161a 0%, #0d0d10 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: active
          ? `0 0 0 1px ${m.color}66, 0 8px 28px ${m.color}22`
          : '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'box-shadow 400ms',
      }}
    >
      <div className="flex gap-3 p-4 pb-3">
        <AIFace mood={mood} speaking={speaking} size={88} />
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-zinc-500 flex-1">opponent</div>
              {showMuteToggle && (
                <MuteToggle
                  muted={!!ttsMuted}
                  supported={ttsSupported !== false}
                  onToggle={onToggleMute!}
                  accent={m.color}
                />
              )}
            </div>
            <div className="text-zinc-50 text-base font-medium leading-tight mt-0.5 truncate">{name}</div>
            <div className="text-zinc-500 text-[11px] font-mono mt-0.5 truncate">{deck}</div>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: m.color }}>
                {m.label}
              </span>
              <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">conf</span>
            </div>
            <ConfidenceBar value={confidence} color={m.color} />
          </div>
        </div>
      </div>

      <div className="px-4">
        <SpeechBubble text={narration} mood={mood} speaking={speaking} />
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-1 h-1 rounded-full" style={{ background: m.color }} />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">current plan</span>
        </div>
        <div className="font-mono text-[11px] text-zinc-300 leading-snug">{intent}</div>
      </div>

      <div className="flex gap-2 p-4 pt-3">
        {isDisabled && !taking ? (
          <div
            className="flex-1 py-2 rounded-md flex items-center justify-center gap-2 cursor-default"
            style={{
              background: 'rgba(255,255,255,0.015)',
              border: '1px dashed #27272a',
            }}
            title={disabledReason}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: '#52525b', animation: 'aiTyping 1.6s ease-in-out infinite' }}
            />
            <span className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-zinc-500">
              {disabledReason || 'Waiting on you'}
            </span>
          </div>
        ) : (
          <button
            onClick={onTakeTurn}
            disabled={taking}
            className="flex-1 py-2 rounded-md text-xs font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
            style={{
              background: taking ? '#27272a' : m.color,
              color: taking ? '#71717a' : '#0a0a0b',
              cursor: taking ? 'wait' : 'pointer',
            }}
          >
            {taking ? (
              <>
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: m.color, animation: 'aiTyping 1s infinite' }}
                />
                Thinking…
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 1l6 4-6 4z" />
                </svg>
                {takeTurnLabel || 'Take turn'}
              </>
            )}
          </button>
        )}
        <button
          onClick={onExplain}
          className="px-3 py-2 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors border border-zinc-800"
          title="Show reasoning"
        >
          Explain
        </button>
      </div>
    </div>
  );
}

function MuteToggle({
  muted,
  supported,
  onToggle,
  accent,
}: {
  muted: boolean;
  supported: boolean;
  onToggle: () => void;
  accent: string;
}) {
  const title = !supported
    ? 'Text-to-speech not supported in this browser'
    : muted
    ? 'Unmute AI voice'
    : 'Mute AI voice';
  const color = !supported ? '#52525b' : muted ? '#71717a' : accent;
  return (
    <button
      onClick={onToggle}
      disabled={!supported}
      title={title}
      aria-label={title}
      aria-pressed={muted}
      className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      style={{ color }}
    >
      {muted || !supported ? (
        // Speaker with X
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 6v4h2.5L8 13V3L4.5 6H2z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <path d="M11 6l4 4M15 6l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ) : (
        // Speaker with waves
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 6v4h2.5L8 13V3L4.5 6H2z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 5.5a3 3 0 0 1 0 5M12.5 3.5a6 6 0 0 1 0 9"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )}
    </button>
  );
}
