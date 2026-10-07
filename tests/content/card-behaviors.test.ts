import { describe, expect, it } from 'vitest';
import { checkRegistryCompleteness, createRegistry } from '../../src/content/registry';
import { opusPhFieldScripts, opusPhReplacementScripts, opusPhSummonScripts } from '../../src/content/manifest';
import { script as bannerSmithScript } from '../../src/content/cards/opus-ph/P-012H';
import { script as dawnGuardianScript } from '../../src/content/cards/opus-ph/P-008H';
import { script as duskReaverScript } from '../../src/content/cards/opus-ph/P-007H';
import { script as frostBinderScript } from '../../src/content/cards/opus-ph/P-025R';
import { script as archiveKeeperScript } from '../../src/content/cards/opus-ph/P-031R';
import { script as cinderWitnessScript } from '../../src/content/cards/opus-ph/P-014R';
import { script as tideWitnessScript } from '../../src/content/cards/opus-ph/P-033R';
import { script as tideWardenScript } from '../../src/content/cards/opus-ph/P-021L';
import { script as mistCallerScript } from '../../src/content/cards/opus-ph/P-034R';
import { script as nightRegentScript } from '../../src/content/cards/opus-ph/P-027H';
import { script as quartermasterScript } from '../../src/content/cards/opus-ph/P-011R';
import { resumeChoice, runScheduler } from '../../src/rules/scheduler';
import { replacementDamage } from '../../src/rules/damage';
import type { EngineContext, MatchState, Seat } from '../../src/rules/types';
import { fixture, context } from '../support/harness';

function exState(number: 'P-015C' | 'P-035C', seat: Seat, targetCard: 'P-005R' | 'P-026R') {
  const ability = number === 'P-015C' ? 'scorch-ex-burst' : 'return-tide-ex-burst';
  const h = fixture({ placements: [
    { seat, card: number, zone: 'damage' },
    { seat: number === 'P-015C' ? 0 : 1, card: targetCard, zone: 'field' },
  ] });
  const source = Object.values(h.state.cards).find(card => card.card === number)!;
  const resume = { script: number, version: '1', ability, step: 'resolve', payload: null };
  h.state.execution.frames.push({ id: `ex-${number}`, resume, mode: 'ex', controller: seat, source: source.object,
    lastKnown: { ...source }, targets: [], selectedMode: null, remaining: [],
    returnWindow: { kind: 'priority', seat }, operationIndex: 0, scriptComplete: false });
  const registry = createRegistry(opusPhSummonScripts, 'opus-ph-ex-test');
  return { state: h.state, engine: { ...context, registry } as EngineContext, ability, target: h.object(targetCard === 'P-005R' ? 0 : 1, targetCard) };
}

function answer(state: MatchState, engine: EngineContext, selected: string[]) {
  const choice = state.choice!;
  return resumeChoice(state, { choice: choice.id, selected, amounts: {} }, engine);
}

