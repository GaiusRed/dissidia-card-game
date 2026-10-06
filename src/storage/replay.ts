import { applyCommand } from '../rules/engine';
import type { EngineContext, MatchState } from '../rules/types';
import type { MatchSave } from './save';

export function replayTranscript(origin: MatchState, save: MatchSave, context: EngineContext): { state: MatchState; events: import('../rules/types').RuleEvent[] } {
  let state = JSON.parse(JSON.stringify(origin)) as MatchState;
  const events = [] as import('../rules/types').RuleEvent[];
  const commandIds = new Set<string>();
  for (const command of save.transcript) {
    if (commandIds.has(command.id)) throw new Error(`Replay contains duplicate command ID ${command.id}.`);
    commandIds.add(command.id);
    const result = applyCommand(state, command, context);
    if (!result.ok) throw new Error(`Replay stopped at sequence ${command.expectedSeq}: ${result.error.message}`);
    state = result.state;
    events.push(...result.events);
  }
  if (JSON.stringify(state) !== JSON.stringify(save.state)) throw new Error('Replay state does not match the saved state.');
  return { state, events };
}
export function replaySave(origin: MatchState, save: MatchSave, context: EngineContext): MatchState {
  return replayTranscript(origin, save, context).state;
}
