// Default demo deck + game state. Real Scryfall data is baked in so the app
// renders genuine art the moment it boots — no network call required on first paint.
//
// Card identities (names) match the original mockup; everything else
// (scryfallId, imageUrl, oracleText, etc.) was pulled from Scryfall and inlined here.

import type { Card } from '../types';

interface Enrichment {
  scryfallId: string;
  cost: string;
  type: string;
  pt: string | null;
  colors: Card['colors'];
  rarity: Card['rarity'];
  cmc: number;
  oracleText: string;
  imageUrl: string;
}

const E: Record<string, Enrichment> = {
  'Augur of Bolas': {
    scryfallId: 'd19fbfe6-69bb-452a-be3c-b9c625e23193',
    cost: '1U', type: 'Creature — Merfolk Wizard', pt: '1/3', colors: ['U'], rarity: 'uncommon', cmc: 2,
    oracleText: 'When this creature enters, look at the top three cards of your library. You may reveal an instant or sorcery card from among them and put it into your hand. Put the rest on the bottom of your library in any order.',
    imageUrl: 'https://cards.scryfall.io/normal/front/d/1/d19fbfe6-69bb-452a-be3c-b9c625e23193.jpg?1557576145',
  },
  'Snapcaster Mage': {
    scryfallId: '22b36ad5-bf4d-436a-9c3c-fa4acd0052fe',
    cost: '1U', type: 'Creature — Human Wizard', pt: '2/1', colors: ['U'], rarity: 'mythic', cmc: 2,
    oracleText: 'Flash\nWhen this creature enters, target instant or sorcery card in your graveyard gains flashback until end of turn. The flashback cost is equal to its mana cost.',
    imageUrl: 'https://cards.scryfall.io/normal/front/2/2/22b36ad5-bf4d-436a-9c3c-fa4acd0052fe.jpg?1736551138',
  },
  'Jace, the Mind Sculptor': {
    scryfallId: 'c8817585-0d32-4d56-9142-0d29512e86a9',
    cost: '2UU', type: 'Legendary Planeswalker — Jace', pt: '3', colors: ['U'], rarity: 'mythic', cmc: 4,
    oracleText: '+2: Look at the top card of target player\'s library. You may put that card on the bottom of that player\'s library.\n0: Draw three cards, then put two cards from your hand on top of your library in any order.\n−1: Return target creature to its owner\'s hand.\n−12: Exile all cards from target player\'s library, then that player shuffles their hand into their library.',
    imageUrl: 'https://cards.scryfall.io/normal/front/c/8/c8817585-0d32-4d56-9142-0d29512e86a9.jpg?1598304029',
  },
  'Counterspell': {
    scryfallId: '4f616706-ec97-4923-bb1e-11a69fbaa1f8',
    cost: 'UU', type: 'Instant', pt: null, colors: ['U'], rarity: 'uncommon', cmc: 2,
    oracleText: 'Counter target spell.',
    imageUrl: 'https://cards.scryfall.io/normal/front/4/f/4f616706-ec97-4923-bb1e-11a69fbaa1f8.jpg?1751282477',
  },
  'Brainstorm': {
    scryfallId: '8beb987c-1b67-4a4e-ae71-58547afad2a0',
    cost: 'U', type: 'Instant', pt: null, colors: ['U'], rarity: 'common', cmc: 1,
    oracleText: 'Draw three cards, then put two cards from your hand on top of your library in any order.',
    imageUrl: 'https://cards.scryfall.io/normal/front/8/b/8beb987c-1b67-4a4e-ae71-58547afad2a0.jpg?1726284649',
  },
  'Force of Will': {
    scryfallId: '89f612d6-7c59-4a7b-a87d-45f789e88ba5',
    cost: '3UU', type: 'Instant', pt: null, colors: ['U'], rarity: 'mythic', cmc: 5,
    oracleText: 'You may pay 1 life and exile a blue card from your hand rather than pay this spell\'s mana cost.\nCounter target spell.',
    imageUrl: 'https://cards.scryfall.io/normal/front/8/9/89f612d6-7c59-4a7b-a87d-45f789e88ba5.jpg?1776775773',
  },
  'Cryptic Command': {
    scryfallId: '30f6fca9-003b-4f6b-9d6e-1e88adda4155',
    cost: '1UUU', type: 'Instant', pt: null, colors: ['U'], rarity: 'rare', cmc: 4,
    oracleText: 'Choose two —\n• Counter target spell.\n• Return target permanent to its owner\'s hand.\n• Tap all creatures your opponents control.\n• Draw a card.',
    imageUrl: 'https://cards.scryfall.io/normal/front/3/0/30f6fca9-003b-4f6b-9d6e-1e88adda4155.jpg?1764758767',
  },
  'Ponder': {
    scryfallId: 'dc69f960-68ba-4315-8146-6a7a82047503',
    cost: 'U', type: 'Sorcery', pt: null, colors: ['U'], rarity: 'common', cmc: 1,
    oracleText: 'Look at the top three cards of your library, then put them back in any order. You may shuffle.\nDraw a card.',
    imageUrl: 'https://cards.scryfall.io/normal/front/d/c/dc69f960-68ba-4315-8146-6a7a82047503.jpg?1743206358',
  },
  'Cyclonic Rift': {
    scryfallId: 'dfb7c4b9-f2f4-4d4e-baf2-86551c8150fe',
    cost: '1U', type: 'Instant', pt: null, colors: ['U'], rarity: 'mythic', cmc: 2,
    oracleText: 'Return target nonland permanent you don\'t control to its owner\'s hand.\nOverload {6}{U}',
    imageUrl: 'https://cards.scryfall.io/normal/front/d/f/dfb7c4b9-f2f4-4d4e-baf2-86551c8150fe.jpg?1702429366',
  },
  'Polluted Delta': {
    scryfallId: '6e288374-2b71-4ace-b1d2-a19fee6cb4af',
    cost: '', type: 'Land', pt: null, colors: ['C'], rarity: 'rare', cmc: 0,
    oracleText: '{T}, Pay 1 life, Sacrifice this land: Search your library for an Island or Swamp card, put it onto the battlefield, then shuffle.',
    imageUrl: 'https://cards.scryfall.io/normal/front/6/e/6e288374-2b71-4ace-b1d2-a19fee6cb4af.jpg?1717013017',
  },
  'Flooded Strand': {
    scryfallId: '8f85e12c-196b-4459-b81f-0c9c854e9f57',
    cost: '', type: 'Land', pt: null, colors: ['C'], rarity: 'rare', cmc: 0,
    oracleText: '{T}, Pay 1 life, Sacrifice this land: Search your library for a Plains or Island card, put it onto the battlefield, then shuffle.',
    imageUrl: 'https://cards.scryfall.io/normal/front/8/f/8f85e12c-196b-4459-b81f-0c9c854e9f57.jpg?1717012985',
  },
  'Island': {
    scryfallId: '739aaaac-c424-4ea7-a084-62a6fc0438b0',
    cost: '', type: 'Basic Land — Island', pt: null, colors: ['U'], rarity: 'common', cmc: 0,
    oracleText: '({T}: Add {U}.)',
    imageUrl: 'https://cards.scryfall.io/normal/front/7/3/739aaaac-c424-4ea7-a084-62a6fc0438b0.jpg?1777658399',
  },
  'Vendilion Clique': {
    scryfallId: 'cd702cf1-10ca-4448-9fb1-b6de635e839c',
    cost: '1UU', type: 'Legendary Creature — Faerie Wizard', pt: '3/1', colors: ['U'], rarity: 'mythic', cmc: 3,
    oracleText: 'Flash\nFlying\nWhen Vendilion Clique enters, look at target player\'s hand. You may choose a nonland card from it. If you do, that player reveals the chosen card, puts it on the bottom of their library, then draws a card.',
    imageUrl: 'https://cards.scryfall.io/normal/front/c/d/cd702cf1-10ca-4448-9fb1-b6de635e839c.jpg?1562441167',
  },
  'Mystic Sanctuary': {
    scryfallId: '4cd86997-d7b9-4b5b-9488-11f5c679e4d3',
    cost: '', type: 'Land — Island', pt: null, colors: ['U'], rarity: 'common', cmc: 0,
    oracleText: '({T}: Add {U}.)\nThis land enters tapped unless you control three or more other Islands.\nWhen this land enters untapped, you may put target instant or sorcery card from your graveyard on top of your library.',
    imageUrl: 'https://cards.scryfall.io/normal/front/4/c/4cd86997-d7b9-4b5b-9488-11f5c679e4d3.jpg?1775942303',
  },
  'Force Spike': {
    scryfallId: '97a6c6c9-dd26-4ce7-850f-0b3fc49245bd',
    cost: 'U', type: 'Instant', pt: null, colors: ['U'], rarity: 'common', cmc: 1,
    oracleText: 'Counter target spell unless its controller pays {1}.',
    imageUrl: 'https://cards.scryfall.io/normal/front/9/7/97a6c6c9-dd26-4ce7-850f-0b3fc49245bd.jpg?1758104077',
  },
  'Lightning Bolt': {
    scryfallId: '77c6fa74-5543-42ac-9ead-0e890b188e99',
    cost: 'R', type: 'Instant', pt: null, colors: ['R'], rarity: 'uncommon', cmc: 1,
    oracleText: 'Lightning Bolt deals 3 damage to any target.',
    imageUrl: 'https://cards.scryfall.io/normal/front/7/7/77c6fa74-5543-42ac-9ead-0e890b188e99.jpg?1706239968',
  },
  'Goblin Guide': {
    scryfallId: '3c0f5411-1940-410f-96ce-6f92513f753a',
    cost: 'R', type: 'Creature — Goblin Scout', pt: '2/2', colors: ['R'], rarity: 'rare', cmc: 1,
    oracleText: 'Haste\nWhenever this creature attacks, defending player reveals the top card of their library. If it\'s a land card, that player puts it into their hand.',
    imageUrl: 'https://cards.scryfall.io/normal/front/3/c/3c0f5411-1940-410f-96ce-6f92513f753a.jpg?1599706366',
  },
  'Eidolon of the Great Revel': {
    scryfallId: '183ef738-0559-49ca-85b4-e6836521f203',
    cost: 'RR', type: 'Enchantment Creature — Spirit', pt: '2/2', colors: ['R'], rarity: 'rare', cmc: 2,
    oracleText: 'Whenever a player casts a spell with mana value 3 or less, this creature deals 2 damage to that player.',
    imageUrl: 'https://cards.scryfall.io/normal/front/1/8/183ef738-0559-49ca-85b4-e6836521f203.jpg?1690817860',
  },
  'Searing Blaze': {
    scryfallId: 'f659d464-13dd-49e2-a842-098dcba49659',
    cost: 'RR', type: 'Instant', pt: null, colors: ['R'], rarity: 'common', cmc: 2,
    oracleText: 'Searing Blaze deals 1 damage to target player or planeswalker and 1 damage to target creature that player or that planeswalker\'s controller controls.\nLandfall — If you had a land enter the battlefield under your control this turn, Searing Blaze deals 3 damage to that player or planeswalker and 3 damage to that creature instead.',
    imageUrl: 'https://cards.scryfall.io/normal/front/f/6/f659d464-13dd-49e2-a842-098dcba49659.jpg?1581708594',
  },
  'Monastery Swiftspear': {
    scryfallId: 'd6bfa227-4309-40ed-952c-279595eab17e',
    cost: 'R', type: 'Creature — Human Monk', pt: '1/2', colors: ['R'], rarity: 'uncommon', cmc: 1,
    oracleText: 'Haste\nProwess (Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.)',
    imageUrl: 'https://cards.scryfall.io/normal/front/d/6/d6bfa227-4309-40ed-952c-279595eab17e.jpg?1701690543',
  },
  'Mountain': {
    scryfallId: '51acfb01-4b0b-48fc-9704-a9b4a1e43a23',
    cost: '', type: 'Basic Land — Mountain', pt: null, colors: ['R'], rarity: 'common', cmc: 0,
    oracleText: '({T}: Add {R}.)',
    imageUrl: 'https://cards.scryfall.io/normal/front/5/1/51acfb01-4b0b-48fc-9704-a9b4a1e43a23.jpg?1777658413',
  },
  'Sunbaked Canyon': {
    scryfallId: 'c36820fa-ee86-4206-9a0d-737a67cf5208',
    cost: '', type: 'Land', pt: null, colors: ['R'], rarity: 'rare', cmc: 0,
    oracleText: '{T}, Pay 1 life: Add {R} or {W}.\n{1}, {T}, Sacrifice this land: Draw a card.',
    imageUrl: 'https://cards.scryfall.io/normal/front/c/3/c36820fa-ee86-4206-9a0d-737a67cf5208.jpg?1562202603',
  },
};