describe('typed EX Burst card behavior', () => {
  it('lets the player decline Scorch EX Burst without opening a target choice', () => {
    const { state, engine } = exState('P-015C', 0, 'P-005R');
    expect(runScheduler(state, engine).error).toBeNull();
    expect(state.choice?.kind).toBe('confirm');
    expect(answer(state, engine, ['skip']).error).toBeNull();
    expect(state.choice).toBeNull();
    expect(state.execution.frames).toHaveLength(0);
    expect(state.cards[Object.keys(state.cards).find(id => state.cards[id]!.object !== '' && state.cards[id]!.card === 'P-005R')!]!.damage).toBe(0);
  });

  it('resolves accepted Scorch EX Burst against the selected Forward', () => {
    const { state, engine, target } = exState('P-015C', 0, 'P-005R');
    runScheduler(state, engine);
    expect(answer(state, engine, ['use']).error).toBeNull();
    expect(state.choice?.kind).toBe('targets');
    expect(state.choice?.options.map(option => option.object)).toContain(target);
    expect(answer(state, engine, [target]).error).toBeNull();
    const forward = Object.values(state.cards).find(card => card.object === target)!;
    expect(forward.damage).toBe(4000);
    expect(state.execution.frames).toHaveLength(0);
  });

  it('returns the selected Forward to its owner when Return Tide EX Burst is accepted', () => {
    const { state, engine, target } = exState('P-035C', 1, 'P-026R');
    runScheduler(state, engine);
    expect(answer(state, engine, ['use']).error).toBeNull();
    expect(state.choice?.kind).toBe('targets');
    expect(answer(state, engine, [target]).error).toBeNull();
    const forward = Object.values(state.cards).find(card => card.card === 'P-026R')!;
    expect(forward.zone).toBe('hand');
    expect(forward.owner).toBe(1);
    expect(state.execution.frames).toHaveLength(0);
  });

  it('lets the player decline Return Tide EX Burst without moving a Forward', () => {
    const { state, engine } = exState('P-035C', 1, 'P-026R');
    expect(runScheduler(state, engine).error).toBeNull();
    expect(answer(state, engine, ['skip']).error).toBeNull();
    expect(Object.values(state.cards).find(card => card.card === 'P-026R')?.zone).toBe('field');
    expect(state.execution.frames).toHaveLength(0);
  });
});

describe('typed field-provider behavior', () => {
  it('grants power only to Fire Forwards controlled by Banner Smith', () => {
    const registry = createRegistry(opusPhFieldScripts, 'banner-smith-test');
    expect(checkRegistryCompleteness(registry)).toEqual([]);
    const h = fixture({ placements: [
      { seat: 0, card: 'P-012H', zone: 'field' },
      { seat: 0, card: 'P-005R', zone: 'field' },
      { seat: 1, card: 'P-026R', zone: 'field' },
    ] });
    const source = h.state.cards[h.state.field.find(instance => h.state.cards[instance]!.card === 'P-012H')!]!;
    const targets = bannerSmithScript.abilities[0]!.fieldEffects[0]!.effects(h.state, source, context.catalog);
    expect(targets).toEqual([{ kind: 'power', source: source.object, object: h.object(0, 'P-005R'), mode: 'add', value: 1000, expiresTurn: null }]);
  });
});

describe('typed replacement behavior', () => {
  it('reduces damage to Dawn Guardian by 1000 and never creates negative damage', () => {
    const registry = createRegistry(opusPhReplacementScripts, 'dawn-guardian-test');
    expect(checkRegistryCompleteness(registry)).toEqual([]);
    const h = fixture({ placements: [{ seat: 0, card: 'P-008H', zone: 'field' }] });
    const source = h.state.cards[h.state.field[0]!]!;
    const proposal = dawnGuardianScript.abilities[0]!.replacements[0]!.propose(h.state, {
      kind: 'forward-damage', source: 'damage-source', target: source.object, amount: 500,
    }, source);
    expect(proposal?.operation).toEqual({ kind: 'forward-damage', source: 'damage-source', target: source.object, amount: 0 });
    expect(replacementDamage(h.state, source.object, 500, { ...context, registry })).toBe(0);
    expect(replacementDamage(h.state, source.object, 4000, { ...context, registry })).toBe(3000);
  });
});

