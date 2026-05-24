// Web Speech API wrapper. Chromium-only (webkitSpeechRecognition); other
// browsers get `supported: false` and the UI should hide/disable the mic.

import * as React from 'react';

// Minimal type declarations — the Web Speech API isn't in lib.dom.d.ts.
type SREvent = { results: { 0: { transcript: string }; isFinal: boolean }[] & { length: number } };
type SRInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SRCtor = new () => SRInstance;

function getSRCtor(): SRCtor | null {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeech {
  /** True while the mic is open. */
  recording: boolean;
  /** Live transcript (interim + final). Cleared on start(). */
  transcript: string;
  /** Open the mic. */
  start: () => void;
  /** Close the mic. Triggers onFinal with the final transcript shortly after. */
  stop: () => void;
  /** False on Firefox / Safari / browsers without webkitSpeechRecognition. */
  supported: boolean;
  /** Last error, if any. Cleared on start(). */
  error: string | null;
}

interface UseSpeechOptions {
  /** Called once after stop() with the final transcript (empty string if nothing heard). */
  onFinal?: (transcript: string) => void;
  lang?: string;
}

export function useSpeech({ onFinal, lang = 'en-US' }: UseSpeechOptions = {}): UseSpeech {
  const [recording, setRecording] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const srRef = React.useRef<SRInstance | null>(null);
  const transcriptRef = React.useRef('');
  const onFinalRef = React.useRef(onFinal);
  onFinalRef.current = onFinal;

  const supported = React.useMemo(() => getSRCtor() !== null, []);

  React.useEffect(() => {
    const Ctor = getSRCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.continuous = false;
    r.interimResults = true;
    r.lang = lang;
    r.onresult = (e) => {
      let combined = '';
      for (let i = 0; i < e.results.length; i++) combined += e.results[i][0].transcript;
      transcriptRef.current = combined;
      setTranscript(combined);
    };
    r.onerror = (e) => {
      setError(e.error || 'speech recognition error');
      setRecording(false);
    };
    r.onend = () => {
      setRecording(false);
      onFinalRef.current?.(transcriptRef.current);
    };
    srRef.current = r;
    return () => {
      try {
        r.abort();
      } catch {
        /* already stopped */
      }
    };
  }, [lang]);

  const start = React.useCallback(() => {
    if (!srRef.current) return;
    transcriptRef.current = '';
    setTranscript('');
    setError(null);
    setRecording(true);
    try {
      srRef.current.start();
    } catch (e) {
      // start() throws "InvalidStateError" if called while already started.
      setRecording(false);
      setError(e instanceof Error ? e.message : 'failed to start');
    }
  }, []);

  const stop = React.useCallback(() => {
    if (!srRef.current) return;
    try {
      srRef.current.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  return { recording, transcript, start, stop, supported, error };
}
