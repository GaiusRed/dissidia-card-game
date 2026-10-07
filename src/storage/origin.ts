import { productionContext } from '../content/context';
import { mvpFormat } from '../rules/format';
import { createMatch } from '../rules/setup';
import type { MatchState } from '../rules/types';
import { loadScenario, scenarioCatalog } from '../scenarios/catalog';
import type { MatchOriginDescriptor } from './save';

export function canonicalJsonString(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJsonString).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJsonString(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? String(value);
}

export function canonicalValuesEqual(left: unknown, right: unknown): boolean {
  return canonicalJsonString(left) === canonicalJsonString(right);
}

export function matchStatesEqual(left: MatchState, right: MatchState): boolean {
  return canonicalValuesEqual(left, right);
}

export function reconstructOrigin(descriptor: MatchOriginDescriptor): MatchState {
  if (descriptor.kind === 'snapshot') throw new Error('The save origin cannot be verified from a snapshot descriptor.');
  if (descriptor.kind === 'normal') {
    return createMatch({ seed: descriptor.seed, decks: descriptor.decks, format: mvpFormat }, productionContext);
  }
  const scenario = scenarioCatalog.find(item => item.id === descriptor.id);
  if (!scenario || scenario.version !== descriptor.version) {
    throw new Error('The save origin scenario is unavailable or has changed version.');
  }
  return loadScenario(descriptor.id, productionContext);
}