describe('typed entry abilities', () => {
  it('matches Dusk Reaver entry and emits its temporary power reduction', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-007H', zone: 'field' }, { seat: 0, card: 'P-005R', zone: 'field' },
    ] });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-007H')!;
    const target = h.object(0, 'P-005R');
    const event = { id: 'entry', type: 'character.cast', data: { card: source.card, seat: source.controller, source: source.object } };
    const ability = duskReaverScript.abilities[0]!;
    expect(ability.triggers[0]!.matches(h.state, event, source)).toBe(true);
    const resume = { script: 'P-007H', version: '1', ability: ability.id, step: 'resolve', payload: null };
    const output = createRegistry([duskReaverScript], 'dusk-reaver-test').resume(resume).run({ state: h.state,
      catalog: context.catalog, answer: null, frame: { id: 'entry', resume, mode: 'stack', controller: 0, source: source.object,
        lastKnown: { ...source }, targets: [target], selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: 0 },
        operationIndex: 0, scriptComplete: false } });
    expect(output.batches[0]?.operations).toEqual([{ kind: 'power', source: source.object, object: target,
      mode: 'add', value: -2000, expiresTurn: h.state.turn }]);
  });

  it('emits the dull-and-freeze operation for Frost Binder entry', () => {
    const h = fixture({ placements: [
      { seat: 1, card: 'P-025R', zone: 'field' }, { seat: 0, card: 'P-005R', zone: 'field' },
    ] });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-025R')!;
    const target = h.object(0, 'P-005R');
    const ability = frostBinderScript.abilities[0]!;
    const resume = { script: 'P-025R', version: '1', ability: ability.id, step: 'resolve', payload: null };
    const output = createRegistry([frostBinderScript], 'frost-binder-test').resume(resume).run({ state: h.state,
      catalog: context.catalog, answer: null, frame: { id: 'entry', resume, mode: 'stack', controller: 1, source: source.object,
        lastKnown: { ...source }, targets: [target], selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: 1 },
        operationIndex: 0, scriptComplete: false } });
    expect(output.batches[0]?.operations).toEqual([{ kind: 'status', object: target, dull: true, freeze: true }]);
  });
});

describe('typed Archive Keeper EX Burst', () => {
  it('supports decline and accepted draw-then-discard continuations', () => {
    const makeState = () => {
      const h = fixture({ placements: [
        { seat: 1, card: 'P-031R', zone: 'damage' }, { seat: 1, card: 'P-022C', zone: 'hand' },
      ], deckTop: { 1: ['P-023C'] } });
      const source = Object.values(h.state.cards).find(card => card.card === 'P-031R')!;
      const resume = { script: 'P-031R', version: '1', ability: 'archive-keeper-enter', step: 'resolve', payload: null };
      h.state.execution.frames.push({ id: 'archive-ex', resume, mode: 'ex', controller: 1, source: source.object,
        lastKnown: { ...source }, targets: [], selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: 1 },
        operationIndex: 0, scriptComplete: false });
      return { state: h.state, source, resume, engine: { ...context, registry: createRegistry([archiveKeeperScript], 'archive-keeper-test') } as EngineContext };
    };
    const skipped = makeState();
    expect(runScheduler(skipped.state, skipped.engine).error).toBeNull();
    expect(answer(skipped.state, skipped.engine, ['skip']).error).toBeNull();
    expect(skipped.state.zones[1].deck.map(id => skipped.state.cards[id]!.card)).toContain('P-023C');
    expect(skipped.state.execution.frames).toHaveLength(0);

    const accepted = makeState();
    expect(runScheduler(accepted.state, accepted.engine).error).toBeNull();
    expect(answer(accepted.state, accepted.engine, ['use']).error).toBeNull();
    expect(accepted.state.zones[1].hand.map(id => accepted.state.cards[id]!.card)).toContain('P-023C');
    expect(accepted.state.choice?.kind).toBe('cards');
    const drawn = Object.values(accepted.state.cards).find(card => card.card === 'P-023C')!;
    expect(answer(accepted.state, accepted.engine, [drawn.object]).error).toBeNull();
    expect(Object.values(accepted.state.cards).find(card => card.card === 'P-023C')?.zone).toBe('break');
    expect(accepted.state.execution.frames).toHaveLength(0);
  });
});