/** Look up a card name in the enrichment table and merge in id/qty/tapped overrides. */
function card(name: string, overrides: Partial<Card> & { id: string }): Card {
  const e = E[name];
  if (!e) throw new Error(`No enrichment for "${name}"`);
  return {
    name,
    cost: e.cost,
    type: e.type,
    pt: e.pt,
    colors: e.colors,
    rarity: e.rarity,
    cmc: e.cmc,
    scryfallId: e.scryfallId,
    oracleText: e.oracleText,
    imageUrl: e.imageUrl,
    ...overrides,
  };
}

export const STARTER_DECK: Card[] = [
  card('Augur of Bolas',          { id: 'c1', qty: 4 }),
  card('Snapcaster Mage',         { id: 'c2', qty: 4 }),
  card('Jace, the Mind Sculptor', { id: 'c3', qty: 3 }),
  card('Counterspell',            { id: 'c4', qty: 4 }),
  card('Brainstorm',              { id: 'c5', qty: 4 }),
  card('Force of Will',           { id: 'c6', qty: 3 }),
  card('Cryptic Command',         { id: 'c7', qty: 2 }),
  card('Ponder',                  { id: 'c8', qty: 4 }),
  card('Cyclonic Rift',           { id: 'c9', qty: 2 }),
  card('Polluted Delta',          { id: 'c10', qty: 4 }),
  card('Flooded Strand',          { id: 'c11', qty: 4 }),
  card('Island',                  { id: 'c12', qty: 14 }),
  card('Vendilion Clique',        { id: 'c13', qty: 2 }),
  card('Mystic Sanctuary',        { id: 'c14', qty: 2 }),
  card('Force Spike',             { id: 'c15', qty: 4 }),
];

