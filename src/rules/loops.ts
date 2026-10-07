import type { MatchState } from './types';

const generatedId = /^(frame|choice|stack|effect|delay|batch|object)-\d+$/;

/** Return a stable key for forced execution, ignoring counters and generated labels only. */
export function mandatoryStateKey(state: MatchState): string {
  const generated = new Map<string, string>();
  let nextGenerated = 0;
  const normalize = (value: unknown, root = false): unknown => {
    if (Array.isArray(value)) return value.map(item => normalize(item));
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(value)) {
        if (root && (key === 'seq' || key === 'nextId')) continue;
        result[key] = normalize(child);
      }
      return result;
    }
    if (typeof value === 'string' && generatedId.test(value)) {
      let normalized = generated.get(value);
      if (!normalized) {
        const prefix = value.slice(0, value.indexOf('-'));
        normalized = `${prefix}-cycle-${nextGenerated++}`;
        generated.set(value, normalized);
      }
      return normalized;
    }
    return value;
  };
  return JSON.stringify(normalize(state, true));
}
