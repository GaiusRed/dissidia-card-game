import { applyCommand } from '../rules/engine';
import type { EngineContext, MatchState } from '../rules/types';
import type { MatchSave } from './save';
import { canonicalValuesEqual, matchStatesEqual } from './origin';

export function replayTranscript(origin: MatchState, save: MatchSave, context: EngineContext,
  expectedReceipts?: MatchSave['receipts']): { state: MatchState; events: import('../rules/types').RuleEvent[] } {
  let state = JSON.parse(JSON.stringify(origin)) as MatchState;
  const events = [] as import('../rules/types').RuleEvent[];
  const commandIds = new Set<string>();
  if (expectedReceipts && expectedReceipts.length !== save.transcript.length) {
    throw new Error('Saved receipt ledger does not cover every accepted command.');
  }
  for (const [index, command] of save.transcript.entries()) {
    if (commandIds.has(command.id)) throw new Error(`Replay contains duplicate command ID ${command.id}.`);
    commandIds.add(command.id);
    const result = applyCommand(state, command, context);
    if (!result.ok) throw new Error(`Replay stopped at sequence ${command.expectedSeq}: ${result.error.message}`);
    const receipt = expectedReceipts?.[index];
    if (expectedReceipts && (!receipt || !canonicalValuesEqual(receipt.command, command) ||
        !matchStatesEqual(receipt.reply.state, result.state) || !canonicalValuesEqual(receipt.reply.events, result.events))) {
      throw new Error(`Saved receipt ledger does not match replay at sequence ${command.expectedSeq}.`);
    }
    state = result.state;
    events.push(...result.events);
  }
  if (!matchStatesEqual(state, save.state)) throw new Error('Replay state does not match the saved state.');
  return { state, events };
}
export function replaySave(origin: MatchState, save: MatchSave, context: EngineContext): MatchState {
  return replayTranscript(origin, save, context).state;
}
