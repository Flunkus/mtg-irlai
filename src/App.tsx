// Root app shell. Lifted from claude-design-mockup/MTG Trainer.html.

import * as React from 'react';
import { Sidebar } from './components/Sidebar';
import { Battlefield } from './views/Battlefield';
import { DeckManager } from './views/DeckManager';
import { CardViewer } from './views/CardViewer';
import { PersonaManager } from './views/PersonaManager';
import { TweaksPanel, TweakSection, TweakColor, useTweaks } from './components/TweaksPanel';
import { GameProvider } from './state/gameStore';
import { DeckLibraryProvider } from './state/deckLibrary';
import { PersonaLibraryProvider } from './state/personaLibrary';
import { JsonDebugPanel } from './components/JsonDebugPanel';

const TWEAK_DEFAULTS = {
  accent: '#a78bfa',
};

const ACCENT_HEX_TO_HUE: Record<string, number> = {
  '#a78bfa': 290,
  '#60a5fa': 240,
  '#fbbf24': 70,
  '#34d399': 150,
};

export default function App() {
  const [view, setView] = React.useState<'battlefield' | 'deck' | 'viewer' | 'personas'>('battlefield');
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [jsonOpen, setJsonOpen] = React.useState(false);

  React.useEffect(() => {
    const hue = ACCENT_HEX_TO_HUE[tweaks.accent] ?? 290;
    document.documentElement.style.setProperty('--accent', `oklch(0.72 0.14 ${hue})`);
    document.documentElement.style.setProperty('--accent-glow', `oklch(0.72 0.14 ${hue} / 0.35)`);
  }, [tweaks.accent]);

  return (
    <DeckLibraryProvider>
    <PersonaLibraryProvider>
    <GameProvider>
      <div className="h-screen flex flex-row bg-zinc-950">
        <Sidebar
          view={view}
          setView={setView}
          onOpenTweaks={() => setTweaksOpen((o) => !o)}
          onToggleJson={() => setJsonOpen((o) => !o)}
          jsonOpen={jsonOpen}
        />
        <main
          className="flex-1 min-w-0 relative"
          data-screen-label={
            view === 'battlefield'
              ? 'Battlefield'
              : view === 'deck'
              ? 'Deck Manager'
              : view === 'personas'
              ? 'Personas'
              : 'Card Viewer'
          }
        >
          <div key={view} style={{ animation: 'fadeIn 240ms ease-out', height: '100%' }}>
            {view === 'battlefield' && <Battlefield />}
            {view === 'deck' && <DeckManager />}
            {view === 'personas' && <PersonaManager />}
            {view === 'viewer' && <CardViewer />}
          </div>
        </main>

        <TweaksPanel title="Tweaks" open={tweaksOpen} onClose={() => setTweaksOpen(false)}>
          <TweakSection label="Accent">
            <TweakColor
              label="Accent color"
              value={tweaks.accent}
              onChange={(v) => setTweak('accent', v)}
              options={['#a78bfa', '#60a5fa', '#fbbf24', '#34d399']}
            />
          </TweakSection>
        </TweaksPanel>

        <JsonDebugPanel open={jsonOpen} onClose={() => setJsonOpen(false)} />
      </div>
    </GameProvider>
    </PersonaLibraryProvider>
    </DeckLibraryProvider>
  );
}