describe('typed departure triggers', () => {
  it('Cinder Witness matches a controlled Forward entering Break and deals 1000 damage', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-014R', zone: 'field' }, { seat: 0, card: 'P-005R', zone: 'field' }] });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-014R')!;
    const ability = cinderWitnessScript.abilities[0]!;
    const moved = { id: 'moved', type: 'card.moved', data: { type: 'Forward', from: 'field', to: 'break', controller: 0 } };
    expect(ability.triggers[0]!.matches(h.state, moved, source)).toBe(true);
    const target = h.object(0, 'P-005R');
    const resume = { script: 'P-014R', version: '1', ability: ability.id, step: 'resolve', payload: null };
    const output = createRegistry([cinderWitnessScript], 'cinder-witness-test').resume(resume).run({ state: h.state,
      catalog: context.catalog, answer: null, frame: { id: 'leave', resume, mode: 'stack', controller: 0, source: source.object,
        lastKnown: { ...source }, targets: [target], selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: 0 },
        operationIndex: 0, scriptComplete: false } });
    expect(output.batches[0]?.operations).toEqual([{ kind: 'forward-damage', source: source.object, target, amount: 1000 }]);
  });

  it('Tide Witness offers an optional draw after a controlled Forward leaves', () => {
    const h = fixture({ placements: [{ seat: 1, card: 'P-033R', zone: 'field' }] });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-033R')!;
    const ability = tideWitnessScript.abilities[0]!;
    const event = { id: 'leave', type: 'card.moved', data: { type: 'Forward', from: 'field', to: 'hand', controller: 1 } };
    expect(ability.triggers[0]!.matches(h.state, event, source)).toBe(true);
    const resume = { script: 'P-033R', version: '1', ability: ability.id, step: 'resolve', payload: null };
    const registry = createRegistry([tideWitnessScript], 'tide-witness-test');
    const frame = { id: 'leave', resume, mode: 'stack' as const, controller: 1 as const, source: source.object,
      lastKnown: { ...source }, targets: [], selectedMode: null, remaining: [], returnWindow: { kind: 'priority' as const, seat: 1 as const },
      operationIndex: 0, scriptComplete: false };
    const output = registry.resume(resume).run({ state: h.state, catalog: context.catalog, answer: null, frame });
    expect(output.choice?.kind).toBe('confirm');
    expect(output.choice?.options.map(option => option.id)).toEqual(['draw', 'skip']);
    const decision = { ...resume, step: 'decision' };
    const continuation = registry.resume(decision).run({ state: h.state, catalog: context.catalog, frame: { ...frame, resume: decision },
      answer: { choice: 'decision', selected: ['draw'], amounts: {} } });
    expect(continuation.batches).toEqual([{ simultaneous: false, operations: [{ kind: 'draw', seat: 1, count: 1 }] }]);
  });
});

describe('typed Tide Warden abilities', () => {
  it('registers its entry activation and Undertow special with the printed cost', () => {
    const registry = createRegistry([tideWardenScript], 'tide-warden-test');
    expect(checkRegistryCompleteness(registry)).toEqual([]);
    const entry = registry.ability('P-021L', 'tide-warden-enter');
    const special = registry.ability('P-021L', 'undertow');
    expect(special.cost).toMatchObject({ cp: 1, elements: ['Water'], dullSource: true, sameNameDiscard: true });
    const h = fixture({ placements: [
      { seat: 1, card: 'P-021L', zone: 'field' }, { seat: 0, card: 'P-005R', zone: 'field' },
    ] });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-021L')!;
    const target = h.object(0, 'P-005R');
    const event = { id: 'entry', type: 'character.cast', data: { card: source.card, seat: source.controller, source: source.object } };
    expect(entry.triggers[0]!.matches(h.state, event, source)).toBe(true);
    const entryResume = { script: 'P-021L', version: '1', ability: 'tide-warden-enter', step: 'resolve', payload: null };
    const entryOutput = registry.resume(entryResume).run({ state: h.state, catalog: context.catalog, answer: null, frame: {
      id: 'entry', resume: entryResume, mode: 'stack', controller: 1, source: source.object, lastKnown: { ...source }, targets: [target],
      selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: 1 }, operationIndex: 0, scriptComplete: false,
    } });
    expect(entryOutput.batches[0]?.operations).toEqual([{ kind: 'status', object: target, dull: false, freeze: false }]);
    const specialResume = { ...entryResume, ability: 'undertow' };
    const specialOutput = registry.resume(specialResume).run({ state: h.state, catalog: context.catalog, answer: null, frame: {
      id: 'undertow', resume: specialResume, mode: 'stack', controller: 1, source: source.object, lastKnown: { ...source }, targets: [target],
      selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: 1 }, operationIndex: 0, scriptComplete: false,
    } });
    expect(specialOutput.batches[0]?.operations).toEqual([{ kind: 'move', object: target, to: 'hand', index: null }]);
  });
});

