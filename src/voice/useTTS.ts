// Text-to-speech wrapper around the browser-native `window.speechSynthesis` API.
// Same shape and feature-detect pattern as `useSpeech.ts` (the STT counterpart).
//
// Quirks handled:
//  - getVoices() returns [] in some browsers until the 'voiceschanged' event fires.
//  - Chrome can spuriously pause long utterances; a small resume() guard keeps them flowing.
//  - Overlapping AI narration is noisy, so we cancel any in-flight utterance before
//    starting a new one rather than queuing.

import * as React from 'react';

/**
 * Common TTS options. Every TTS implementation accepts the full shape but only
 * uses the fields that apply to its backend — the browser hook reads
 * voiceName/rate/pitch/volume/lang, the OpenAI hook reads openAiVoice/instructions.
 * Callers can pass both and the active implementation picks what it needs.
 */
export interface TTSOptions {
  /** Display name from speechSynthesis.getVoices(). Browser hook only. */
  voiceName?: string;
  /** 0.5–2, default 1. Browser hook only. */
  rate?: number;
  /** 0–2, default 1. Browser hook only. */
  pitch?: number;
  /** 0–1, default 1. Browser hook only. */
  volume?: number;
  /** Language hint, default 'en-US'. Browser hook only. */
  lang?: string;
  /** OpenAI voice id (alloy, echo, onyx, …). OpenAI hook only. */
  openAiVoice?: string;
  /** Tone steering, e.g. "speak slowly with a sardonic tone". Only used by gpt-4o-mini-tts. */
  instructions?: string;
}

/** Provider-agnostic voice descriptor used in dropdowns and previews. */
export interface TTSVoice {
  /** Stable id used as the persisted reference. For the browser, this is `SpeechSynthesisVoice.name`. */
  id: string;
  /** Human-readable label for the option. */
  label: string;
  /** Optional language tag, e.g. 'en-US'. */
  lang?: string;
}

export type TTSProvider = 'browser' | 'openai';

export interface UseTTS {
  /** Speak text. Cancels any in-flight utterance first. No-op when unsupported. */
  speak: (text: string, opts?: TTSOptions) => void;
  /** Stop the current utterance (if any). */
  cancel: () => void;
  /** False when the underlying backend is unavailable (browser without speechSynthesis, or OpenAI without an API key). */
  supported: boolean;
  /** True while an utterance is playing. */
  speaking: boolean;
  /** Available voices for the active provider. Always present even before any speak() call. */
  voices: TTSVoice[];
  /** Which backend this hook is talking to — drives provider-aware UI in PersonaManager. */
  provider: TTSProvider;
}

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis ?? null;
}

export function useTTS(): UseTTS {
  const synth = React.useMemo(() => getSynth(), []);
  const supported = !!synth;
  const [rawVoices, setRawVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = React.useState(false);
  const currentUtteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const resumeGuardRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Lazy-load voices. Some browsers (Chrome especially) return [] until 'voiceschanged' fires.
  React.useEffect(() => {
    if (!synth) return;
    const refresh = () => {
      const list = synth.getVoices();
      if (list.length > 0) setRawVoices(list);
    };
    refresh();
    // Some browsers expose addEventListener on the synth; older Chrome uses onvoiceschanged.
    synth.addEventListener?.('voiceschanged', refresh);
    return () => {
      synth.removeEventListener?.('voiceschanged', refresh);
    };
  }, [synth]);

  const voices: TTSVoice[] = React.useMemo(
    () => rawVoices.map((v) => ({ id: v.name, label: v.name, lang: v.lang })),
    [rawVoices],
  );

  // Chrome quirk: long utterances can pause themselves silently. Poll while speaking
  // and call resume() if we get paused-but-still-speaking.
  React.useEffect(() => {
    if (!synth) return;
    if (!speaking) {
      if (resumeGuardRef.current) {
        clearInterval(resumeGuardRef.current);
        resumeGuardRef.current = null;
      }
      return;
    }
    resumeGuardRef.current = setInterval(() => {
      if (synth.speaking && synth.paused) {
        try {
          synth.resume();
        } catch {
          /* ignore */
        }
      }
    }, 1000);
    return () => {
      if (resumeGuardRef.current) {
        clearInterval(resumeGuardRef.current);
        resumeGuardRef.current = null;
      }
    };
  }, [synth, speaking]);

  // Cancel any in-flight utterance when the host unmounts so we don't keep talking
  // after navigation.
  React.useEffect(() => {
    return () => {
      if (synth?.speaking) synth.cancel();
    };
  }, [synth]);

  const cancel = React.useCallback(() => {
    if (!synth) return;
    try {
      synth.cancel();
    } catch {
      /* ignore */
    }
    currentUtteranceRef.current = null;
    setSpeaking(false);
  }, [synth]);

  const speak = React.useCallback(
    (text: string, opts: TTSOptions = {}) => {
      if (!synth) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      // Don't queue — replace whatever's currently speaking.
      if (synth.speaking || synth.pending) {
        try {
          synth.cancel();
        } catch {
          /* ignore */
        }
      }

      const u = new SpeechSynthesisUtterance(trimmed);
      u.rate = clamp(opts.rate ?? 1, 0.5, 2);
      u.pitch = clamp(opts.pitch ?? 1, 0, 2);
      u.volume = clamp(opts.volume ?? 1, 0, 1);
      u.lang = opts.lang ?? 'en-US';

      if (opts.voiceName) {
        // Re-read the live voices list — `voices` state may be empty on first call.
        const live = synth.getVoices();
        const match = live.find((v) => v.name === opts.voiceName);
        if (match) u.voice = match;
      }

      u.onstart = () => setSpeaking(true);
      u.onend = () => {
        if (currentUtteranceRef.current === u) {
          currentUtteranceRef.current = null;
          setSpeaking(false);
        }
      };
      u.onerror = () => {
        if (currentUtteranceRef.current === u) {
          currentUtteranceRef.current = null;
          setSpeaking(false);
        }
      };

      currentUtteranceRef.current = u;
      try {
        synth.speak(u);
      } catch {
        currentUtteranceRef.current = null;
        setSpeaking(false);
      }
    },
    [synth],
  );

  return { speak, cancel, supported, speaking, voices, provider: 'browser' };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
