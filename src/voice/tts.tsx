// TTS provider selector. Chooses between the browser-native and OpenAI hooks
// based on (a) whether VITE_OPENAI_API_KEY is set and (b) the user's saved
// preference in localStorage.
//
// Default behavior: if an OpenAI key is present, use it; otherwise fall back to
// the browser hook. The Tweaks panel exposes a three-way override (auto / browser
// / openai) so the user can switch without restarting or editing env vars.

import * as React from 'react';
import { useTTS as useBrowserTTS } from './useTTS';
import { useOpenAITTS } from './useOpenAITTS';
import type { UseTTS } from './useTTS';

export type TTSPreference = 'auto' | 'browser' | 'openai';

export const TTS_PREF_KEY = 'mtg.ttsProvider.v1';

/* ── Preference context ──────────────────────────────────────────────── */

interface TTSPreferenceContextValue {
  preference: TTSPreference;
  setPreference: (pref: TTSPreference) => void;
  /** Resolved provider after considering env-var availability. */
  active: 'browser' | 'openai';
  /** Whether the OpenAI key is configured at build time. */
  openAiKeyConfigured: boolean;
}

const TTSPreferenceContext = React.createContext<TTSPreferenceContextValue | null>(null);

export function TTSPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = React.useState<TTSPreference>(loadTTSPreference);
  const setPreference = React.useCallback((pref: TTSPreference) => {
    setPreferenceState(pref);
    saveTTSPreference(pref);
  }, []);
  const openAiKeyConfigured = React.useMemo(() => hasOpenAIKey(), []);
  const active = resolveActiveProvider(preference);
  const value = React.useMemo(
    () => ({ preference, setPreference, active, openAiKeyConfigured }),
    [preference, setPreference, active, openAiKeyConfigured],
  );
  return <TTSPreferenceContext.Provider value={value}>{children}</TTSPreferenceContext.Provider>;
}

export function useTTSPreference(): TTSPreferenceContextValue {
  const ctx = React.useContext(TTSPreferenceContext);
  if (!ctx) throw new Error('useTTSPreference must be used inside <TTSPreferenceProvider>');
  return ctx;
}

export function loadTTSPreference(): TTSPreference {
  try {
    const raw = localStorage.getItem(TTS_PREF_KEY);
    if (raw === 'browser' || raw === 'openai' || raw === 'auto') return raw;
  } catch {
    /* ignore */
  }
  return 'auto';
}

export function saveTTSPreference(pref: TTSPreference) {
  try {
    localStorage.setItem(TTS_PREF_KEY, pref);
  } catch {
    /* ignore */
  }
}

export function hasOpenAIKey(): boolean {
  return !!(import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_OPENAI_API_KEY;
}

/**
 * Decide which provider should be active for the current preference + env.
 * - 'auto': prefer OpenAI when the key is set, otherwise browser.
 * - 'openai': always OpenAI (returns unsupported hook output if the key is missing).
 * - 'browser': always browser.
 */
export function resolveActiveProvider(pref: TTSPreference): 'browser' | 'openai' {
  if (pref === 'browser') return 'browser';
  if (pref === 'openai') return 'openai';
  return hasOpenAIKey() ? 'openai' : 'browser';
}

/**
 * Returns whichever TTS hook the preference resolves to. Both underlying hooks
 * are always mounted so React's hook-order rules stay satisfied and the user can
 * flip providers at runtime without remounting the tree.
 *
 * Reads the active provider from the TTSPreferenceProvider context so all
 * callers stay in sync — the Tweaks panel writes the preference, every other
 * consumer of `useTTS()` reads from the same source of truth.
 */
export function useTTS(): UseTTS {
  const { active } = useTTSPreference();
  const browser = useBrowserTTS();
  const openai = useOpenAITTS();
  // Cancel the inactive provider's in-flight audio when we switch, so flipping
  // mid-utterance doesn't leave two voices going at once.
  React.useEffect(() => {
    if (active === 'browser') openai.cancel();
    else browser.cancel();
    // The hook references are stable enough across renders for this; we only care about
    // running the cleanup when the active provider changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return active === 'openai' ? openai : browser;
}
