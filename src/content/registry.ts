import type { CardRegistry, RegistryManifest } from '../rules/contracts/registry';
import type { CardScript } from '../rules/contracts/card-script';
import type { ResumeRef, ResumeStep } from '../rules/contracts/execution';

const key = (card: string, ability: string, step: string) => `${card}/${ability}/${step}`;
const sameList = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((item, index) => item === right[index]);

function assertAbilityMetadataCost(script: CardScript, ability: CardScript['abilities'][number]): void {
  const { metadata } = script;
  const printed = metadata.abilities.find(item => item.id === ability.id);
  const activation = printed?.activation;
  const expected = activation
    ? { cp: activation.cost, elements: activation.elements, dullSource: activation.dullSource,
        sacrificeSource: activation.sacrificeSource, sameNameDiscard: activation.specialDiscardName !== null }
    : ability.kind === 'summon' && !ability.ex
      ? { cp: metadata.cost, elements: metadata.elements, dullSource: false, sacrificeSource: false, sameNameDiscard: false }
      : { cp: 0, elements: [] as readonly string[], dullSource: false, sacrificeSource: false, sameNameDiscard: false };
  const actual = ability.cost;
  if (actual.cp !== expected.cp || !sameList(actual.elements, expected.elements) ||
      actual.dullSource !== expected.dullSource || actual.sacrificeSource !== expected.sacrificeSource ||
      actual.sameNameDiscard !== expected.sameNameDiscard) {
    throw new Error(`Cost mismatch for ${metadata.number}/${ability.id}.`);
  }
  if (printed && (printed.kind !== ability.kind || printed.ex !== ability.ex)) {
    throw new Error(`Printed ability mismatch for ${metadata.number}/${ability.id}.`);
  }
  if (ability.ex && (actual.cp !== 0 || actual.elements.length !== 0 || actual.dullSource ||
      actual.sacrificeSource || actual.sameNameDiscard)) {
    throw new Error(`EX ability ${metadata.number}/${ability.id} cannot require a payment cost.`);
  }
}

function assertSummonTargets(script: CardScript, ability: CardScript['abilities'][number]): void {
  if (ability.kind !== 'summon') return;
  const printed = script.metadata.summonTarget;
  if (!printed || script.metadata.type !== 'Summon' ||
      ability.targets.min !== printed.min || ability.targets.max !== printed.max) {
    throw new Error(`Target mismatch for ${script.metadata.number}/${ability.id}.`);
  }
  const printedModes = (printed.modes ?? []).map(mode => `${mode.id}:${mode.label}`);
  const scriptModes = ability.modes.map(mode => `${mode.id}:${mode.label}`);
  if (!sameList(printedModes, scriptModes)) throw new Error(`Mode mismatch for ${script.metadata.number}/${ability.id}.`);
}

function assertActivationTargets(script: CardScript, ability: CardScript['abilities'][number]): void {
  const printed = script.metadata.abilities.find(item => item.id === ability.id);
  if (printed?.activation && (ability.targets.min !== 1 || ability.targets.max !== 1)) {
    throw new Error(`Target mismatch for ${script.metadata.number}/${ability.id}.`);
  }
}

export function createRegistry(scripts: readonly CardScript[], id: string): CardRegistry {
  if (!id.trim()) throw new Error('Registry ID is required.');
  const cards = new Map<string, CardScript>();
  const steps = new Map<string, ResumeStep>();
  const manifestCards: { number: string; contentVersion: string; behaviorVersion: string }[] = [];
  for (const script of scripts) {
    const number = script.metadata.number;
    if (cards.has(number)) throw new Error(`Duplicate card number ${number}.`);
    if (!script.behaviorVersion.trim() || !script.metadata.version.trim() || !script.metadata.name.trim() ||
        script.metadata.cost < 0 || !Number.isSafeInteger(script.metadata.cost) || script.metadata.elements.length === 0) {
      throw new Error(`Invalid metadata for ${number}.`);
    }
    const abilityIds = new Set<string>();
    for (const ability of script.abilities) {
      if (abilityIds.has(ability.id)) throw new Error(`Duplicate ability ID ${number}/${ability.id}.`);
      abilityIds.add(ability.id);
      if (!Object.hasOwn(ability.steps, 'resolve')) throw new Error(`Missing resolve step for ${number}/${ability.id}.`);
      assertAbilityMetadataCost(script, ability);
      assertActivationTargets(script, ability);
      assertSummonTargets(script, ability);
      for (const [step, handler] of Object.entries(ability.steps)) steps.set(key(number, ability.id, step), handler);
    }
    if (script.metadata.type === 'Summon' && script.abilities.filter(ability => ability.kind === 'summon').length !== 1) {
      throw new Error(`Missing Summon ability for ${number}.`);
    }
    for (const ability of script.metadata.abilities) {
      if (!abilityIds.has(ability.id)) throw new Error(`Unresolved printed ability ${number}/${ability.id}.`);
    }
    if (script.metadata.ex && !script.abilities.some(ability => ability.ex)) {
      throw new Error(`Missing EX ability for ${number}.`);
    }
    cards.set(number, script);
    manifestCards.push({ number, contentVersion: script.metadata.version, behaviorVersion: script.behaviorVersion });
  }
  manifestCards.sort((a, b) => a.number.localeCompare(b.number));
  const manifest: RegistryManifest = { id, cards: manifestCards };
  const catalog = Object.fromEntries([...cards].map(([number, script]) => [number, script.metadata]));
  return {
    manifest, catalog,
    card(number) {
      const script = cards.get(number);
      if (!script) throw new Error(`Unknown card ${number}.`);
      return script;
    },
    ability(number, ability) {
      const script = cards.get(number);
      const found = script?.abilities.find(item => item.id === ability);
      if (!found) throw new Error(`Unknown ability ${number}/${ability}.`);
      return found;
    },
    resume(ref: ResumeRef) {
      if (cards.get(ref.script)?.behaviorVersion !== ref.version) throw new Error(`Incompatible behavior version for ${ref.script}.`);
      const step = steps.get(key(ref.script, ref.ability, ref.step));
      if (!step) throw new Error(`Unknown resume step ${ref.script}/${ref.ability}/${ref.step}.`);
      const checked = step.payloadSchema.safeParse(ref.payload);
      if (!checked.success) throw new Error(`Invalid payload for ${ref.script}/${ref.ability}/${ref.step}.`);
      return step;
    },
  };
}

export function checkRegistryCompleteness(registry: CardRegistry): string[] {
  const errors: string[] = [];
  for (const script of registry.manifest.cards) {
    const card = registry.card(script.number);
    for (const printed of card.metadata.abilities) {
      if (!card.abilities.some(ability => ability.id === printed.id && Object.hasOwn(ability.steps, 'resolve'))) {
        errors.push(`${script.number}/${printed.id} has no resolving card script.`);
      }
    }
    if (card.metadata.type === 'Summon' && !card.abilities.some(ability => ability.kind === 'summon' && Object.hasOwn(ability.steps, 'resolve'))) {
      errors.push(`${script.number} has no resolving Summon script.`);
    }
  }
  return errors;
}
