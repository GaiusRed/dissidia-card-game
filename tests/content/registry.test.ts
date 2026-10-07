import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { opusPh, opusPhActionScripts, opusPhRegisteredScripts, opusPhRegistry, opusPhSummonScripts, opusPhVanillaScripts } from '../../src/content/manifest';
import { productionContext } from '../../src/content/context';
import { checkRegistryCompleteness, createRegistry } from '../../src/content/registry';
import type { CardScript, AbilityScript } from '../../src/rules/contracts/card-script';
import type { ResumeStep } from '../../src/rules/contracts/execution';
import { fixture, context } from '../support/harness';
import { moveCard } from '../../src/rules/zones';
import type { Seat } from '../../src/rules/types';

const step: ResumeStep = { payloadSchema: z.null(), run: () => ({ batches: [], choice: null, next: null }) };
function runTypedSummon(number: string, ability: string, target: string | string[], selectedMode: string | null = null) {
  const cardScript = opusPhSummonScripts.find(script => script.metadata.number === number);
  if (!cardScript) throw new Error(`Missing typed script for ${number}`);
  const registry = createRegistry([cardScript], `${number}-test`);
  const seat = cardScript.metadata.elements.includes('Water') ? 1 : 0;
  const source = fixture({ placements: [{ seat, card: number, zone: 'hand' }] });
  const physical = Object.values(source.state.cards).find(card => card.card === number)!;
  const lastKnown = moveCard(source.state, physical.instance, 'stack');
  const resume = { script: number, version: cardScript.behaviorVersion, ability, step: 'resolve', payload: null };
  return registry.resume(resume).run({ state: source.state, catalog: context.catalog, answer: null, frame: {
    id: `frame-${number}`, resume, mode: 'stack', controller: seat,
    source: source.state.cards[physical.instance]!.object, lastKnown, targets: Array.isArray(target) ? target : [target], selectedMode,
    remaining: [], returnWindow: { kind: 'priority', seat }, operationIndex: 0, scriptComplete: false,
  } });
}
function card(number: string, abilitySteps: Record<string, ResumeStep> = {}): CardScript {
  const metadata = opusPh[number]!;
  const abilities: AbilityScript[] = metadata.abilities.map(printed => ({
    id: printed.id, kind: printed.kind, text: printed.text, ex: printed.ex, zones: ['field'],
    cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
    modes: [], targets: { min: 0, max: 0, distinct: true, accepts: () => true },
    triggers: [], fieldEffects: [], replacements: [], steps: abilitySteps,
  }));
  return { metadata, behaviorVersion: '1', abilities };
}