describe('typed End Phase trigger', () => {
  it('matches only its controller End Phase and activates the chosen Forward', () => {
    const h = fixture({ placements: [
      { seat: 1, card: 'P-034R', zone: 'field' }, { seat: 1, card: 'P-026R', zone: 'field', dull: true },
    ] });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-034R')!;
    const target = h.object(1, 'P-026R');
    const ability = mistCallerScript.abilities[0]!;
    expect(ability.triggers[0]!.matches(h.state, { id: 'end', type: 'phase.started', data: { phase: 'end', active: 1 } }, source)).toBe(true);
    expect(ability.triggers[0]!.matches(h.state, { id: 'other', type: 'phase.started', data: { phase: 'end', active: 0 } }, source)).toBe(false);
    const resume = { script: 'P-034R', version: '1', ability: ability.id, step: 'resolve', payload: null };
    const output = createRegistry([mistCallerScript], 'mist-caller-test').resume(resume).run({ state: h.state,
      catalog: context.catalog, answer: null, frame: { id: 'mist-caller', resume, mode: 'stack', controller: 1, source: source.object,
        lastKnown: { ...source }, targets: [target], selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: 1 },
        operationIndex: 0, scriptComplete: false } });
    expect(output.batches[0]?.operations).toEqual([{ kind: 'status', object: target, dull: false, freeze: false }]);
  });
});

describe('typed last-known power trigger', () => {
  it('uses Night Regent effective power from its field-departure event', () => {
    const h = fixture({ placements: [
      { seat: 1, card: 'P-027H', zone: 'field' }, { seat: 1, card: 'P-026R', zone: 'field' },
    ] });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-027H')!;
    const target = h.object(1, 'P-026R');
    const ability = nightRegentScript.abilities[0]!;
    const event = { id: 'night-regent-left', type: 'card.moved', data: { object: source.object, card: source.card,
      type: 'Forward', from: 'field', to: 'break', controller: 1, power: 8000 } };
    expect(ability.triggers[0]!.matches(h.state, event, source)).toBe(true);
    const resume = { script: 'P-027H', version: '1', ability: ability.id, step: 'resolve', payload: 8000 };
    const output = createRegistry([nightRegentScript], 'night-regent-test').resume(resume).run({ state: h.state,
      catalog: context.catalog, answer: null, frame: { id: 'leave', resume, mode: 'stack', controller: 1, source: source.object,
        lastKnown: { ...source }, targets: [target], selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: 1 },
        operationIndex: 0, scriptComplete: false } });
    expect(output.batches[0]?.operations).toEqual([{ kind: 'power', source: source.object, object: target,
      mode: 'add', value: -8000, expiresTurn: h.state.turn }]);
  });
});

describe('typed Quartermaster search', () => {
  it('offers Soldier cards from the deck and moves the selected card before shuffling', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-011R', zone: 'field' }], deckTop: { 0: ['P-005R'] } });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-011R')!;
    const resume = { script: 'P-011R', version: '1', ability: 'quartermaster-enter', step: 'resolve', payload: null };
    h.state.execution.frames.push({ id: 'quartermaster', resume, mode: 'stack', controller: 0, source: source.object,
      lastKnown: { ...source }, targets: [], selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: 0 },
      operationIndex: 0, scriptComplete: false });
    const engine = { ...context, registry: createRegistry([quartermasterScript], 'quartermaster-test') } as EngineContext;
    expect(runScheduler(h.state, engine).error).toBeNull();
    const chosen = h.object(0, 'P-005R');
    expect(h.state.choice?.options.map(option => option.object)).toContain(chosen);
    expect(answer(h.state, engine, [chosen]).error).toBeNull();
    expect(Object.values(h.state.cards).find(card => card.card === 'P-005R')?.zone).toBe('hand');
    expect(h.state.execution.frames).toHaveLength(0);
  });
});
