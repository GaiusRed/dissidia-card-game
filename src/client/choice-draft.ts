import type { MatchView } from '../host/protocol';
import type { Answer } from '../rules/types';

export interface ChoiceDraft {
  choiceId: string;
  selected: string[];
  amounts: Record<string, number>;
}

export function validateChoiceDraft(choice: MatchView['choice'], draft: ChoiceDraft): string[] {
  if (!choice) return ['There is no required choice to answer.'];
  if (draft.choiceId !== choice.id) return ['The required choice changed.'];
  const selected = draft.selected;
  if (new Set(selected).size !== selected.length || selected.some(id => !choice.options.some(option => option.id === id))) {
    return ['Select unique options from the current choice.'];
  }
  if (choice.kind === 'allocation') {
    const allocation = choice.allocation;
    const values = Object.entries(draft.amounts);
    if (selected.length > 0 || !allocation || values.some(([id, amount]) =>
      !choice.options.some(option => option.id === id) || !Number.isSafeInteger(amount) || amount < 0 || amount % allocation.increment !== 0) ||
      values.reduce((sum, [, amount]) => sum + amount, 0) !== allocation.total) {
      return ['Assign the full amount using the allowed options and increments.'];
    }
    return [];
  }
  if (Object.keys(draft.amounts).length > 0) return ['This choice does not accept allocation amounts.'];
  if (selected.length < choice.min || selected.length > choice.max) {
    return [`Select between ${choice.min} and ${choice.max} options.`];
  }
  return [];
}

export function choiceAnswer(draft: ChoiceDraft): Answer {
  return { choice: draft.choiceId, selected: [...draft.selected], amounts: { ...draft.amounts } };
}
