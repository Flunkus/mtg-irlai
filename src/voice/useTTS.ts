// Text-to-speech wrapper around the browser-native `window.speechSynthesis` API.
// Same shape and feature-detect pattern as `useSpeech.ts` (the STT counterpart).
//
// Quirks handled:
//  - getVoices() returns [] in some browsers until the 'voiceschanged' event fires.
//  - Chrome can spuriously pause long utterances; a small resume() guard keeps them flowing.
//  - Overlapping AI narration is noisy, so we cancel any in-flight utterance before
//    starting a new one rather than queuing.

import * as React from 'react';

export interface TTSOptions {
  /** Display name from speechSynthesis.getVoices(). Falls back to the browser default. */
  voiceName?: string;
  /** 0.5–2, default 1. */
  rate?: number;
  /** 0–2, default 1. */
  pitch?: number;
  /** 0–1, default 1. */
  volume?: number;
  /** Language hint, default 'en-US'. */
  lang?: string;
}

export interface UseTTS {
  /** Speak text. Cancels any in-flight utterance first. No-op when unsupported. */
  speak: (text: string, opts?: TTSOptions) => void;
  /** Stop the current utterance (if any). */
  cancel: () => void;
  /** False on browsers without window.speechSynthesis. */
  supported: boolean;
  /** True while an utterance is playing. */
  speaking: boolean;
  /** Available voices for the current platform. May be empty initially — refreshes when the browser fires 'voiceschanged'. */
  voices: SpeechSynthesisVoice[];
}

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis ?? null;
}

export function useTTS(): UseTTS {
  const synth = React.useMemo(() => getSynth(), []);
  const supported = !!synth;
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = React.useState(false);
  const currentUtteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const resumeGuardRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Lazy-load voices. Some browsers (Chrome especially) return [] until 'voiceschanged' fires.
  React.useEffect(() => {
    if (!synth) return;
    const refresh = () => {
      const list = synth.getVoices();
      if (list.length > 0) setVoices(list);
    };
    refresh();
    // Some browsers expose addEventListener on the synth; older Chrome uses onvoiceschanged.
    synth.addEventListener?.('voiceschanged', refresh);
    return () => {
      synth.removeEventListener?.('voiceschanged', refresh);
    };
  }, [synth]);

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

  return { speak, cancel, supported, speaking, voices };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
