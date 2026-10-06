import type { EngineContext, MatchState } from '../rules/types';
import { buildFixture } from './fixtures';
import type { ScenarioDefinition } from './types';

export const scenarioCatalog: readonly ScenarioDefinition[] = [
  {
    id: 'commander-third-cast', title: 'Third Commander Cast',
    purpose: 'Test Commander tax, payment, and a cast from the Commander Zone.', rules: ['FFTCG 11.2', 'Commander format'],
    cards: ['P-001L', 'P-009C', 'P-010C', 'P-011R', 'P-015C', 'P-018R'], expected: ['The Commander costs seven CP.', 'An accepted cast increments the tax count.'],
    fixture: { active: 0, phase: 'main1', commanderCasts: { 0: 2 }, placements: [
      { seat: 0, card: 'P-009C', zone: 'field', dull: true }, { seat: 0, card: 'P-010C', zone: 'field', dull: true },
      { seat: 0, card: 'P-011R', zone: 'field', dull: true }, { seat: 0, card: 'P-015C', zone: 'hand' },
      { seat: 0, card: 'P-018R', zone: 'hand' },
    ] },
  },
  {
    id: 'multi-ex', title: 'Two EX Bursts',
    purpose: 'Test two-point Summon damage and ordered optional EX Burst resolution.', rules: ['FFTCG 6.5', 'FFTCG 11.10'],
    cards: ['P-019H', 'P-031R', 'P-035C'], expected: ['All damage cards enter before EX choices.', 'EX Bursts resolve in revealed order without a response window.'],
    fixture: { active: 0, phase: 'main1', placements: [
      { seat: 0, card: 'P-019H', zone: 'hand' }, { seat: 0, card: 'P-005R', zone: 'field' },
      { seat: 1, card: 'P-023C', zone: 'field' },
    ], deckTop: { 1: ['P-031R', 'P-035C'] } },
  },
  {
    id: 'control-conflict', title: 'Borrowed Banner Conflict',
    purpose: 'Test temporary control, Backup limit, and Light/Dark conflict handling.', rules: ['FFTCG 7.7', 'FFTCG 12.4'],
    cards: ['P-007H', 'P-009C', 'P-028H', 'P-029C', 'P-030C', 'P-031R', 'P-032R', 'P-033R', 'P-039H'],
    expected: ['Borrowed Banner changes control without changing owner.', 'Rule processes enforce field limits.'],
    fixture: { active: 1, phase: 'main1', placements: [
      { seat: 1, card: 'P-039H', zone: 'hand' }, { seat: 1, card: 'P-029C', zone: 'field', dull: true },
      { seat: 1, card: 'P-030C', zone: 'field', dull: true }, { seat: 1, card: 'P-031R', zone: 'field', dull: true },
      { seat: 1, card: 'P-032R', zone: 'field', dull: true }, { seat: 1, card: 'P-033R', zone: 'field', dull: true },
      { seat: 1, card: 'P-028H', zone: 'field' }, { seat: 0, card: 'P-009C', zone: 'field', dull: true },
      { seat: 0, card: 'P-007H', zone: 'field' },
    ] },
  },
  {
    id: 'end-trigger-order', title: 'End Phase Trigger Order',
    purpose: 'Test Mist Caller, Rising Undertow, End Phase priority, and discard timing.', rules: ['FFTCG 9.5', 'FFTCG 11.8'],
    cards: ['P-022C', 'P-023C', 'P-024C', 'P-034R', 'P-040R'], expected: ['Choose the order of simultaneous End Phase abilities.', 'Resolve the required discard after the trigger.'],
    fixture: { active: 1, priority: 1, phase: 'main2', placements: [
      { seat: 1, card: 'P-034R', zone: 'field' }, { seat: 1, card: 'P-023C', zone: 'field', dull: true },
      { seat: 1, card: 'P-040R', zone: 'hand' }, { seat: 1, card: 'P-022C', zone: 'hand' },
      { seat: 1, card: 'P-024C', zone: 'hand' },
    ] },
  },
  {
    id: 'party-first-strike', title: 'Party and First Strike',
    purpose: 'Arrange a Forward party, First Strike effect, and opposing blocker.', rules: ['FFTCG 10.2', 'FFTCG 10.8'],
    cards: ['P-023C', 'P-024C', 'P-026R', 'P-037R', 'P-003C'], expected: ['Compare single and party attacks.', 'Apply First Strike before ordinary battle damage.'],
    fixture: { active: 1, phase: 'attack', placements: [
      { seat: 1, card: 'P-023C', zone: 'field' }, { seat: 1, card: 'P-024C', zone: 'field' },
      { seat: 1, card: 'P-026R', zone: 'field' }, { seat: 1, card: 'P-037R', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'field' },
    ] },
  },
  {
    id: 'commander-destinations', title: 'Commander Destinations',
    purpose: 'Test Commander return choices, destination triggers, and owner/controller distinction.', rules: ['FFTCG 11.8', 'Commander format'],
    cards: ['P-001L', 'P-014R', 'P-023C', 'P-033R', 'P-035C'], expected: ['The owner chooses whether the Commander returns to its zone.', 'A replaced departure still triggers departure abilities.'],
    fixture: { active: 1, phase: 'main1', placements: [
      { seat: 0, card: 'P-001L', zone: 'field' }, { seat: 0, card: 'P-014R', zone: 'field' },
      { seat: 1, card: 'P-023C', zone: 'field' }, { seat: 1, card: 'P-033R', zone: 'field' },
      { seat: 1, card: 'P-035C', zone: 'hand' },
    ] },
  },
];

export function loadScenario(id: string, context: EngineContext): MatchState {
  const definition = scenarioCatalog.find(scenario => scenario.id === id);
  if (!definition) throw new Error(`Unknown scenario: ${id}`);
  return buildFixture(definition.fixture, context);
}
