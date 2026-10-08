import type { EngineContext, MatchState } from '../rules/types';
import { buildFixture } from './fixtures';
import type { ScenarioDefinition } from './types';

export const scenarioCatalog: readonly ScenarioDefinition[] = [
  {
    id: 'commander-third-cast', version: 2, title: 'Third Commander Cast',
    purpose: 'Test Commander tax, payment, and a cast from the Commander Zone.', rules: ['FFTCG 11.2', 'Commander format'],
    cards: ['P-001L', 'P-005R', 'P-009C', 'P-010C', 'P-011R', 'P-015C', 'P-018R'], expected: ['The Commander costs seven CP.', 'An accepted cast increments the tax count.'],
    fixture: { active: 0, phase: 'main1', commanderCasts: { 0: 2 }, placements: [
      { seat: 0, card: 'P-005R', zone: 'field' }, { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-010C', zone: 'field' },
      { seat: 0, card: 'P-011R', zone: 'field' }, { seat: 0, card: 'P-015C', zone: 'hand' },
      { seat: 0, card: 'P-018R', zone: 'hand' },
    ] },
  },
  {
    id: 'multi-ex', version: 2, title: 'Two EX Bursts',
    purpose: 'Test two-point Summon damage and ordered optional EX Burst resolution.', rules: ['FFTCG 6.5', 'FFTCG 11.10'],
    cards: ['P-019H', 'P-031R', 'P-035C'], expected: ['All damage cards enter before EX choices.', 'EX Bursts resolve in revealed order without a response window.'],
    fixture: { active: 0, phase: 'main1', placements: [
      { seat: 0, card: 'P-019H', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-004C', zone: 'hand' }, { seat: 0, card: 'P-005R', zone: 'field' },
      { seat: 1, card: 'P-023C', zone: 'field' },
    ], deckTop: { 1: ['P-031R', 'P-035C'] } },
  },
  {
    id: 'control-conflict', version: 2, title: 'Borrowed Banner Conflict',
    purpose: 'Test temporary control, Backup limit, and Light/Dark conflict handling.', rules: ['FFTCG 7.7', 'FFTCG 12.4'],
    cards: ['P-005R', 'P-007H', 'P-009C', 'P-028H', 'P-029C', 'P-030C', 'P-031R', 'P-032R', 'P-033R', 'P-039H'],
    expected: ['Borrowed Banner changes control without changing owner.', 'Rule processes enforce field limits.'],
    fixture: { active: 1, phase: 'main1', placements: [
      { seat: 1, card: 'P-039H', zone: 'hand' }, { seat: 1, card: 'P-029C', zone: 'field', dull: true },
      { seat: 1, card: 'P-030C', zone: 'field', dull: true }, { seat: 1, card: 'P-031R', zone: 'field', dull: true },
      { seat: 1, card: 'P-032R', zone: 'field', dull: true }, { seat: 1, card: 'P-033R', zone: 'field', dull: true },
      { seat: 1, card: 'P-028H', zone: 'field' }, { seat: 1, card: 'P-024C', zone: 'hand' },
      { seat: 1, card: 'P-035C', zone: 'hand' }, { seat: 0, card: 'P-009C', zone: 'field', dull: true },
      { seat: 0, card: 'P-007H', zone: 'field' }, { seat: 0, card: 'P-005R', zone: 'field' },
    ] },
  },
  {
    id: 'battlefield-card-status', version: 2, title: 'Battlefield Card Status',
    purpose: 'Inspect damaged, frozen Forwards and Dull Backups from either player view.', rules: ['FFTCG 10.4', 'FFTCG 12.1'],
    cards: ['P-003C', 'P-009C', 'P-023C', 'P-033R'],
    expected: ['Damage, Freeze, and readiness are visible on card inspection.', 'Controller rows retain their seat identity when the view changes.'],
    fixture: { active: 0, phase: 'main1', placements: [
      { seat: 0, card: 'P-003C', zone: 'field', damage: 1, frozen: true }, { seat: 0, card: 'P-009C', zone: 'field', dull: true },
      { seat: 1, card: 'P-023C', zone: 'field', damage: 2 }, { seat: 1, card: 'P-033R', zone: 'field', dull: true },
    ] },
  },
  {
    id: 'end-phase-two-card-discard', version: 1, title: 'Two-Card End Phase Discard',
    purpose: 'Review a required multi-card discard with seven cards in hand.', rules: ['FFTCG 9.5'],
    cards: ['P-003C', 'P-004C', 'P-005R', 'P-009C', 'P-010C', 'P-011R', 'P-015C'],
    expected: ['Two cards must be selected before Confirm is enabled.', 'A reload preserves the same required choice and match sequence.'],
    fixture: { active: 0, phase: 'end', placements: [
      { seat: 0, card: 'P-003C', zone: 'hand' }, { seat: 0, card: 'P-004C', zone: 'hand' },
      { seat: 0, card: 'P-005R', zone: 'hand' }, { seat: 0, card: 'P-009C', zone: 'hand' },
      { seat: 0, card: 'P-010C', zone: 'hand' }, { seat: 0, card: 'P-011R', zone: 'hand' },
      { seat: 0, card: 'P-015C', zone: 'hand' },
    ] },
  },
  {
    id: 'end-trigger-order', version: 2, title: 'End Phase Trigger Order',
    purpose: 'Test Mist Caller, Rising Undertow, End Phase priority, and discard timing.', rules: ['FFTCG 9.5', 'FFTCG 11.8'],
    cards: ['P-022C', 'P-023C', 'P-024C', 'P-034R', 'P-040R'], expected: ['Choose the order of simultaneous End Phase abilities.', 'Resolve the required discard after the trigger.'],
    fixture: { active: 1, priority: 1, phase: 'main2', placements: [
      { seat: 1, card: 'P-034R', zone: 'field' }, { seat: 1, card: 'P-023C', zone: 'field', dull: true },
      { seat: 1, card: 'P-040R', zone: 'hand' }, { seat: 1, card: 'P-022C', zone: 'hand' },
      { seat: 1, card: 'P-024C', zone: 'hand' },
    ], deckTop: { 1: ['P-025R', 'P-026R'] } },
  },
  {
    id: 'party-first-strike', version: 1, title: 'Party and First Strike',
    purpose: 'Arrange a Forward party, First Strike effect, and opposing blocker.', rules: ['FFTCG 10.2', 'FFTCG 10.8'],
    cards: ['P-023C', 'P-024C', 'P-026R', 'P-037R', 'P-003C'], expected: ['Compare single and party attacks.', 'Apply First Strike before ordinary battle damage.'],
    fixture: { active: 1, phase: 'attack', placements: [
      { seat: 1, card: 'P-023C', zone: 'field' }, { seat: 1, card: 'P-024C', zone: 'field' },
      { seat: 1, card: 'P-026R', zone: 'field' }, { seat: 1, card: 'P-037R', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'field' },
    ] },
  },
  {
    id: 'commander-destinations', version: 2, title: 'Commander Destinations',
    purpose: 'Test Commander return choices, destination triggers, and owner/controller distinction.', rules: ['FFTCG 11.8', 'Commander format'],
    cards: ['P-001L', 'P-014R', 'P-023C', 'P-024C', 'P-033R', 'P-035C'], expected: ['The owner chooses whether the Commander returns to its zone.', 'A replaced departure still triggers departure abilities.'],
    fixture: { active: 1, phase: 'main1', placements: [
      { seat: 0, card: 'P-001L', zone: 'field' }, { seat: 0, card: 'P-014R', zone: 'field' },
      { seat: 1, card: 'P-023C', zone: 'field' }, { seat: 1, card: 'P-033R', zone: 'field' },
      { seat: 1, card: 'P-035C', zone: 'hand' }, { seat: 1, card: 'P-024C', zone: 'hand' },
    ] },
  },
  {
    id: 'commander-removed-destination', version: 1, title: 'Commander Removed Destination',
    purpose: 'Remove an opposing Commander through a Summon and retain one physical identity in the removed zone.',
    rules: ['FFTCG 11.8', 'Commander format'],
    cards: ['P-001L', 'P-020H', 'P-003C', 'P-009C', 'P-021L'],
    expected: ['The player selects the Forward removal mode and confirms the Summon.', 'The Commander owner chooses the normal removed-zone destination without duplicating the physical card.'],
    fixture: { active: 0, phase: 'main1', placements: [
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-020H', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'hand' }, { seat: 1, card: 'P-021L', zone: 'field' },
    ] },
  },
  {
    id: 'commander-break-destination', version: 1, title: 'Commander Break Destination',
    purpose: 'Break a dull opposing Commander through a Summon and retain one physical identity in the Break Zone.',
    rules: ['FFTCG 11.8', 'Commander format'],
    cards: ['P-001L', 'P-018R', 'P-003C', 'P-009C', 'P-021L'],
    expected: ['The player selects the dull Forward and confirms Ashen Verdict.', 'The Commander owner chooses the normal Break Zone destination without duplicating the physical card.'],
    fixture: { active: 0, phase: 'main1', placements: [
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-018R', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'hand' }, { seat: 1, card: 'P-021L', zone: 'field', dull: true },
    ] },
  },
  {
    id: 'return-tide-affordable', version: 1, title: 'Affordable Return Tide',
    purpose: 'Cast Return Tide with a legal two-CP Water discard and resolve it against an opposing Forward.',
    rules: ['FFTCG 11.2', 'FFTCG 11.10'], cards: ['P-005R', 'P-024C', 'P-035C'],
    expected: ['A Water hand card pays the exact two-CP cost.', 'The opposing Forward returns to its owner\'s hand.'],
    fixture: { active: 1, phase: 'main1', placements: [
      { seat: 1, card: 'P-035C', zone: 'hand' }, { seat: 1, card: 'P-024C', zone: 'hand' },
      { seat: 0, card: 'P-005R', zone: 'field' },
    ] },
  },
  {
    id: 'twin-embers-target-selection', version: 1, title: 'Twin Embers Target Selection',
    purpose: 'Review selection and replacement of two distinct Forward targets.', rules: ['FFTCG 11.10'],
    cards: ['P-016R', 'P-003C', 'P-023C', 'P-024C', 'P-009C'],
    expected: ['Both player rows contain legal Forward targets.', 'The Backup is not a legal target.', 'Selected targets can be revised before confirmation.'],
    fixture: { active: 0, phase: 'main1', placements: [
      { seat: 0, card: 'P-016R', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field', dull: true }, { seat: 1, card: 'P-023C', zone: 'field' },
      { seat: 1, card: 'P-024C', zone: 'field' },
    ] },
  },
  {
    id: 'summon-without-payment', version: 1, title: 'Summon Without Payment',
    purpose: 'Show a targeted Summon that has no legal CP source.', rules: ['FFTCG 11.2'],
    cards: ['P-005R', 'P-008H', 'P-017R'],
    expected: ['War Cry remains inspectable but cannot open a target draft without a legal Fire CP source.'],
    fixture: { active: 0, phase: 'main1', placements: [
      { seat: 0, card: 'P-017R', zone: 'hand' }, { seat: 0, card: 'P-008H', zone: 'hand' },
      { seat: 0, card: 'P-005R', zone: 'field' },
    ] },
  },
  {
    id: 'duplicate-name-conflict', version: 1, title: 'Duplicate Name Conflict',
    purpose: 'Resolve a same-controller field conflict between the Cinder Marshal Commander and its non-Generic variant.',
    rules: ['FFTCG 5.2'], cards: ['P-001L', 'P-002C'],
    fixture: { active: 1, phase: 'main1', placements: [
      { seat: 0, card: 'P-001L', zone: 'field' }, { seat: 0, card: 'P-002C', zone: 'field' },
    ] },
    expected: ['Both non-Generic Cinder Marshal instances leave the field; the Commander owner chooses its replacement destination.'],
  },
  {
    id: 'light-dark-conflict', version: 1, title: 'Light and Dark Conflict',
    purpose: 'Resolve a same-controller Light and Dark field conflict in one rule checkpoint.',
    rules: ['FFTCG 5.2'], cards: ['P-007H', 'P-008H'],
    expected: ['Both Light/Dark instances leave the field in one rule checkpoint.'],
    fixture: { active: 0, phase: 'main1', placements: [
      { seat: 0, card: 'P-007H', zone: 'field' }, { seat: 0, card: 'P-008H', zone: 'field' },
    ] },
  },
  {
    id: 'commander-entry-target', version: 1, title: 'Commander Entry Target Choice',
    purpose: 'Test the Commander entry trigger and a required Forward target choice in the production UI.', rules: ['FFTCG 11.2', 'FFTCG 11.4'],
    cards: ['P-021L', 'P-030C', 'P-032R', 'P-033R', 'P-005R'],
    expected: ['Player 2 can cast Tide Warden using Water Backups.', 'Its entry trigger requires selecting a Forward before resuming.'],
    fixture: { active: 1, phase: 'main1', placements: [
      { seat: 1, card: 'P-030C', zone: 'field' }, { seat: 1, card: 'P-032R', zone: 'field' }, { seat: 1, card: 'P-033R', zone: 'field' },
      { seat: 0, card: 'P-005R', zone: 'field' },
    ] },
  },
];

export function loadScenario(id: string, context: EngineContext): MatchState {
  const definition = scenarioCatalog.find(scenario => scenario.id === id);
  if (!definition) throw new Error(`Unknown scenario: ${id}`);
  return buildFixture(definition.fixture, context);
}
