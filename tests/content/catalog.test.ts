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
