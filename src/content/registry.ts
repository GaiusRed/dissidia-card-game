import type { CardRegistry, RegistryManifest } from '../rules/contracts/registry';
import type { CardScript } from '../rules/contracts/card-script';
import type { ResumeRef, ResumeStep } from '../rules/contracts/execution';

const key = (card: string, ability: string, step: string) => `${card}/${ability}/${step}`;

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
      for (const [step, handler] of Object.entries(ability.steps)) steps.set(key(number, ability.id, step), handler);
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
    if (card.metadata.summonHandler && !card.abilities.some(ability => ability.kind === 'summon' && Object.hasOwn(ability.steps, 'resolve'))) {
      errors.push(`${script.number} has no resolving Summon script.`);
    }
  }
  return errors;
}
