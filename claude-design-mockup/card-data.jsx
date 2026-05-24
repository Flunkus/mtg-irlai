// Mock deck data — original placeholders, not real card art.
// MTG card names are factual references; we render an original visual treatment.

const MANA_COLORS = {
  W: { bg: '#f5efd6', fg: '#3d2f0f', ring: '#e8dba1', name: 'White' },
  U: { bg: '#aadfff', fg: '#082842', ring: '#5fb3e6', name: 'Blue' },
  B: { bg: '#2a2730', fg: '#e8e0e8', ring: '#5a525e', name: 'Black' },
  R: { bg: '#ffb8a3', fg: '#4a1409', ring: '#e87f5f', name: 'Red' },
  G: { bg: '#b5d6a8', fg: '#1a3a14', ring: '#7ab366', name: 'Green' },
  C: { bg: '#cfcabe', fg: '#2a2620', ring: '#9a9485', name: 'Colorless' },
};

// Deck: a mono-blue control archetype — fictional flavor
const STARTER_DECK = [
  { id: 'c1', qty: 4, name: 'Augur of Bolas', cost: '1U', type: 'Creature — Human Wizard', pt: '1/3', colors: ['U'], rarity: 'uncommon' },
  { id: 'c2', qty: 4, name: 'Snapcaster Mage', cost: '1U', type: 'Creature — Human Wizard', pt: '2/1', colors: ['U'], rarity: 'rare' },
  { id: 'c3', qty: 3, name: 'Jace, the Mind Sculptor', cost: '2UU', type: 'Legendary Planeswalker', pt: '3', colors: ['U'], rarity: 'mythic' },
  { id: 'c4', qty: 4, name: 'Counterspell', cost: 'UU', type: 'Instant', pt: null, colors: ['U'], rarity: 'common' },
  { id: 'c5', qty: 4, name: 'Brainstorm', cost: 'U', type: 'Instant', pt: null, colors: ['U'], rarity: 'common' },
  { id: 'c6', qty: 3, name: 'Force of Will', cost: '3UU', type: 'Instant', pt: null, colors: ['U'], rarity: 'mythic' },
  { id: 'c7', qty: 2, name: 'Cryptic Command', cost: '1UUU', type: 'Instant', pt: null, colors: ['U'], rarity: 'rare' },
  { id: 'c8', qty: 4, name: 'Ponder', cost: 'U', type: 'Sorcery', pt: null, colors: ['U'], rarity: 'common' },
  { id: 'c9', qty: 2, name: 'Cyclonic Rift', cost: '1U', type: 'Instant', pt: null, colors: ['U'], rarity: 'rare' },
  { id: 'c10', qty: 4, name: 'Polluted Delta', cost: '', type: 'Land', pt: null, colors: ['C'], rarity: 'rare' },
  { id: 'c11', qty: 4, name: 'Flooded Strand', cost: '', type: 'Land', pt: null, colors: ['C'], rarity: 'rare' },
  { id: 'c12', qty: 14, name: 'Island', cost: '', type: 'Basic Land — Island', pt: null, colors: ['U'], rarity: 'common' },
  { id: 'c13', qty: 2, name: 'Vendilion Clique', cost: '1UU', type: 'Legendary Creature — Faerie Wizard', pt: '3/1', colors: ['U'], rarity: 'rare' },
  { id: 'c14', qty: 2, name: 'Mystic Sanctuary', cost: '', type: 'Land — Island', pt: null, colors: ['U'], rarity: 'uncommon' },
  { id: 'c15', qty: 4, name: 'Force Spike', cost: 'U', type: 'Instant', pt: null, colors: ['U'], rarity: 'common' },
];

// AI opponent board state — mock
const AI_HAND = [
  { id: 'ah1', name: 'Lightning Bolt', cost: 'R', type: 'Instant', colors: ['R'] },
  { id: 'ah2', name: 'Goblin Guide', cost: 'R', type: 'Creature — Goblin Scout', pt: '2/2', colors: ['R'] },
  { id: 'ah3', name: 'Eidolon of the Great Revel', cost: 'RR', type: 'Enchantment Creature', pt: '2/2', colors: ['R'] },
  { id: 'ah4', name: 'Searing Blaze', cost: 'RR', type: 'Instant', colors: ['R'] },
];

const AI_BATTLEFIELD = [
  { id: 'ab1', name: 'Monastery Swiftspear', cost: 'R', type: 'Creature', pt: '1/2', colors: ['R'], tapped: false },
  { id: 'ab2', name: 'Goblin Guide', cost: 'R', type: 'Creature', pt: '2/2', colors: ['R'], tapped: true },
  { id: 'ab3', name: 'Eidolon of the Great Revel', cost: 'RR', type: 'Enchantment Creature', pt: '2/2', colors: ['R'], tapped: false },
  { id: 'al1', name: 'Mountain', cost: '', type: 'Land', pt: null, colors: ['R'], tapped: true },
  { id: 'al2', name: 'Mountain', cost: '', type: 'Land', pt: null, colors: ['R'], tapped: true },
  { id: 'al3', name: 'Mountain', cost: '', type: 'Land', pt: null, colors: ['R'], tapped: false },
  { id: 'al4', name: 'Sunbaked Canyon', cost: '', type: 'Land', pt: null, colors: ['R'], tapped: false },
];

const HUMAN_BATTLEFIELD = [
  { id: 'hb1', name: 'Snapcaster Mage', cost: '1U', type: 'Creature', pt: '2/1', colors: ['U'], tapped: false },
  { id: 'hb2', name: 'Augur of Bolas', cost: '1U', type: 'Creature', pt: '1/3', colors: ['U'], tapped: false },
  { id: 'hl1', name: 'Island', cost: '', type: 'Land', pt: null, colors: ['U'], tapped: true },
  { id: 'hl2', name: 'Island', cost: '', type: 'Land', pt: null, colors: ['U'], tapped: false },
  { id: 'hl3', name: 'Island', cost: '', type: 'Land', pt: null, colors: ['U'], tapped: false },
  { id: 'hl4', name: 'Flooded Strand', cost: '', type: 'Land', pt: null, colors: ['U'], tapped: false },
  { id: 'hl5', name: 'Mystic Sanctuary', cost: '', type: 'Land', pt: null, colors: ['U'], tapped: false },
];

const PHASES = ['Untap', 'Upkeep', 'Draw', 'Main 1', 'Combat', 'Main 2', 'End'];

Object.assign(window, { MANA_COLORS, STARTER_DECK, AI_HAND, AI_BATTLEFIELD, HUMAN_BATTLEFIELD, PHASES });
