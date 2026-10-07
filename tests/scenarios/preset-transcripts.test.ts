import { describe, expect, it } from 'vitest';
import { createSave } from '../../src/storage/save';
import { replaySave } from '../../src/storage/replay';
import { applyCommand } from '../../src/rules/engine';
import { loadScenario } from '../../src/scenarios/catalog';
import { moveCard } from '../../src/rules/zones';
import { context } from '../support/harness';
import type { Command, MatchState, Seat } from '../../src/rules/types';

function record(state: MatchState, seat: Seat, intent: Command['intent']): Command {
  return { id: `preset-${state.seq}`, expectedSeq: state.seq, seat, intent };
}
function send(state: MatchState, command: Command): MatchState {
  // Each recorded action is resumed from a JSON save/reload checkpoint.
  const restored = JSON.parse(JSON.stringify(state)) as MatchState;
  const result = applyCommand(restored, command, context);
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.state;
}
function settlePresetChoices(state: MatchState, transcript: Command[]): MatchState {
  while (state.choice && !state.choice.reason.includes('Rising Undertow: discard')) {
    const choice = state.choice;
    const selected = choice.kind === 'order' ? choice.options.map(option => option.id)
      : choice.options.some(option => option.id === 'skip') ? ['skip']
        : choice.options.slice(0, choice.min).map(option => option.id);
    if (selected.length === 0) throw new Error(`No deterministic answer for ${choice.reason}`);
    const answer = record(state, choice.seat, { kind: 'answer', answer: { choice: choice.id, selected, amounts: {} } });
    transcript.push(answer);
    state = send(state, answer);
  }
  return state;
}
function passPair(state: MatchState, transcript: Command[]): MatchState {
  for (let index = 0; index < 2 && !state.choice && !state.result; index += 1) {
    const pass = record(state, state.priority!, { kind: 'pass' });
    transcript.push(pass);
    state = send(state, pass);
    state = settlePresetChoices(state, transcript);
  }
  return state;
}
function passWindow(state: MatchState, transcript: Command[]): MatchState {
  for (let index = 0; index < 2 && !state.choice && !state.result; index += 1) {
    const pass = record(state, state.priority!, { kind: 'pass' });
    transcript.push(pass);
    state = send(state, pass);
  }
  return state;
}

