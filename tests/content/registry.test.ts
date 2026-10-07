import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { opusPh, opusPhRuntimeEffects } from '../../src/content/manifest';
import { createRegistry } from '../../src/content/registry';
import { abilityHandlers } from '../../src/content/handlers';
import type { CardScript, AbilityScript } from '../../src/rules/contracts/card-script';
import type { ResumeStep } from '../../src/rules/contracts/execution';

const step: ResumeStep = { payloadSchema: z.null(), run: () => ({ batches: [], choice: null, next: null }) };
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
  it('registers every printed action and Summon behavior from an owning card module', async () => {
    const { opusPhCards } = await import('../../src/content/manifest');
    const missing: string[] = [];
    for (const definition of opusPhCards) {
      for (const ability of definition.abilities) {
        if (ability.kind === 'field' || ability.kind === 'replacement') continue;
        if (!Object.hasOwn(abilityHandlers, ability.handler)) missing.push(`${definition.number}/${ability.handler}`);
      }
      if (definition.summonHandler) {
        if (!Object.hasOwn(abilityHandlers, definition.summonHandler)) missing.push(`${definition.number}/${definition.summonHandler}`);
      }
      if (definition.ex && (!definition.exHandler || !Object.hasOwn(abilityHandlers, definition.exHandler))) {
        missing.push(`${definition.number}/EX Burst handler`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('registers passive replacements and field providers from their card modules', () => {
    expect(opusPhRuntimeEffects['P-008H']?.replaceDamage).toBeTypeOf('function');
    expect(opusPhRuntimeEffects['P-012H']?.modifyPower).toBeTypeOf('function');
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
