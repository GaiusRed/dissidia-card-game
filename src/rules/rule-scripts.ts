import type { ResumeStep } from './contracts/execution';

const key = (ability: string, step: string) => `${ability}/${step}`;
const steps = new Map<string, ResumeStep>();

export const RULE_ENGINE_VERSION = '5';

export function registerRuleStep(ability: string, step: string, resolver: ResumeStep): void {
  if (!ability.trim() || !step.trim()) throw new Error('Rule script names are required.');
  const id = key(ability, step);
  if (steps.has(id)) throw new Error(`Duplicate rule step ${id}.`);
  steps.set(id, resolver);
}

export function resolveRuleStep(ability: string, step: string): ResumeStep {
  const resolver = steps.get(key(ability, step));
  if (!resolver) throw new Error(`Unknown rule continuation ${ability}/${step}.`);
  return resolver;
}
