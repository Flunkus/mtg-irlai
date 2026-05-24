// Shared types. Kept loose to match the mockup; will be tightened as Scryfall fields land in Phase 2.

export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic';

export interface Card {
  id: string;
  name: string;
  cost?: string;
  type: string;
  pt?: string | null;
  colors?: ManaColor[];
  rarity?: Rarity;
  qty?: number;
  tapped?: boolean;
  freeform?: boolean;
  /** Phase 2: Scryfall image (image_uris.normal). When set, CardToken renders the art. */
  imageUrl?: string;
  /** Phase 2: Scryfall oracle text, persisted for LLM prompts. */
  oracleText?: string;
  /** Phase 2: Scryfall id, for re-fetches and de-dup. */
  scryfallId?: string;
  set?: string;
  collectorNumber?: string;
  cmc?: number;
  power?: string;
  toughness?: string;
}

export interface ManaPalette {
  bg: string;
  fg: string;
  ring: string;
  name: string;
}

export const MANA_COLORS: Record<ManaColor, ManaPalette> = {
  W: { bg: '#f5efd6', fg: '#3d2f0f', ring: '#e8dba1', name: 'White' },
  U: { bg: '#aadfff', fg: '#082842', ring: '#5fb3e6', name: 'Blue' },
  B: { bg: '#2a2730', fg: '#e8e0e8', ring: '#5a525e', name: 'Black' },
  R: { bg: '#ffb8a3', fg: '#4a1409', ring: '#e87f5f', name: 'Red' },
  G: { bg: '#b5d6a8', fg: '#1a3a14', ring: '#7ab366', name: 'Green' },
  C: { bg: '#cfcabe', fg: '#2a2620', ring: '#9a9485', name: 'Colorless' },
};

export const PHASES = ['Untap', 'Upkeep', 'Draw', 'Main 1', 'Combat', 'Main 2', 'End'] as const;
export type Phase = (typeof PHASES)[number];
