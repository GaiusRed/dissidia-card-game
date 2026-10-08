import { describe, expect, it } from 'vitest';
import { effectivePower, hasKeyword } from '../../src/rules/continuous';
import { applyCommand } from '../../src/rules/engine';
import { context, fixture } from '../support/harness';

function cast(state: ReturnType<typeof fixture>['state'], seat: 0 | 1, source: string, targets: string[], payment: object, mode: string | null = null) {
  return applyCommand(state, { id: `summon-${state.seq}`, expectedSeq: state.seq, seat, intent: {
    kind: 'cast', source, targets, mode, payment: payment as never,
  } }, context);
}
function pass(state: ReturnType<typeof fixture>['state'], seat: 0 | 1) {
  return applyCommand(state, { id: `pass-${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
}
describe('placeholder Summon effects', () => {
  it('Scorch deals 4000 damage through the production reducer outside EX resolution', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-015C', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 1, card: 'P-026R', zone: 'field' },
    ] });
    let state = h.state;
    const summon = Object.values(state.cards).find(card => card.card === 'P-015C')!;
    const payment = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-026R')!;
    const castResult = cast(state, 0, summon.object, [target.object], {
      discard: [payment.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
      sourceElements: { [payment.object]: 'Fire' }, spend: { Fire: 1 },
    });
    expect(castResult.ok).toBe(true);
    if (!castResult.ok) return;
    state = castResult.state;
    for (const seat of [0, 1] as const) {
      const next = pass(state, seat);
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      state = next.state;
    }
    expect(state.cards[target.instance]!.damage).toBe(4000);
    expect(state.cards[summon.instance]!.zone).toBe('break');
  });

  it('Stillwater cancels a resolving Summon on the stack before its effect happens', () => {
    const h = fixture({ active: 0, priority: 0, placements: [
      { seat: 0, card: 'P-017R', zone: 'hand' }, { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-005R', zone: 'field' },
      { seat: 1, card: 'P-036R', zone: 'hand' }, { seat: 1, card: 'P-029C', zone: 'field' },
      { seat: 1, card: 'P-032R', zone: 'field' }, { seat: 1, card: 'P-026R', zone: 'field' },
    ] });
    let state = h.state;
    const warCry = Object.values(state.cards).find(card => card.card === 'P-017R')!;
    const stillwater = Object.values(state.cards).find(card => card.card === 'P-036R')!;
    const fireBackup = Object.values(state.cards).find(card => card.card === 'P-009C')!;
    const firstWaterBackup = Object.values(state.cards).find(card => card.card === 'P-029C')!;
    const secondWaterBackup = Object.values(state.cards).find(card => card.card === 'P-032R')!;
    const forward = Object.values(state.cards).find(card => card.card === 'P-026R')!;
    const originalPower = effectivePower(state, forward.object, context);
    const playedWarCry = cast(state, 0, warCry.object, [forward.object], {
      discard: [], dullBackups: [fireBackup.object], specialDiscard: null, dullSource: false, sacrificeSource: false,
      sourceElements: { [fireBackup.object]: 'Fire' }, spend: { Fire: 1 },
    });
    if (!playedWarCry.ok) throw new Error(playedWarCry.error.message);
    state = playedWarCry.state;
    const passToOpponent = pass(state, 0);
    if (!passToOpponent.ok) throw new Error(passToOpponent.error.message);
    state = passToOpponent.state;
    const warCryStackSource = state.cards[warCry.instance]!.object;
    const response = cast(state, 1, stillwater.object, [warCryStackSource], {
      discard: [], dullBackups: [firstWaterBackup.object, secondWaterBackup.object], specialDiscard: null,
      dullSource: false, sacrificeSource: false,
      sourceElements: { [firstWaterBackup.object]: 'Water', [secondWaterBackup.object]: 'Water' }, spend: { Water: 2 },
    });
    if (!response.ok) throw new Error(response.error.message);
    state = response.state;
    for (let index = 0; index < 6 && state.stack.some(item => item.source === warCryStackSource); index += 1) {
      const next = pass(state, state.priority!);
      if (!next.ok) throw new Error(next.error.message);
      state = next.state;
    }

    expect(state.stack.some(item => item.source === warCryStackSource)).toBe(false);
    expect(state.cards[forward.instance]!.damage).toBe(0);
    expect(effectivePower(state, forward.object, context)).toBe(originalPower);
    expect(state.cards[stillwater.instance]!.zone).toBe('break');
  });

  it('Stillwater rejects a non-stack target without spending its response costs', () => {
    const h = fixture({ active: 0, priority: 0, placements: [
      { seat: 0, card: 'P-017R', zone: 'hand' }, { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-005R', zone: 'field' },
      { seat: 1, card: 'P-036R', zone: 'hand' }, { seat: 1, card: 'P-029C', zone: 'field' },
      { seat: 1, card: 'P-032R', zone: 'field' }, { seat: 1, card: 'P-026R', zone: 'field' },
    ] });
    let state = h.state;
    const warCry = Object.values(state.cards).find(card => card.card === 'P-017R')!;
    const stillwater = Object.values(state.cards).find(card => card.card === 'P-036R')!;
    const fireBackup = Object.values(state.cards).find(card => card.card === 'P-009C')!;
    const firstWaterBackup = Object.values(state.cards).find(card => card.card === 'P-029C')!;
    const secondWaterBackup = Object.values(state.cards).find(card => card.card === 'P-032R')!;
    const forward = Object.values(state.cards).find(card => card.card === 'P-026R')!;
    const playedWarCry = cast(state, 0, warCry.object, [forward.object], {
      discard: [], dullBackups: [fireBackup.object], specialDiscard: null, dullSource: false, sacrificeSource: false,
      sourceElements: { [fireBackup.object]: 'Fire' }, spend: { Fire: 1 },
    });
    if (!playedWarCry.ok) throw new Error(playedWarCry.error.message);
    state = playedWarCry.state;
    const passed = pass(state, 0);
    if (!passed.ok) throw new Error(passed.error.message);
    state = passed.state;
    const before = JSON.stringify(state);

    const rejected = cast(state, 1, stillwater.object, [forward.object], {
      discard: [], dullBackups: [firstWaterBackup.object, secondWaterBackup.object], specialDiscard: null,
      dullSource: false, sacrificeSource: false,
      sourceElements: { [firstWaterBackup.object]: 'Water', [secondWaterBackup.object]: 'Water' }, spend: { Water: 2 },
    });

    expect(rejected.ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
    expect(state.cards[firstWaterBackup.instance]!.dull).toBe(false);
    expect(state.cards[secondWaterBackup.instance]!.dull).toBe(false);
    expect(state.cards[stillwater.instance]!.zone).toBe('hand');
  });

  it('Twin Embers applies both 3000 damage operations from one resolution batch', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-016R', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-005R', zone: 'field' }, { seat: 0, card: 'P-006R', zone: 'field' },
    ] });
    let state = h.state;
    const summon = Object.values(state.cards).find(card => card.card === 'P-016R')!;
    const discard = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const first = Object.values(state.cards).find(card => card.card === 'P-005R')!;
    const second = Object.values(state.cards).find(card => card.card === 'P-006R')!;
    const reply = cast(state, 0, summon.object, [first.object, second.object], { discard: [discard.object], dullBackups: [],
      specialDiscard: null, dullSource: false, sacrificeSource: false,
      sourceElements: { [discard.object]: 'Fire' }, spend: { Fire: 2 } });
    if (!reply.ok) throw new Error(reply.error.message);
    state = reply.state;
    for (const seat of [0, 1] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.cards[first.instance]?.damage).toBe(3000);
    expect(state.cards[second.instance]?.damage).toBe(3000);
  });

  it('Guarding Current grants power and First Strike through the reducer', () => {
    const h = fixture({ active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-037R', zone: 'hand' }, { seat: 1, card: 'P-029C', zone: 'field' },
      { seat: 0, card: 'P-001L', zone: 'field' },
    ] });
    let state = h.state;
    const summon = Object.values(state.cards).find(card => card.card === 'P-037R')!;
    const backup = Object.values(state.cards).find(card => card.card === 'P-029C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-001L')!;
    const reply = cast(state, 1, summon.object, [target.object], { discard: [], dullBackups: [backup.object],
      specialDiscard: null, dullSource: false, sacrificeSource: false,
      sourceElements: { [backup.object]: 'Water' }, spend: { Water: 1 } });
    if (!reply.ok) throw new Error(reply.error.message);
    state = reply.state;
    for (const seat of [1, 0] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(effectivePower(state, target.object, context)).toBe(9000);
    expect(hasKeyword(state, target.object, 'First Strike', context)).toBe(true);
  });

  it('Shape Tide sets the chosen Forward power to 4000 through the reducer', () => {
    const h = fixture({ active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-038R', zone: 'hand' }, { seat: 1, card: 'P-024C', zone: 'hand' },
      { seat: 1, card: 'P-029C', zone: 'field' }, { seat: 0, card: 'P-001L', zone: 'field' },
    ] });
    let state = h.state;
    const summon = Object.values(state.cards).find(card => card.card === 'P-038R')!;
    const discard = Object.values(state.cards).find(card => card.card === 'P-024C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-001L')!;
    const reply = cast(state, 1, summon.object, [target.object], { discard: [discard.object], dullBackups: [],
      specialDiscard: null, dullSource: false, sacrificeSource: false,
      sourceElements: { [discard.object]: 'Water' }, spend: { Water: 2 } });
    if (!reply.ok) throw new Error(reply.error.message);
    state = reply.state;
    for (const seat of [1, 0] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(effectivePower(state, target.object, context)).toBe(4000);
  });

  it('grants War Cry power and Brave until end of turn', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-017R', zone: 'hand' }, { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-005R', zone: 'field' },
    ] });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-017R')!;
    const backup = Object.values(state.cards).find(card => card.card === 'P-009C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-005R')!;
    const reply = cast(state, 0, source.object, [target.object], { discard: [], dullBackups: [backup.object], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [backup.object]: 'Fire' }, spend: { Fire: 1 } });
    if (!reply.ok) throw new Error(reply.error.message); state = reply.state;
    for (const seat of [0, 1] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(effectivePower(state, target.object, context)).toBe(7000);
    expect(hasKeyword(state, target.object, 'Brave', context)).toBe(true);
  });

  it('asks the Commander owner when Return Tide targets their Commander', () => {
    const h = fixture({ priority: 1, placements: [
      { seat: 1, card: 'P-035C', zone: 'hand' }, { seat: 1, card: 'P-023C', zone: 'hand' },
      { seat: 0, card: 'P-001L', zone: 'field' },
    ] });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-035C')!;
    const discard = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    const commander = Object.values(state.cards).find(card => card.card === 'P-001L')!;
    const reply = cast(state, 1, source.object, [commander.object], { discard: [discard.object], dullBackups: [], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [discard.object]: 'Water' }, spend: { Water: 2 } });
    if (!reply.ok) throw new Error(reply.error.message); state = reply.state;
    for (const seat of [1, 0] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.choice?.seat).toBe(0);
    expect(state.cards[commander.instance]!.zone).toBe('field');
    const choice = state.choice!;
    const decision = applyCommand(state, { id: 'return-commander', expectedSeq: state.seq, seat: 0, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: ['return'], amounts: {} },
    } }, context);
    expect(decision.ok).toBe(true);
    if (decision.ok) expect(decision.state.cards[commander.instance]!.zone).toBe('commander');
  });

  it('breaks a Backup or removes a Forward based on Controlled Burn mode', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-020H', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 1, card: 'P-029C', zone: 'field' },
    ] });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-020H')!;
    const discard = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const backup = Object.values(state.cards).find(card => card.card === 'P-009C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-029C')!;
    const reply = cast(state, 0, source.object, [target.object], { discard: [discard.object], dullBackups: [backup.object], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [discard.object]: 'Fire', [backup.object]: 'Fire' }, spend: { Fire: 3 } }, 'backup');
    if (!reply.ok) throw new Error(reply.error.message); state = reply.state;
    for (const seat of [0, 1] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.cards[target.instance]!.zone).toBe('break');
  });

  it('gives control through the turn and returns the card to its owner at turn end', () => {
    const h = fixture({ phase: 'main2', active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-039H', zone: 'hand' }, { seat: 1, card: 'P-022C', zone: 'hand' }, { seat: 1, card: 'P-023C', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'field' },
    ] });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-039H')!;
    const firstDiscard = Object.values(state.cards).find(card => card.card === 'P-022C')!;
    const secondDiscard = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const reply = cast(state, 1, source.object, [target.object], { discard: [firstDiscard.object, secondDiscard.object], dullBackups: [], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [firstDiscard.object]: 'Water', [secondDiscard.object]: 'Water' }, spend: { Water: 4 } });
    if (!reply.ok) throw new Error(reply.error.message); state = reply.state;
    while (state.cards[target.instance]!.controller !== 1 && !state.result) {
      const next = pass(state, state.priority!); if (!next.ok) throw new Error(next.error.message); state = next.state;
      if (state.choice) break;
    }
    expect(state.cards[target.instance]!.controller).toBe(1);
    while (state.active === 1 && !state.result) {
      const next = pass(state, state.priority!); if (!next.ok) throw new Error(next.error.message); state = next.state;
      if (state.choice) break;
    }
    expect(state.active).toBe(0);
    expect(state.cards[target.instance]!.controller).toBe(0);
  });

  it('Rising Undertow draws two cards and requires one discard in the End Phase', () => {
    const h = fixture({ phase: 'main2', active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-040R', zone: 'hand' }, { seat: 1, card: 'P-022C', zone: 'hand' },
    ], deckTop: { 1: ['P-024C', 'P-025R'] } });
    let state = h.state;
    const summon = Object.values(state.cards).find(card => card.card === 'P-040R')!;
    const discard = Object.values(state.cards).find(card => card.card === 'P-022C')!;
    const reply = cast(state, 1, summon.object, [], { discard: [discard.object], dullBackups: [], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [discard.object]: 'Water' }, spend: { Water: 2 } });
    if (!reply.ok) throw new Error(reply.error.message); state = reply.state;
    for (const seat of [1, 0] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.zones[1].hand).toHaveLength(2);
    expect(state.execution.delayed).toHaveLength(1);
    expect(state.execution.delayed[0]).toMatchObject({ controller: 1, createdTurn: state.turn, eligibleTurn: state.turn, at: 'controller-end' });
    for (const seat of [1, 0] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.phase).toBe('end');
    expect(state.stack).toHaveLength(1);
    for (const seat of [1, 0] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.choice?.seat).toBe(1);
    expect(state.choice?.reason).toContain('discard');
    const selected = state.cards[state.zones[1].hand[0]!]!;
    const decision = applyCommand(state, { id: 'undertow-discard', expectedSeq: state.seq, seat: 1, intent: {
      kind: 'answer', answer: { choice: state.choice!.id, selected: [selected.object], amounts: {} },
    } }, context);
    expect(decision.ok).toBe(true);
    if (decision.ok) expect(decision.state.cards[selected.instance]!.zone).toBe('break');
  });

  it('Dawn Guardian reduces each damage instance by 1000', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-015C', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-008H', zone: 'field' },
    ] });
    let state = h.state;
    const summon = Object.values(state.cards).find(card => card.card === 'P-015C')!;
    const discard = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const guardian = Object.values(state.cards).find(card => card.card === 'P-008H')!;
    const reply = cast(state, 0, summon.object, [guardian.object], { discard: [discard.object], dullBackups: [], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [discard.object]: 'Fire' }, spend: { Fire: 1 } });
    if (!reply.ok) throw new Error(reply.error.message); state = reply.state;
    for (const seat of [0, 1] as const) { const next = pass(state, seat); if (!next.ok) throw new Error(next.error.message); state = next.state; }
    expect(state.cards[guardian.instance]!.damage).toBe(3000);
  });
});
