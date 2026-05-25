// Persona Manager view.
// Mirrors DeckManager's two-pane layout (sidebar list + main editor pane)
// but tailored to persona editing: name, archetype tagline, personality
// prompt (spliced into the AI brain's system prompt), and voice config
// (consumed by the TTS hook).

import * as React from 'react';
import { usePersonaLibrary, type Persona } from '../state/personaLibrary';
import { useDeckLibrary } from '../state/deckLibrary';
import { useTTS } from '../voice/useTTS';

export function PersonaManager() {
  const lib = usePersonaLibrary();
  const decks = useDeckLibrary();
  const tts = useTTS();
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  const active = lib.active;

  // Auto-select the first persona when the user lands on the view with a non-empty library
  // but no active selection (e.g. after deleting the previously-active one).
  React.useEffect(() => {
    if (!active && lib.personas.length > 0) {
      lib.setActive(lib.personas[0].id);
    }
  }, [active, lib]);

  const handleConfirmDelete = () => {
    if (pendingDelete) {
      lib.deletePersona(pendingDelete);
      setPendingDelete(null);
    }
  };

  const previewVoice = (p: Persona) => {
    if (!tts.supported) return;
    tts.speak(
      `Hello. I'm ${p.name}. I play ${p.archetypeLabel}.`,
      { voiceName: p.voice.voiceName, rate: p.voice.rate, pitch: p.voice.pitch },
    );
  };

  return (
    <div className="h-full flex bg-zinc-950">
      {/* ── Sidebar: persona list + actions ─────────────────────────────── */}
      <aside className="w-[320px] shrink-0 border-r border-zinc-800/80 flex flex-col bg-zinc-950">
        <div className="px-5 py-4 border-b border-zinc-800/80">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">AI opponents</div>
          <h2 className="text-zinc-100 text-lg font-medium mt-0.5">Personas</h2>
        </div>

        <div className="px-5 py-3 border-b border-zinc-800/80 flex gap-2">
          <button
            onClick={() => lib.createPersona('New persona')}
            className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-950 transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'var(--accent)' }}
            title="Create a new persona"
          >
            + New
          </button>
          {active && (
            <button
              onClick={() => lib.duplicatePersona(active.id)}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition-colors"
              title="Duplicate active persona"
            >
              Duplicate
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {lib.personas.length === 0 ? (
            <div className="px-5 py-8 text-center text-zinc-500 text-xs font-mono">
              No personas yet. Click <span className="text-zinc-300">+ New</span> to create one.
            </div>
          ) : (
            <ul className="py-1">
              {lib.personas.map((p) => {
                const isActive = p.id === lib.activeId;
                return (
                  <li key={p.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => lib.setActive(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          lib.setActive(p.id);
                        }
                      }}
                      className="group w-full text-left px-5 py-2.5 flex items-center gap-3 transition-colors hover:bg-zinc-900 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                      style={{
                        background: isActive ? 'rgba(160,120,255,0.08)' : 'transparent',
                        borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm truncate"
                          style={{ color: isActive ? '#fafafa' : '#d4d4d8' }}
                        >
                          {p.name || 'Untitled'}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                          {p.archetypeLabel || '—'}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(p.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors flex items-center justify-center"
                        title="Delete"
                      >
                        <svg width="9" height="9" viewBox="0 0 10 10">
                          <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-zinc-800/80 text-[11px] text-zinc-600 font-mono leading-snug">
          Personas are saved locally. Pick one in the New Game modal to set the AI's name, archetype, voice, and play style.
        </div>
      </aside>

      {/* ── Main pane: persona editor ──────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-center px-8">
            <div>
              <div className="text-zinc-300 mb-3 text-base">No persona selected.</div>
              <div className="text-zinc-500 text-sm mb-5">
                Create one to define an AI opponent — its name, deck archetype, personality, and voice.
              </div>
              <button
                onClick={() => lib.createPersona('New persona')}
                className="px-4 py-2 rounded-md text-sm font-medium text-zinc-950 transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: 'var(--accent)' }}
              >
                + New persona
              </button>
            </div>
          </div>
        ) : (
          <PersonaEditor
            persona={active}
            decks={decks.decks.map((d) => ({ id: d.id, name: d.name }))}
            onUpdate={(patch) => lib.updatePersona(active.id, patch)}
            onPreviewVoice={() => previewVoice(active)}
            onCancelPreview={() => tts.cancel()}
            ttsSupported={tts.supported}
            ttsSpeaking={tts.speaking}
            voices={tts.voices}
          />
        )}
      </main>

      {pendingDelete && (
        <DeletePersonaModal
          name={lib.personas.find((p) => p.id === pendingDelete)?.name ?? 'this persona'}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

/* ── Editor ──────────────────────────────────────────────────────────── */

interface PersonaEditorProps {
  persona: Persona;
  decks: { id: string; name: string }[];
  onUpdate: (patch: Partial<Persona>) => void;
  onPreviewVoice: () => void;
  onCancelPreview: () => void;
  ttsSupported: boolean;
  ttsSpeaking: boolean;
  voices: SpeechSynthesisVoice[];
}

function PersonaEditor({
  persona,
  decks,
  onUpdate,
  onPreviewVoice,
  onCancelPreview,
  ttsSupported,
  ttsSpeaking,
  voices,
}: PersonaEditorProps) {
  const setVoice = (patch: Partial<Persona['voice']>) =>
    onUpdate({ voice: { ...persona.voice, ...patch } });

  return (
    <>
      <div className="px-7 py-4 border-b border-zinc-800/80 flex flex-col gap-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Editing persona</div>
        <input
          value={persona.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Persona name"
          className="text-zinc-100 text-xl font-medium bg-transparent border-b border-transparent focus:border-[var(--accent)] focus:outline-none transition-colors min-w-[200px] max-w-[500px] py-0.5"
        />
        <input
          value={persona.archetypeLabel}
          onChange={(e) => onUpdate({ archetypeLabel: e.target.value })}
          placeholder="Archetype label (e.g. Mono-Red Burn)"
          className="text-zinc-400 text-sm font-mono bg-transparent border-b border-transparent focus:border-[var(--accent)] focus:outline-none transition-colors min-w-[200px] max-w-[500px] py-0.5"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">
        {/* Personality prompt */}
        <section>
          <FieldLabel>Personality prompt</FieldLabel>
          <div className="text-[11px] text-zinc-600 font-mono mb-2 leading-snug">
            Spliced into the AI brain's system prompt. Define how this opponent plays and talks.
          </div>
          <textarea
            value={persona.personalityPrompt}
            onChange={(e) => onUpdate({ personalityPrompt: e.target.value })}
            rows={12}
            placeholder={
              'e.g. You play Mono-Red Burn. Mindset: aggressive, all-in.\n' +
              'Tone of voice: brash, taunting. Mock the opponent\'s slow draws.'
            }
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2.5 text-zinc-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-[var(--accent)] transition-colors resize-y"
          />
        </section>

        {/* Voice config */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <FieldLabel>Voice</FieldLabel>
            <button
              onClick={ttsSpeaking ? onCancelPreview : onPreviewVoice}
              disabled={!ttsSupported}
              className="px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: ttsSpeaking ? 'rgba(248,113,113,0.18)' : 'rgba(160,120,255,0.14)',
                color: ttsSpeaking ? '#f87171' : 'var(--accent)',
                border: `1px solid ${ttsSpeaking ? 'rgba(248,113,113,0.35)' : 'var(--accent-glow)'}`,
              }}
              title={ttsSupported ? 'Speak a sample line' : 'Text-to-speech not supported in this browser'}
            >
              {ttsSpeaking ? '■ Stop' : '▶ Preview'}
            </button>
          </div>
          {!ttsSupported && (
            <div
              className="px-3 py-2 rounded font-mono text-[11px] mb-2"
              style={{
                background: 'rgba(248,113,113,0.10)',
                color: '#f87171',
                border: '1px solid rgba(248,113,113,0.30)',
              }}
            >
              Text-to-speech is unavailable in this browser. Voice config is saved but won't play here.
            </div>
          )}
          <div className="space-y-3">
            <div>
              <SubLabel>Voice</SubLabel>
              <select
                value={persona.voice.voiceName ?? ''}
                onChange={(e) => setVoice({ voiceName: e.target.value || undefined })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="">(default system voice)</option>
                {voices.map((v) => (
                  <option key={`${v.voiceURI}-${v.name}`} value={v.name}>
                    {v.name} {v.lang ? `— ${v.lang}` : ''}
                  </option>
                ))}
              </select>
              <div className="text-[10px] text-zinc-600 font-mono mt-1">
                Available voices depend on the user's OS / browser ({voices.length} found).
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SliderField
                label="Rate"
                value={persona.voice.rate}
                min={0.5}
                max={2}
                step={0.05}
                onChange={(rate) => setVoice({ rate })}
              />
              <SliderField
                label="Pitch"
                value={persona.voice.pitch}
                min={0}
                max={2}
                step={0.05}
                onChange={(pitch) => setVoice({ pitch })}
              />
            </div>
          </div>
        </section>

        {/* Default deck */}
        <section>
          <FieldLabel>Default deck</FieldLabel>
          <div className="text-[11px] text-zinc-600 font-mono mb-2 leading-snug">
            Pre-fills the AI deck in the New Game modal when this persona is picked. Optional.
          </div>
          <select
            value={persona.defaultDeckId ?? ''}
            onChange={(e) => onUpdate({ defaultDeckId: e.target.value || undefined })}
            className="w-full max-w-[400px] bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-2 text-zinc-100 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          >
            <option value="">(none — pick at game start)</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name || 'Untitled deck'}
              </option>
            ))}
          </select>
        </section>

        {/* Meta */}
        <section>
          <FieldLabel>Meta</FieldLabel>
          <div className="text-[11px] text-zinc-500 font-mono leading-relaxed">
            <div>id: <span className="text-zinc-400">{persona.id}</span></div>
            <div>created: <span className="text-zinc-400">{new Date(persona.createdAt).toLocaleString()}</span></div>
            <div>updated: <span className="text-zinc-400">{new Date(persona.updatedAt).toLocaleString()}</span></div>
          </div>
        </section>
      </div>
    </>
  );
}

/* ── Bits ────────────────────────────────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-1">
      {children}
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-zinc-600 font-mono mb-1">
      {children}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <SubLabel>{label}</SubLabel>
        <span className="text-[11px] font-mono text-zinc-300 tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      <div className="flex items-baseline justify-between text-[9px] text-zinc-600 font-mono mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function DeletePersonaModal({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
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
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">Delete persona</div>
          <div className="text-zinc-100 text-sm font-medium mt-0.5">Delete "{name}"?</div>
        </div>
        <div className="px-6 py-4 text-zinc-300 text-sm">
          This can't be undone. Any games currently using this persona will fall back to no persona until you pick another one.
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
