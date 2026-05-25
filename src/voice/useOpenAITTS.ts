// OpenAI text-to-speech hook. Same `UseTTS` surface as `useTTS.ts` so the two
// are interchangeable behind the selector in `tts.ts`.
//
// Uses the `gpt-4o-mini-tts` model so the active persona's personalityPrompt
// can be passed as `instructions` for tone steering — that's the whole reason
// to pay for this over the browser's free `speechSynthesis`.
//
// Quirks handled:
//  - Cancellation: aborts the in-flight fetch + pauses/revokes the current audio.
//  - No queueing: each speak() cancels the previous one to match the browser hook's behavior.
//  - Key bundling: same caveat as `VITE_ANTHROPIC_API_KEY` — fine for local
//    single-user use; do not deploy this app publicly with a real key embedded.

import * as React from 'react';
import type { TTSOptions, TTSVoice, UseTTS } from './useTTS';

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const DEFAULT_MODEL = 'gpt-4o-mini-tts';
const DEFAULT_VOICE = 'alloy';

/**
 * Voices accepted by `gpt-4o-mini-tts` (and a superset of the older tts-1 / tts-1-hd voices).
 * Hardcoded because OpenAI doesn't expose a /voices endpoint for TTS.
 */
const OPENAI_VOICES: TTSVoice[] = [
  { id: 'alloy', label: 'Alloy (neutral, versatile)', lang: 'en' },
  { id: 'ash', label: 'Ash (warm, expressive)', lang: 'en' },
  { id: 'ballad', label: 'Ballad (lyrical, soft)', lang: 'en' },
  { id: 'coral', label: 'Coral (bright, friendly)', lang: 'en' },
  { id: 'echo', label: 'Echo (calm, even)', lang: 'en' },
  { id: 'fable', label: 'Fable (animated, storyteller)', lang: 'en' },
  { id: 'onyx', label: 'Onyx (deep, commanding)', lang: 'en' },
  { id: 'nova', label: 'Nova (energetic, clear)', lang: 'en' },
  { id: 'sage', label: 'Sage (measured, thoughtful)', lang: 'en' },
  { id: 'shimmer', label: 'Shimmer (light, optimistic)', lang: 'en' },
  { id: 'verse', label: 'Verse (dynamic, melodic)', lang: 'en' },
];

function getApiKey(): string | undefined {
  // import.meta.env is statically replaced by Vite at build time.
  return (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_OPENAI_API_KEY;
}

export function useOpenAITTS(): UseTTS {
  const apiKey = React.useMemo(() => getApiKey(), []);
  const supported = !!apiKey;
  const [speaking, setSpeaking] = React.useState(false);

  // Each speak() owns an AbortController (for the fetch) and an Audio element + blob URL (for playback).
  // Cancellation needs to tear down all three so we never leave audio playing after a cancel.
  const abortRef = React.useRef<AbortController | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = React.useRef<string | null>(null);

  const teardown = React.useCallback(() => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        /* ignore */
      }
      abortRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        /* ignore */
      }
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  // Cancel anything in flight when the host unmounts.
  React.useEffect(() => {
    return () => {
      teardown();
      setSpeaking(false);
    };
  }, [teardown]);

  const cancel = React.useCallback(() => {
    teardown();
    setSpeaking(false);
  }, [teardown]);

  const speak = React.useCallback(
    (text: string, opts: TTSOptions = {}) => {
      if (!apiKey) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      // Replace whatever is currently in flight or playing — never queue.
      teardown();

      const controller = new AbortController();
      abortRef.current = controller;
      setSpeaking(true);

      const body: Record<string, unknown> = {
        model: DEFAULT_MODEL,
        voice: opts.openAiVoice || DEFAULT_VOICE,
        input: trimmed,
        response_format: 'mp3',
      };
      if (opts.instructions?.trim()) body.instructions = opts.instructions.trim();

      fetch(OPENAI_TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            // Try to surface the error from the JSON body when possible.
            let detail = `${res.status} ${res.statusText}`;
            try {
              const j = await res.json();
              detail = j?.error?.message || detail;
            } catch {
              /* response wasn't JSON */
            }
            throw new Error(`OpenAI TTS failed: ${detail}`);
          }
          return res.blob();
        })
        .then((blob) => {
          // Bail if a newer speak() already ran teardown on us.
          if (controller.signal.aborted) return;
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            if (audioRef.current === audio) {
              setSpeaking(false);
              teardown();
            }
          };
          audio.onerror = () => {
            if (audioRef.current === audio) {
              setSpeaking(false);
              teardown();
            }
          };
          audio.play().catch(() => {
            // Autoplay blocked, or user navigated away.
            if (audioRef.current === audio) {
              setSpeaking(false);
              teardown();
            }
          });
        })
        .catch((err: unknown) => {
          // AbortError just means we were superseded — stay quiet.
          if ((err as { name?: string })?.name === 'AbortError') return;
          // Surface to console so the user can see what went wrong; don't crash the UI.
          // eslint-disable-next-line no-console
          console.warn('[useOpenAITTS]', err);
          setSpeaking(false);
          teardown();
        });
    },
    [apiKey, teardown],
  );

  return {
    speak,
    cancel,
    supported,
    speaking,
    voices: OPENAI_VOICES,
    provider: 'openai',
  };
}