describe('advertised preset transcripts', () => {
  it('pays the third Commander cast with seven exact Fire CP and replays the transcript', () => {
    const origin = loadScenario('commander-third-cast', context);
    const commander = origin.cards[origin.commanders[0].instance]!;
    const backups = origin.field.map(instance => origin.cards[instance]!)
      .filter(card => card.controller === 0 && context.catalog[card.card]!.type === 'Backup');
    const discards = origin.zones[0].hand.map(instance => origin.cards[instance]!);
    expect(backups).toHaveLength(3);
    expect(discards).toHaveLength(2);
    const sources = [...backups, ...discards];
    const command = { id: 'preset-third-commander', expectedSeq: origin.seq, seat: 0 as const, intent: {
      kind: 'cast' as const, source: commander.object, targets: [], mode: null,
      payment: { discard: discards.map(card => card.object), dullBackups: backups.map(card => card.object),
        specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: Object.fromEntries(sources.map(card => [card.object, 'Fire' as const])), spend: { Fire: 7 } },
    } };
    const accepted = applyCommand(origin, command, context);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) throw new Error(accepted.error.message);
    expect(accepted.state.commanders[0].casts).toBe(3);
    expect(accepted.state.cards[commander.instance]?.zone).toBe('field');
    const save = createSave(accepted.state, [command], origin);
    expect(replaySave(origin, save, context)).toEqual(accepted.state);
  });

  it('reaches both optional EX decisions in the Final Spark preset and replays both answers', () => {
    const origin = loadScenario('multi-ex', context);
    for (const instance of origin.zones[1].deck.slice(2, 7)) moveCard(origin, instance, 'damage');
    const summon = origin.zones[0].hand.map(instance => origin.cards[instance]!).find(card => card.card === 'P-019H')!;
    const discards = origin.zones[0].hand.map(instance => origin.cards[instance]!).filter(card => card.card === 'P-003C' || card.card === 'P-004C');
    expect(discards).toHaveLength(2);
    const transcript: Command[] = [];
    let state = origin;
    const summonCommand = record(state, 0, { kind: 'cast', source: summon.object, targets: [], mode: null,
      payment: { discard: discards.map(card => card.object), dullBackups: [], specialDiscard: null,
        dullSource: false, sacrificeSource: false,
        sourceElements: Object.fromEntries(discards.map(card => [card.object, 'Fire' as const])), spend: { Fire: 4 } } });
    transcript.push(summonCommand);
    state = send(state, summonCommand);
    while (!state.choice && state.stack.length > 0) {
      const pass = record(state, state.priority!, { kind: 'pass' });
      transcript.push(pass);
      state = send(state, pass);
    }
    expect(state.choice?.reason).toContain('Archive Keeper');
    for (const name of ['Archive Keeper', 'Return Tide']) {
      const choice = state.choice!;
      expect(choice.reason).toContain(name);
      const answer = record(state, choice.seat, { kind: 'answer', answer: { choice: choice.id, selected: ['skip'], amounts: {} } });
      transcript.push(answer);
      state = send(state, answer);
    }
    expect(state.choice).toBeNull();
    expect(state.zones[1].damage.slice(-2).map(instance => state.cards[instance]!.card)).toEqual(['P-031R', 'P-035C']);
    expect(state.result).toEqual({ winner: 0, reason: 'damage' });
    expect(replaySave(origin, createSave(state, transcript, origin), context)).toEqual(state);
  });

  it('casts affordable Return Tide and returns the chosen Forward to its owner', () => {
    const origin = loadScenario('return-tide-affordable', context);
    const summon = origin.zones[1].hand.map(instance => origin.cards[instance]!).find(card => card.card === 'P-035C')!;
    const source = origin.zones[1].hand.map(instance => origin.cards[instance]!).find(card => card.card === 'P-024C')!;
    const target = origin.field.map(instance => origin.cards[instance]!).find(card => card.card === 'P-005R')!;
    const transcript: Command[] = [];
    let state = origin;
    const cast = record(state, 1, { kind: 'cast', source: summon.object, targets: [target.object], mode: null,
      payment: { discard: [source.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [source.object]: 'Water' }, spend: { Water: 2 } } });
    transcript.push(cast);
    state = send(state, cast);
    while (state.stack.length > 0) {
      const pass = record(state, state.priority!, { kind: 'pass' });
      transcript.push(pass);
      state = send(state, pass);
    }
    expect(state.cards[target.instance]?.zone).toBe('hand');
    expect(state.cards[target.instance]?.owner).toBe(0);
    expect(replaySave(origin, createSave(state, transcript, origin), context)).toEqual(state);
  });

  it('pays Borrowed Banner with four Water CP and gains control of the chosen Forward', () => {
    const origin = loadScenario('control-conflict', context);
    const summon = origin.zones[1].hand.map(instance => origin.cards[instance]!).find(card => card.card === 'P-039H')!;
    const discards = origin.zones[1].hand.map(instance => origin.cards[instance]!).filter(card => card.card === 'P-024C' || card.card === 'P-035C');
    const target = origin.field.map(instance => origin.cards[instance]!).find(card => card.card === 'P-005R')!;
    expect(discards).toHaveLength(2);
    const transcript: Command[] = [];
    let state = origin;
    const cast = record(state, 1, { kind: 'cast', source: summon.object, targets: [target.object], mode: null,
      payment: { discard: discards.map(card => card.object), dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: Object.fromEntries(discards.map(card => [card.object, 'Water' as const])), spend: { Water: 4 } } });
    transcript.push(cast);
    state = send(state, cast);
    while (state.stack.length > 0) {
      const pass = record(state, state.priority!, { kind: 'pass' });
      transcript.push(pass);
      state = send(state, pass);
    }
    expect(state.cards[target.instance]?.owner).toBe(0);
    expect(state.cards[target.instance]?.controller).toBe(1);
    expect(replaySave(origin, createSave(state, transcript, origin), context)).toEqual(state);
  });

  it('records the excess Backup choice after Borrowed Banner steals a Backup', () => {
    const origin = loadScenario('control-conflict', context);
    const summon = origin.zones[1].hand.map(instance => origin.cards[instance]!).find(card => card.card === 'P-039H')!;
    const discards = origin.zones[1].hand.map(instance => origin.cards[instance]!).filter(card => card.card === 'P-024C' || card.card === 'P-035C');
    const stolenBackup = origin.field.map(instance => origin.cards[instance]!).find(card => card.card === 'P-009C')!;
    const transcript: Command[] = [];
    let state = origin;
    const cast = record(state, 1, { kind: 'cast', source: summon.object, targets: [stolenBackup.object], mode: null,
      payment: { discard: discards.map(card => card.object), dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: Object.fromEntries(discards.map(card => [card.object, 'Water' as const])), spend: { Water: 4 } } });
    transcript.push(cast);
    state = send(state, cast);
    while (state.stack.length > 0 && !state.choice) {
      const pass = record(state, state.priority!, { kind: 'pass' });
      transcript.push(pass);
      state = send(state, pass);
    }
    expect(state.choice).not.toBeNull();
    if (!state.choice) return;
    expect(state.choice.reason).toContain('choose 1 Backup');
    expect(state.cards[stolenBackup.instance]?.controller).toBe(1);
    const answer = record(state, state.choice!.seat, { kind: 'answer', answer: {
      choice: state.choice!.id, selected: [state.choice!.options[0]!.id], amounts: {},
    } });
    transcript.push(answer);
    state = send(state, answer);
    expect(state.choice).toBeNull();
    expect(state.field.map(instance => state.cards[instance]!).filter(card => card.controller === 1 && context.catalog[card.card]!.type === 'Backup')).toHaveLength(5);
    expect(replaySave(origin, createSave(state, transcript, origin), context)).toEqual(state);
  });

  it.each([
    ['duplicate-name-conflict', [['P-001L', 'commander'], ['P-002C', 'break']]],
    ['light-dark-conflict', [['P-007H', 'break'], ['P-008H', 'break']]],
  ] as const)('resolves the %s field conflict and replays it', (scenario, outcomes) => {
    const origin = loadScenario(scenario, context);
    const transcript: Command[] = [];
    const pass = record(origin, origin.priority!, { kind: 'pass' });
    transcript.push(pass);
    let state = send(origin, pass);
    state = settlePresetChoices(state, transcript);
    for (const [number, zone] of outcomes) {
      const instance = Object.values(state.cards).find(card => card.card === number)!;
      expect(instance.zone).toBe(zone);
    }
    expect(replaySave(origin, createSave(state, transcript, origin), context)).toEqual(state);
  });

  it('records a party block and exact allocation from the First Strike preset', () => {
    const origin = loadScenario('party-first-strike', context);
    const attackers = origin.field.map(instance => origin.cards[instance]!).filter(card =>
      card.controller === 1 && (card.card === 'P-023C' || card.card === 'P-024C'));
    const blocker = origin.field.map(instance => origin.cards[instance]!).find(card => card.card === 'P-003C')!;
    expect(attackers).toHaveLength(2);
    const transcript: Command[] = [];
    let state = origin;
    const attack = record(state, 1, { kind: 'attack', members: attackers.map(card => card.object) });
    transcript.push(attack);
    state = send(state, attack);
    state = passWindow(state, transcript);
    const block = record(state, 0, { kind: 'block', blocker: blocker.object });
    transcript.push(block);
    state = send(state, block);
    state = passWindow(state, transcript);
    expect(state.choice?.kind).toBe('allocation');
    const answer = record(state, 0, { kind: 'answer', answer: {
      choice: state.choice!.id, selected: [], amounts: { [attackers[0]!.object]: 3000 },
    } });
    transcript.push(answer);
    state = send(state, answer);
    expect(state.combat).toBeNull();
    expect(state.cards[blocker.instance]?.zone).toBe('break');
    expect(state.cards[attackers[0]!.instance]?.zone).toBe('break');
    expect(replaySave(origin, createSave(state, transcript, origin), context)).toEqual(state);
  });

  it('records the First Strike blocker departure through combat completion', () => {
    const origin = loadScenario('party-first-strike', context);
    const attacker = origin.field.map(instance => origin.cards[instance]!).find(card => card.card === 'P-026R')!;
    const blocker = origin.field.map(instance => origin.cards[instance]!).find(card => card.card === 'P-003C')!;
    const transcript: Command[] = [];
    let state = origin;
    const attack = record(state, 1, { kind: 'attack', members: [attacker.object] });
    transcript.push(attack);
    state = send(state, attack);
    state = passWindow(state, transcript);
    const block = record(state, 0, { kind: 'block', blocker: blocker.object });
    transcript.push(block);
    state = send(state, block);
    state = passWindow(state, transcript);
    expect(state.combat?.step).toBe('normalDamage');
    expect(state.cards[blocker.instance]?.zone).toBe('break');
    state = passWindow(state, transcript);
    expect(state.combat).toBeNull();
    expect(state.zones[0].damage).toHaveLength(0);
    expect(replaySave(origin, createSave(state, transcript, origin), context)).toEqual(state);
  });

  it.each(['return', 'destination'] as const)('records the Commander %s choice and its departure observer', selected => {
    const origin = loadScenario('commander-destinations', context);
    const summon = origin.zones[1].hand.map(instance => origin.cards[instance]!).find(card => card.card === 'P-035C')!;
    const discard = origin.zones[1].hand.map(instance => origin.cards[instance]!).find(card => card.card === 'P-024C')!;
    const commander = origin.cards[origin.commanders[0].instance]!;
    const transcript: Command[] = [];
    let state = origin;
    const cast = record(state, 1, { kind: 'cast', source: summon.object, targets: [commander.object], mode: null,
      payment: { discard: [discard.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [discard.object]: 'Water' }, spend: { Water: 2 } } });
    transcript.push(cast);
    state = send(state, cast);
    while (state.stack.length > 0 && !state.choice) {
      const pass = record(state, state.priority!, { kind: 'pass' });
      transcript.push(pass);
      state = send(state, pass);
    }
    expect(state.choice?.reason).toContain('Commander');
    const departure = record(state, 0, { kind: 'answer', answer: {
      choice: state.choice!.id, selected: [selected], amounts: {},
    } });
    transcript.push(departure);
    state = send(state, departure);
    while (state.choice) {
      const choice = state.choice;
      const option = choice.options.some(item => item.id === 'skip') ? 'skip' : choice.options[0]?.id;
      if (!option) throw new Error('The preset exposed an empty mandatory choice.');
      const answer = record(state, choice.seat, { kind: 'answer', answer: { choice: choice.id, selected: [option], amounts: {} } });
      transcript.push(answer);
      state = send(state, answer);
    }
    expect(state.cards[commander.instance]?.zone).toBe(selected === 'return' ? 'commander' : 'hand');
    expect(replaySave(origin, createSave(state, transcript, origin), context)).toEqual(state);
  });

  it('runs Rising Undertow through its next controller End Phase discard and replays the transcript', () => {
    const origin = loadScenario('end-trigger-order', context);
    const summon = origin.zones[1].hand.map(instance => origin.cards[instance]!).find(card => card.card === 'P-040R')!;
    const source = origin.zones[1].hand.map(instance => origin.cards[instance]!).find(card => card.card === 'P-022C')!;
    const transcript: Command[] = [];
    let state = origin;
    const cast = record(state, 1, { kind: 'cast', source: summon.object, targets: [], mode: null,
      payment: { discard: [source.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [source.object]: 'Water' }, spend: { Water: 2 } } });
    transcript.push(cast);
    state = send(state, cast);
    state = passPair(state, transcript); // Resolve Rising Undertow.
    for (let pair = 0; pair < 24 && !state.choice?.reason.includes('Rising Undertow: discard'); pair += 1) {
      state = passPair(state, transcript);
      if (state.result) throw new Error('The preset ended before the delayed discard decision.');
    }
    expect(state.phase).toBe('end');
    expect(state.active).toBe(1);
    expect(state.choice?.reason).toContain('Rising Undertow: discard 1 card');
    const discarded = state.choice!.options[0]!;
    const discardedInstance = Object.values(state.cards).find(card => card.object === discarded.id)!.instance;
    const answer = record(state, state.choice!.seat, { kind: 'answer', answer: {
      choice: state.choice!.id, selected: [discarded.id], amounts: {},
    } });
    transcript.push(answer);
    state = send(state, answer);
    expect(state.cards[discardedInstance]?.zone).toBe('break');
    expect(replaySave(origin, createSave(state, transcript, origin), context)).toEqual(state);
  });
});
