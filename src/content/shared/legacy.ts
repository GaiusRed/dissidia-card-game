import type { AbilityHandler, Json, RuleEvent } from '../../rules/types';

export function payload(data: Json): { source?: string; targets?: string[] } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const row = data as Record<string, Json>;
  const result: { source?: string; targets?: string[] } = {};
  if (typeof row.source === 'string') result.source = row.source;
  if (Array.isArray(row.targets) && row.targets.every(item => typeof item === 'string')) result.targets = row.targets as string[];
  return result;
}

export function emit(state: Parameters<AbilityHandler>[0]['state'], type: string, data: RuleEvent['data']): RuleEvent {
  return { id: `event-${state.nextId++}`, type, data };
}

export function card(state: Parameters<AbilityHandler>[0]['state'], object: string) {
  return Object.values(state.cards).find(item => item.object === object);
}

export function result(events: RuleEvent[], choice: Parameters<AbilityHandler>[0]['state']['choice'] = null) {
  return { events, next: [], choice };
}
