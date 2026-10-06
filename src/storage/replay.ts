import { applyCommand } from '../rules/engine';
import type { EngineContext, MatchState } from '../rules/types';
import type { MatchSave } from './save';

export function replayTranscript(origin: MatchState, save: MatchSave, context: EngineContext): { state: MatchState; events: import('../rules/types').RuleEvent[] } {
  let state = JSON.parse(JSON.stringify(origin)) as MatchState;
  const events = [] as import('../rules/types').RuleEvent[];
  for (const command of save.transcript) {
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
