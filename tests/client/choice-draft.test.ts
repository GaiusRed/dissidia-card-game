import { describe, expect, it } from 'vitest';
import { choiceAnswer, validateChoiceDraft, type ChoiceDraft } from '../../src/client/choice-draft';
import type { MatchView } from '../../src/host/protocol';

function choice(overrides: Partial<NonNullable<MatchView['choice']>> = {}): NonNullable<MatchView['choice']> {
  return { id: 'choice-1', seat: 0, kind: 'cards', reason: 'Choose cards.',
    options: [{ id: 'a', label: 'A', object: null }, { id: 'b', label: 'B', object: null }, { id: 'c', label: 'C', object: null }],
    min: 2, max: 2, allocation: null, ...overrides };
}

describe('local choice drafts', () => {
  it('requires the configured number of unique legal cards', () => {
    const pending = choice();
    expect(validateChoiceDraft(pending, { choiceId: pending.id, selected: ['a'], amounts: {} })).not.toEqual([]);
    expect(validateChoiceDraft(pending, { choiceId: pending.id, selected: ['a', 'a'], amounts: {} })).not.toEqual([]);
    expect(validateChoiceDraft(pending, { choiceId: pending.id, selected: ['a', 'b'], amounts: {} })).toEqual([]);
  });

  it('allows an optional zero-selection choice', () => {
    const pending = choice({ min: 0, max: 1, kind: 'confirm' });
    expect(validateChoiceDraft(pending, { choiceId: pending.id, selected: [], amounts: {} })).toEqual([]);
  });

  it('validates allocation keys, increments, and exact totals', () => {
    const pending = choice({ kind: 'allocation', min: 0, max: 0, allocation: { total: 6000, increment: 1000 } });
    expect(validateChoiceDraft(pending, { choiceId: pending.id, selected: [], amounts: { a: 3000, b: 3000 } })).toEqual([]);
    expect(validateChoiceDraft(pending, { choiceId: pending.id, selected: [], amounts: { a: 5000 } })).not.toEqual([]);
    expect(validateChoiceDraft(pending, { choiceId: pending.id, selected: [], amounts: { a: 6500 } })).not.toEqual([]);
    expect(validateChoiceDraft(pending, { choiceId: pending.id, selected: [], amounts: { unknown: 6000 } })).not.toEqual([]);
  });

  it('copies draft selections and amounts into one answer for the current choice', () => {
    const draft: ChoiceDraft = { choiceId: 'choice-1', selected: ['b', 'a'], amounts: { b: 2000 } };
    const answer = choiceAnswer(draft);
    expect(answer).toEqual({ choice: 'choice-1', selected: ['b', 'a'], amounts: { b: 2000 } });
    answer.selected.push('c');
    answer.amounts.b = 3000;
    expect(draft).toEqual({ choiceId: 'choice-1', selected: ['b', 'a'], amounts: { b: 2000 } });
  });
});
