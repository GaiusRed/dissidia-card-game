import { expect } from 'vitest';
import type { MatchState } from '../../src/rules/types';

export function assertStable(state: MatchState): void {
  if (state.result) return;
  if (state.choice) {
    expect(state.priority).toBeNull();
    expect([0, 1]).toContain(state.choice.seat);
  } else if (state.priority === null) {
    throw new Error('Live match must have a priority actor or a required choice.');
  }
}