export const AI_HAND: Card[] = [
  card('Lightning Bolt',             { id: 'ah1' }),
  card('Goblin Guide',               { id: 'ah2' }),
  card('Eidolon of the Great Revel', { id: 'ah3' }),
  card('Searing Blaze',              { id: 'ah4' }),
];

export const AI_BATTLEFIELD: Card[] = [
  card('Monastery Swiftspear',       { id: 'ab1', tapped: false }),
  card('Goblin Guide',               { id: 'ab2', tapped: true }),
  card('Eidolon of the Great Revel', { id: 'ab3', tapped: false }),
  card('Mountain',                   { id: 'al1', tapped: true }),
  card('Mountain',                   { id: 'al2', tapped: true }),
  card('Mountain',                   { id: 'al3', tapped: false }),
  card('Sunbaked Canyon',            { id: 'al4', tapped: false }),
];

export const HUMAN_BATTLEFIELD: Card[] = [
  card('Snapcaster Mage',  { id: 'hb1', tapped: false }),
  card('Augur of Bolas',   { id: 'hb2', tapped: false }),
  card('Island',           { id: 'hl1', tapped: true }),
  card('Island',           { id: 'hl2', tapped: false }),
  card('Island',           { id: 'hl3', tapped: false }),
  card('Flooded Strand',   { id: 'hl4', tapped: false }),
  card('Mystic Sanctuary', { id: 'hl5', tapped: false }),
];
