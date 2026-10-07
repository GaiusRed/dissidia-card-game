import { describe, expect, it } from 'vitest';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { opusPh, opusPhNumbers } from '../../src/content/opus-ph';
import { mvpFormat, productionFormat, validateDeck } from '../../src/rules/format';
import type { CardDefinition, Catalog, DeckList } from '../../src/rules/types';

const expected: Array<[string, string, string, number, number | null]> = [
  ['P-001L','Cinder Marshal','Forward',3,7000],['P-002C','Cinder Marshal','Forward',2,5000],
  ['P-003C','Ash Recruit','Forward',1,3000],['P-004C','Ash Recruit','Forward',2,5000],
  ['P-005R','Spark Runner','Forward',2,4000],['P-006R','Ember Duelist','Forward',3,6000],
  ['P-007H','Dusk Reaver','Forward',3,7000],['P-008H','Dawn Guardian','Forward',3,7000],
  ['P-009C','Coal Tender','Backup',1,null],['P-010C','Forge Apprentice','Backup',1,null],
  ['P-011R','Quartermaster','Backup',2,null],['P-012H','Banner Smith','Backup',2,null],
  ['P-013R','Ember Medic','Backup',2,null],['P-014R','Cinder Witness','Backup',2,null],
  ['P-015C','Scorch','Summon',1,null],['P-016R','Twin Embers','Summon',2,null],
  ['P-017R','War Cry','Summon',1,null],['P-018R','Ashen Verdict','Summon',3,null],
  ['P-019H','Final Spark','Summon',4,null],['P-020H','Controlled Burn','Summon',3,null],
  ['P-021L','Tide Warden','Forward',3,7000],['P-022C','Tide Warden','Forward',2,5000],
  ['P-023C','River Recruit','Forward',1,3000],['P-024C','River Recruit','Forward',2,5000],
  ['P-025R','Frost Binder','Forward',3,6000],['P-026R','Tide Duelist','Forward',3,6000],
  ['P-027H','Night Regent','Forward',3,7000],['P-028H','Dawn Arbiter','Forward',3,7000],
  ['P-029C','Brook Tender','Backup',1,null],['P-030C','Wave Apprentice','Backup',1,null],
  ['P-031R','Archive Keeper','Backup',2,null],['P-032R','Recovery Clerk','Backup',2,null],
  ['P-033R','Tide Witness','Backup',2,null],['P-034R','Mist Caller','Backup',2,null],
  ['P-035C','Return Tide','Summon',2,null],['P-036R','Stillwater','Summon',2,null],
  ['P-037R','Guarding Current','Summon',1,null],['P-038R','Shape Tide','Summon',2,null],
  ['P-039H','Borrowed Banner','Summon',4,null],['P-040R','Rising Undertow','Summon',2,null],
];
describe('Opus Placeholder content', () => {
  it('loads all forty cards with independently specified names, types and printed stats', () => {
    expect(opusPhNumbers).toHaveLength(40);
    expect(opusPhNumbers.map(number => {
      const card = opusPh[number]!;
      return [number, card.name, card.type, card.cost, card.power];
    })).toEqual(expected);
  });
  it('contains two legal singleton test decks under only the MVP profile', () => {
    expect(cinderCompany.main).toHaveLength(19);
    expect(tidalAssembly.main).toHaveLength(19);
    expect(validateDeck(cinderCompany, mvpFormat, opusPh)).toEqual([]);
    expect(validateDeck(tidalAssembly, mvpFormat, opusPh)).toEqual([]);
    expect(validateDeck(cinderCompany, productionFormat, opusPh).map(error => error.code)).toContain('SET_NOT_ALLOWED');
  });
  it('keeps Generic, EX, element, job and provenance metadata distinct', () => {
    expect(opusPh['P-003C']!.generic).toBe(true);
    expect(opusPh['P-015C']!.ex).toBe(true);
    expect(opusPh['P-031R']!.abilities[0]!.ex).toBe(true);
    expect(opusPh['P-007H']!.elements).toEqual(['Dark']);
    expect(opusPh['P-011R']!.jobs).toEqual(['Support']);
    expect(opusPh['P-001L']!.provenance).toBe('placeholder');
    expect(opusPh['P-001L']!.set).toBe('opus-ph');
  });
  it('matches the original roster rules text for every Opus Placeholder card', () => {
    const rosterText: Record<string, string> = {
      'P-001L': 'Brave. Flare Order — {S}, {Fire}, {D}: Choose 1 Forward. Deal it 7000 damage.',
      'P-002C': 'No abilities.', 'P-003C': 'Generic. No abilities.', 'P-004C': 'Generic. No abilities.',
      'P-005R': 'Haste.', 'P-006R': 'First Strike.',
      'P-007H': 'When Dusk Reaver enters the field, choose 1 Forward. It loses 2000 power until the end of the turn.',
      'P-008H': 'If Dawn Guardian would be dealt damage, reduce that damage by 1000 instead.',
      'P-009C': 'No abilities.',
      'P-010C': '{D}: Choose 1 Fire Forward. It gains 1000 power until the end of the turn.',
      'P-011R': 'When Quartermaster enters the field, you may search for 1 Job Soldier and add it to your hand.',
      'P-012H': 'Fire Forwards you control gain 1000 power.',
      'P-013R': '{Fire}, {D}, put Ember Medic into the Break Zone: Choose 1 Forward in your Break Zone. Add it to your hand.',
      'P-014R': 'When a Forward you control is put from the field into the Break Zone, choose 1 Forward. Deal it 1000 damage.',
      'P-015C': 'EX Burst. Choose 1 Forward. Deal it 4000 damage.',
      'P-016R': 'Choose 2 Forwards. Deal each of them 3000 damage.',
      'P-017R': 'Choose 1 Forward. It gains 3000 power and Brave until the end of the turn.',
      'P-018R': 'Choose 1 dull Forward. Break it.',
      'P-019H': 'Deal your opponent 2 points of damage.',
      'P-020H': 'Select 1 of the following 2 actions: Choose 1 Backup of cost 2 or less. Break it; or choose 1 Forward. Remove it from the game.',
      'P-021L': 'When Tide Warden enters the field, choose 1 Forward. Activate it. Undertow — {S}, {Water}, {D}: Choose 1 Forward. Return it to its owner\'s hand.',
      'P-022C': 'No abilities.', 'P-023C': 'No abilities.', 'P-024C': 'No abilities.',
      'P-025R': 'When Frost Binder enters the field, choose 1 Forward. Dull it and Freeze it.',
      'P-026R': 'First Strike.',
      'P-027H': 'When Night Regent is put from the field into the Break Zone, choose 1 Forward. It loses power equal to Night Regent\'s power until the end of the turn.',
      'P-028H': 'No abilities.', 'P-029C': 'No abilities.',
      'P-030C': '{D}: Choose 1 Forward. Activate it.',
      'P-031R': 'EX Burst. When Archive Keeper enters the field, draw 1 card, then discard 1 card.',
      'P-032R': '{Water}, {D}: Choose 1 card in your Break Zone. Put it on the bottom of your main deck.',
      'P-033R': 'When a Forward you control leaves the field, you may draw 1 card.',
      'P-034R': 'At the beginning of your End Phase, choose 1 Forward. Activate it.',
      'P-035C': 'EX Burst. Choose 1 Forward. Return it to its owner\'s hand.',
      'P-036R': 'Choose 1 Summon on the stack. Cancel its effect and put it into its owner\'s Break Zone.',
      'P-037R': 'Choose 1 Forward. It gains 2000 power and First Strike until the end of the turn.',
      'P-038R': 'Choose 1 Forward. Its power becomes 4000 until the end of the turn.',
      'P-039H': 'Choose 1 Character your opponent controls on the field. Gain control of it until the end of the turn.',
      'P-040R': 'Draw 2 cards. At the beginning of your End Phase, discard 1 card.',
    };
    expect(Object.keys(rosterText)).toHaveLength(40);
    const fire = ['P-001L', 'P-002C', 'P-003C', 'P-004C', 'P-005R', 'P-006R', 'P-009C', 'P-010C',
      'P-011R', 'P-012H', 'P-013R', 'P-014R', 'P-015C', 'P-016R', 'P-017R', 'P-018R', 'P-019H', 'P-020H'];
    const dark = ['P-007H', 'P-027H'];
    const light = ['P-008H', 'P-028H'];
    for (const [number, text] of Object.entries(rosterText)) {
      const card = opusPh[number]!;
      expect(card.text, number).toBe(text);
      expect(card.elements, number).toEqual([fire.includes(number) ? 'Fire' : dark.includes(number) ? 'Dark' : light.includes(number) ? 'Light' : 'Water']);
      expect(card.rarity, number).toBe(number.slice(-1));
      expect(card.set, number).toBe('opus-ph');
      expect(card.provenance, number).toBe('placeholder');
      expect(card.version, number).toBe('opus-ph-v1');
      for (const ability of card.abilities) {
        expect(text, `${number}/${ability.id}`).toContain(ability.text);
      }
    }
    expect(opusPhNumbers.filter(number => opusPh[number]!.generic).sort()).toEqual(['P-003C', 'P-004C', 'P-023C', 'P-024C']);
    expect(opusPhNumbers.filter(number => opusPh[number]!.ex).sort()).toEqual(['P-015C', 'P-031R', 'P-035C']);
    expect(opusPh['P-013R']!.abilities[0]!.kind).toBe('action');
  });
  it('keeps Summon target declarations aligned with their printed restrictions', () => {
    const targetRules: Record<string, { min: number; max: number; zones: string[]; types: string[]; controller: string; dull: boolean | null }> = {
      'P-015C': { min: 1, max: 1, zones: ['field'], types: ['Forward'], controller: 'any', dull: null },
      'P-016R': { min: 2, max: 2, zones: ['field'], types: ['Forward'], controller: 'any', dull: null },
      'P-017R': { min: 1, max: 1, zones: ['field'], types: ['Forward'], controller: 'any', dull: null },
      'P-018R': { min: 1, max: 1, zones: ['field'], types: ['Forward'], controller: 'any', dull: true },
      'P-019H': { min: 0, max: 0, zones: [], types: [], controller: 'any', dull: null },
      'P-020H': { min: 1, max: 1, zones: ['field'], types: ['Forward', 'Backup'], controller: 'any', dull: null },
      'P-035C': { min: 1, max: 1, zones: ['field'], types: ['Forward'], controller: 'any', dull: null },
      'P-036R': { min: 1, max: 1, zones: ['stack'], types: ['Summon'], controller: 'any', dull: null },
      'P-037R': { min: 1, max: 1, zones: ['field'], types: ['Forward'], controller: 'any', dull: null },
      'P-038R': { min: 1, max: 1, zones: ['field'], types: ['Forward'], controller: 'any', dull: null },
      'P-039H': { min: 1, max: 1, zones: ['field'], types: ['Forward', 'Backup'], controller: 'opponent', dull: null },
      'P-040R': { min: 0, max: 0, zones: [], types: [], controller: 'any', dull: null },
    };
    expect(Object.keys(targetRules)).toHaveLength(12);
    for (const [number, expectedRule] of Object.entries(targetRules)) {
      expect(opusPh[number]!.summonTarget, number).toMatchObject(expectedRule);
    }
  });
  it('allows a custom Opus Zero Forward L Commander and legal staple in production', () => {
    const commander: CardDefinition = {
      number: '0-001L', name: 'Test Commander', set: 'opus-zero', provenance: 'custom',
      version: 'opus-zero-test-v1', rarity: 'L', type: 'Forward', elements: ['Fire'], cost: 3, power: 7000,
      jobs: [], categories: ['Commander'], generic: false, keywords: [], abilities: [], text: '', summonHandler: null, ex: false,
    };
    const mainCards = Array.from({ length: 49 }, (_, index): CardDefinition => ({
      ...commander, number: '0-' + String(index + 2).padStart(3, '0') + 'C',
      name: 'Custom staple ' + index, rarity: 'C', type: 'Summon', power: null, elements: ['Fire'],
    }));
    const catalog: Catalog = Object.fromEntries([commander, ...mainCards].map(card => [card.number, card]));
    const deck: DeckList = { commander: commander.number, main: mainCards.map(card => card.number) };
    expect(validateDeck(deck, productionFormat, catalog)).toEqual([]);
    expect(catalog[deck.main[0]!]!.provenance).toBe('custom');
  });
});