describe('explicit card registry', () => {
  it('combines every currently migrated card module into one duplicate-free registry', () => {
    expect(opusPhRegisteredScripts).toHaveLength(40);
    expect(new Set(opusPhRegisteredScripts.map(script => script.metadata.number)).size).toBe(40);
    expect(opusPhRegisteredScripts.map(script => script.metadata.number).sort()).toEqual(Object.keys(opusPh).sort());
    const registry = createRegistry(opusPhRegisteredScripts, 'opus-ph-migrated-v1');
    expect(checkRegistryCompleteness(registry)).toEqual([]);
  });

  it('exports the complete production card registry and context', () => {
    expect(opusPhRegistry.manifest.cards).toHaveLength(40);
    expect(productionContext.catalog).toBe(opusPhRegistry.catalog);
    expect(productionContext.registry).toBe(opusPhRegistry);
    expect(checkRegistryCompleteness(opusPhRegistry)).toEqual([]);
  });

  it('aligns typed activation and Summon costs with printed card declarations', () => {
    for (const script of opusPhRegisteredScripts) for (const ability of script.abilities) {
      const printed = script.metadata.abilities.find(item => item.id === ability.id);
      if (printed?.activation) {
        expect(ability.cost).toMatchObject({ cp: printed.activation.cost, elements: printed.activation.elements,
          dullSource: printed.activation.dullSource, sacrificeSource: printed.activation.sacrificeSource,
          sameNameDiscard: printed.activation.specialDiscardName !== null });
      }
      if (ability.kind === 'summon') {
        expect(ability.cost).toMatchObject({ cp: script.metadata.cost, elements: script.metadata.elements });
      }
    }
  });

  it('migrates vanilla and keyword-only cards through their exported typed scripts', () => {
    const registry = createRegistry(opusPhVanillaScripts, 'opus-ph-vanilla-v1');
    expect(opusPhVanillaScripts).toHaveLength(12);
    expect(checkRegistryCompleteness(registry)).toEqual([]);
    expect(registry.card('P-005R').metadata.keywords).toContain('Haste');
    expect(registry.card('P-006R').metadata.keywords).toContain('First Strike');
    expect(registry.card('P-003C').metadata.generic).toBe(true);
  });

  it('declares Final Spark as a typed operation script', () => {
    const registry = createRegistry(opusPhSummonScripts.filter(script => script.metadata.number === 'P-019H'), 'final-spark-test');
    const script = registry.card('P-019H');
    const source = fixture({ placements: [{ seat: 0, card: 'P-019H', zone: 'hand' }] });
    const physical = Object.values(source.state.cards).find(card => card.card === 'P-019H')!;
    const lastKnown = moveCard(source.state, physical.instance, 'stack');
    const resume = { script: 'P-019H', version: '1', ability: 'final-spark', step: 'resolve', payload: null };
    const step = registry.resume(resume);
    const output = step.run({ state: source.state, catalog: context.catalog, answer: null, frame: {
      id: 'frame-final-spark', resume, mode: 'stack', controller: 0, source: source.state.cards[physical.instance]!.object,
      lastKnown, targets: [], selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: 0 },
      operationIndex: 0, scriptComplete: false,
    } });
    expect(script.abilities[0]?.kind).toBe('summon');
    expect(output).toMatchObject({ choice: null, next: null, batches: [{ simultaneous: false, operations: [
      { kind: 'player-damage', seat: 1, amount: 2 },
    ] }] });
  });

  it('declares Rising Undertow draw and delayed work as typed operations', () => {
    const registry = createRegistry(opusPhSummonScripts.filter(script => script.metadata.number === 'P-040R'), 'undertow-test');
    const source = fixture({ placements: [{ seat: 1, card: 'P-040R', zone: 'hand' }] });
    const physical = Object.values(source.state.cards).find(card => card.card === 'P-040R')!;
    const lastKnown = moveCard(source.state, physical.instance, 'stack');
    const resume = { script: 'P-040R', version: '1', ability: 'rising-undertow', step: 'resolve', payload: null };
    const output = registry.resume(resume).run({ state: source.state, catalog: context.catalog, answer: null, frame: {
      id: 'frame-undertow', resume, mode: 'stack', controller: 1, source: source.state.cards[physical.instance]!.object,
      lastKnown, targets: [], selectedMode: null, remaining: [],
      returnWindow: { kind: 'priority', seat: 1 }, operationIndex: 0, scriptComplete: false,
    } });
    expect(output.batches).toEqual([{ simultaneous: false, operations: [
      { kind: 'draw', seat: 1, count: 2 },
      { kind: 'delay', at: 'controller-end', controller: 1, source: source.state.cards[physical.instance]!.object,
        resume: { script: 'rules', version: '4', ability: 'delayed-discard', step: 'resolve', payload: { seat: 1 } } },
    ] }]);
  });

  it('emits typed power and keyword operations for Guarding Current and Shape Tide', () => {
    const warCry = runTypedSummon('P-017R', 'war-cry', 'target-forward');
    expect(warCry.batches[0]?.operations).toMatchObject([
      { kind: 'power', object: 'target-forward', mode: 'add', value: 3000 },
      { kind: 'keyword', object: 'target-forward', keyword: 'Brave' },
    ]);
    const guard = runTypedSummon('P-037R', 'guarding-current', 'target-forward');
    expect(guard.batches).toEqual([{ simultaneous: false, operations: [
      { kind: 'power', source: expect.any(String), object: 'target-forward', mode: 'add', value: 2000, expiresTurn: expect.any(Number) },
      { kind: 'keyword', source: expect.any(String), object: 'target-forward', keyword: 'First Strike', expiresTurn: expect.any(Number) },
    ] }]);
    const shape = runTypedSummon('P-038R', 'shape-tide', 'target-forward');
    expect(shape.batches[0]?.operations[0]).toMatchObject({
      kind: 'power', object: 'target-forward', mode: 'base', value: 4000, expiresTurn: expect.any(Number),
    });
    const verdict = runTypedSummon('P-018R', 'ashen-verdict', 'target-forward');
    expect(verdict.batches).toEqual([{ simultaneous: true, operations: [
      { kind: 'move', object: 'target-forward', to: 'break', index: null },
    ] }]);
    const twin = runTypedSummon('P-016R', 'twin-embers', ['target-a', 'target-b']);
    expect(twin.batches).toEqual([{ simultaneous: true, operations: [
      { kind: 'forward-damage', source: expect.any(String), target: 'target-a', amount: 3000 },
      { kind: 'forward-damage', source: expect.any(String), target: 'target-b', amount: 3000 },
    ] }]);
    const banner = runTypedSummon('P-039H', 'borrowed-banner', 'opponent-character');
    expect(banner.batches[0]?.operations[0]).toMatchObject({
      kind: 'control', object: 'opponent-character', controller: 1, expiresTurn: expect.any(Number),
    });
  });

  it('turns Stillwater cancellation into a generic stack operation', () => {
    const script = opusPhSummonScripts.find(item => item.metadata.number === 'P-036R')!;
    const registry = createRegistry([script], 'stillwater-test');
    const h = fixture({ placements: [
      { seat: 1, card: 'P-036R', zone: 'hand' }, { seat: 0, card: 'P-015C', zone: 'hand' },
    ] });
    const stillwater = Object.values(h.state.cards).find(card => card.card === 'P-036R')!;
    const summon = Object.values(h.state.cards).find(card => card.card === 'P-015C')!;
    const lastKnown = moveCard(h.state, stillwater.instance, 'stack');
    const summonLki = moveCard(h.state, summon.instance, 'stack');
    const stackItem = { id: 'stack-scorch', controller: 0 as const, source: h.state.cards[summon.instance]!.object,
      lastKnown: summonLki, handler: 'scorch', targets: [], mode: null, data: null };
    h.state.stack.push(stackItem);
    const resume = { script: 'P-036R', version: '1', ability: 'stillwater', step: 'resolve', payload: null };
    const output = registry.resume(resume).run({ state: h.state, catalog: context.catalog, answer: null, frame: {
      id: 'frame-stillwater', resume, mode: 'stack', controller: 1,
      source: h.state.cards[stillwater.instance]!.object, lastKnown, targets: [stackItem.source], selectedMode: null,
      remaining: [], returnWindow: { kind: 'priority', seat: 1 }, operationIndex: 0, scriptComplete: false,
    } });
    expect(output.batches).toEqual([{ simultaneous: false, operations: [{ kind: 'cancel-stack', item: stackItem.id }] }]);
  });

  it('registers every printed action and Summon behavior as schema-checked script steps', async () => {
    const { opusPhCards } = await import('../../src/content/manifest');
    expect(checkRegistryCompleteness(opusPhRegistry)).toEqual([]);
    expect(opusPhRegistry.manifest.cards).toHaveLength(opusPhCards.length);
    for (const definition of opusPhCards) {
      expect(opusPhRegistry.card(definition.number).metadata).toBe(definition);
    }
  });

  it('registers passive replacements and field providers from their card modules', () => {
    expect(opusPhRegistry.card('P-008H').abilities.some(ability => ability.replacements.length > 0)).toBe(true);
    expect(opusPhRegistry.card('P-012H').abilities.some(ability => ability.fieldEffects.length > 0)).toBe(true);
  });

  it('declares Summon targets, counts, zones, and modes in card metadata', async () => {
    const { opusPhCards } = await import('../../src/content/manifest');
    const summons = opusPhCards.filter(definition => definition.summonHandler !== null);
    expect(summons).toHaveLength(12);
    for (const definition of summons) {
      expect(definition.summonTarget, definition.number).toBeDefined();
      expect(Number.isSafeInteger(definition.summonTarget?.min)).toBe(true);
      expect(Number.isSafeInteger(definition.summonTarget?.max)).toBe(true);
      expect(definition.summonTarget!.min).toBeLessThanOrEqual(definition.summonTarget!.max);
      for (const mode of definition.summonTarget!.modes ?? []) expect(mode.id.trim()).not.toBe('');
    }
  });

  it('rejects duplicate card numbers and printed abilities without scripts', () => {
    const plain = card('P-003C');
    expect(() => createRegistry([plain, plain], 'test')).toThrow('Duplicate card number');
    expect(() => createRegistry([{ ...card('P-001L'), abilities: [] }], 'test')).toThrow('Unresolved printed ability');
  });

  it('pins behavior versions and resolves checked named steps', () => {
    const registry = createRegistry([card('P-001L', { resolve: step })], 'fixture-v1');
    expect(registry.manifest.cards).toEqual([{ number: 'P-001L', contentVersion: 'opus-ph-v1', behaviorVersion: '1' }]);
    expect(registry.resume({ script: 'P-001L', version: '1', ability: 'flare-order', step: 'resolve', payload: null })).toBe(step);
    expect(() => registry.resume({ script: 'P-001L', version: 'old', ability: 'flare-order', step: 'resolve', payload: null })).toThrow('Incompatible behavior version');
  });

  it('requires a resolving step for each registered ability', () => {
    expect(() => createRegistry([card('P-001L', { declare: step })], 'test')).toThrow('Missing resolve step');
  });
});

  it('exports typed scripts for every Summon, including mode and EX behavior', () => {
    expect(opusPhSummonScripts).toHaveLength(12);
    const registry = createRegistry(opusPhSummonScripts, 'opus-ph-summons-v1');
    expect(checkRegistryCompleteness(registry)).toEqual([]);
    expect(registry.card('P-015C').abilities.map(ability => ability.id)).toEqual(['scorch', 'scorch-ex-burst']);
    expect(registry.card('P-020H').abilities[0]?.modes.map(mode => mode.id)).toEqual(['backup', 'forward']);
    expect(registry.card('P-035C').abilities.map(ability => ability.id)).toEqual(['return-tide', 'return-tide-ex-burst']);
    expect(runTypedSummon('P-015C', 'scorch', 'target-forward').batches[0]?.operations).toEqual([
      { kind: 'forward-damage', source: expect.any(String), target: 'target-forward', amount: 4000 },
    ]);
    expect(runTypedSummon('P-020H', 'controlled-burn', 'target-backup', 'backup').batches[0]?.operations).toEqual([
      { kind: 'move', object: 'target-backup', to: 'break', index: null },
    ]);
    expect(runTypedSummon('P-020H', 'controlled-burn', 'target-forward', 'forward').batches[0]?.operations).toEqual([
      { kind: 'move', object: 'target-forward', to: 'removed', index: null },
    ]);
    expect(runTypedSummon('P-035C', 'return-tide', 'target-forward').batches[0]?.operations).toEqual([
      { kind: 'move', object: 'target-forward', to: 'hand', index: null },
    ]);
  });

  it('registers typed actions and specials for migrated cards', () => {
    expect(opusPhActionScripts.map(script => script.metadata.number)).toEqual(['P-001L', 'P-010C', 'P-013R', 'P-021L', 'P-030C', 'P-032R']);
    for (const script of opusPhActionScripts) expect(checkRegistryCompleteness(createRegistry([script], `${script.metadata.number}-action`))).toEqual([]);
    const script = opusPhActionScripts[0]!;
    const registry = createRegistry([script], 'cinder-marshal-test');
    const h = fixture({ placements: [{ seat: 1, card: 'P-022C', zone: 'field' }] });
    const source = h.object(0, 'P-001L');
    const target = h.object(1, 'P-022C');
    const sourceLki = Object.values(h.state.cards).find(item => item.object === source)!;
    const resume = { script: 'P-001L', version: '1', ability: 'flare-order', step: 'resolve', payload: null };
    const output = registry.resume(resume).run({ state: h.state, catalog: context.catalog, answer: null, frame: {
      id: 'flare-order', resume, mode: 'stack', controller: 0, source, lastKnown: sourceLki, targets: [target], selectedMode: null,
      remaining: [], returnWindow: { kind: 'priority', seat: 0 }, operationIndex: 0, scriptComplete: false,
    } });
    expect(output.batches).toEqual([{ simultaneous: false, operations: [
      { kind: 'forward-damage', source, target, amount: 7000 },
    ] }]);
    const cases = [
      { number: 'P-010C', targetCard: 'P-005R', zone: 'field', operation: { kind: 'power', mode: 'add', value: 1000 } },
      { number: 'P-013R', targetCard: 'P-005R', zone: 'break', operation: { kind: 'move', to: 'hand', index: null } },
      { number: 'P-030C', targetCard: 'P-005R', zone: 'field', operation: { kind: 'status', dull: false, freeze: false } },
      { number: 'P-032R', targetCard: 'P-022C', zone: 'break', operation: { kind: 'move', to: 'deck' } },
    ] as const;
    for (const item of cases) {
      const action = opusPhActionScripts.find(candidate => candidate.metadata.number === item.number)!;
      const actionRegistry = createRegistry([action], `${item.number}-behavior`);
      const actorSeat: Seat = item.number === 'P-030C' || item.number === 'P-032R' ? 1 : 0;
      const targetSeat: Seat = item.number === 'P-030C' ? 0 : actorSeat;
      const placements = [{ seat: actorSeat, card: item.number, zone: 'field' as const },
        { seat: targetSeat, card: item.targetCard, zone: item.zone }];
      const state = fixture({ placements });
      const actor = state.object(actorSeat, item.number);
      const chosen = state.object(targetSeat, item.targetCard);
      const actorSnapshot = Object.values(state.state.cards).find(card => card.object === actor)!;
      const ref = { script: item.number, version: '1', ability: action.metadata.abilities[0]!.id, step: 'resolve', payload: null };
      const result = actionRegistry.resume(ref).run({ state: state.state, catalog: context.catalog, answer: null, frame: {
        id: `${item.number}-activation`, resume: ref, mode: 'stack', controller: actorSeat, source: actor,
        lastKnown: actorSnapshot, targets: [chosen], selectedMode: null, remaining: [],
        returnWindow: { kind: 'priority', seat: actorSeat }, operationIndex: 0, scriptComplete: false,
      } });
      expect(result.batches[0]?.operations[0]).toMatchObject({ ...item.operation, object: chosen });
      if (item.number === 'P-032R') expect(result.batches[0]?.operations[0]).toMatchObject({ index: expect.any(Number) });
      if (item.number === 'P-010C') expect(result.batches[0]?.operations[0]).toMatchObject({ source: actor, expiresTurn: state.state.turn });
    }
  });
