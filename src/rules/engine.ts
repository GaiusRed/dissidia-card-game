import { commandSchema } from './codec';
import { castCharacter, castSummon } from './casting';
import { declareAttack, declareBlock } from './combat';
import { activateAbility } from './activation';
import { assertInvariants } from './invariants';
import { checkOutcomes } from './outcomes';
import { openTriggerOrder, passPriority, runEndCheckpoint } from './priority';
import { runRuleCheckpoint } from './checkpoints';
import { continueDamageEx } from './damage';
import { resumeChoice, runScheduler } from './scheduler';
import { openTriggerTargetChoice } from './triggers';
import type { Command, EngineContext, MatchState, RuleError, RuleEvent, Transition } from './types';
export { describeCastAccess, legalActions } from './actions';

function copyState(state: MatchState): MatchState {
  return JSON.parse(JSON.stringify(state)) as MatchState;
}
const rejected = (state: MatchState, code: string, message: string): Transition => ({
  ok: false, state, error: { code, message }, events: [],
});
function event(state: MatchState, type: string, data: RuleEvent['data']): RuleEvent {
  return { id: 'event-' + state.nextId++, type, data };
}
function firstError(errors: RuleError[]): RuleError | null { return errors[0] ?? null; }

export function applyCommand(state: MatchState, command: Command, context: EngineContext): Transition {
  const parsed = commandSchema.safeParse(command);
  if (!parsed.success) return rejected(state, 'INVALID_COMMAND', 'The command has an invalid shape.');
  if (command.expectedSeq !== state.seq) return rejected(state, 'STALE_SEQUENCE', 'The game state changed. Use the current view and try again.');
  if (state.result) return rejected(state, 'GAME_OVER', 'This match has already ended.');
  const intent = command.intent;
  if (intent.kind !== 'concede' && state.choice && intent.kind !== 'answer') {
    return rejected(state, 'DECISION_REQUIRED', 'Resolve the open decision before taking another action.');
  }

  const draft = copyState(state);
  const events: RuleEvent[] = [];
  let failure: RuleError | null = null;
  try {
    switch (intent.kind) {
      case 'concede':
        draft.result = { winner: command.seat === 0 ? 1 : 0, reason: 'concede' };
        draft.choice = null;
        draft.priority = null;
        draft.work = [];
        events.push(event(draft, 'game.conceded', { seat: command.seat, winner: draft.result.winner }));
        break;
      case 'answer': {
        const answer = intent.answer;
        const pending = draft.choice;
        if (!pending || pending.id !== answer.choice) {
          failure = { code: 'STALE_CHOICE', message: 'That decision is no longer open.' };
          break;
        }
        if (pending.seat !== command.seat) {
          failure = { code: 'WRONG_ACTOR', message: 'The other player must make this decision.' };
          break;
        }
        const resumed = resumeChoice(draft, answer, context);
        failure = resumed.error;
        events.push(...resumed.events);
        if (!failure) events.push(event(draft, 'choice.answered', { seat: command.seat }));
        break;
      }
      case 'cast': {
        const card = Object.values(draft.cards).find(item => item.object === intent.source);
        if (!card) { failure = { code: 'UNKNOWN_SOURCE', message: 'That card has changed zones.' }; break; }
        const definition = context.catalog[card.card];
        if (!definition) { failure = { code: 'UNKNOWN_CARD', message: 'The card has no catalog definition.' }; break; }
        const taxPaid = card.zone === 'commander' ? draft.commanders[command.seat].casts * 2 : 0;
        failure = firstError(definition.type === 'Summon'
          ? castSummon(draft, command.seat, intent.source, intent.targets, intent.mode, intent.payment, context)
          : castCharacter(draft, command.seat, intent.source, intent.payment, context));
        if (!failure) {
          const entered = draft.cards[card.instance]!;
          events.push(event(draft, definition.type === 'Summon' ? 'summon.cast' : 'character.cast', {
            card: definition.number, sourceZone: card.zone, tax: taxPaid, seat: command.seat, source: entered.object,
          }));
        }
        break;
      }
      case 'pass':
        if (draft.priority !== command.seat) failure = { code: 'WRONG_PRIORITY', message: 'Only the player with priority can pass.' };
        else {
          const priorityEvents = passPriority(draft, context);
          events.push(...priorityEvents);
        }
        break;
      case 'attack':
        failure = firstError(declareAttack(draft, command.seat, intent.members, context));
        if (!failure) events.push(event(draft, 'combat.attack-declared', { seat: command.seat, attackers: intent.members }));
        break;
      case 'block':
        failure = firstError(declareBlock(draft, command.seat, intent.blocker, context));
        if (!failure) events.push(event(draft, 'combat.block-declared', { seat: command.seat, blocker: intent.blocker }));
        break;
      case 'activate':
        {
          const activation = activateAbility(draft, command.seat, intent.source, intent.ability, intent.targets, intent.payment, context);
          failure = firstError(activation.errors);
          if (!failure) {
            events.push(...activation.events);
            events.push(event(draft, 'ability.activated', { ability: intent.ability, source: intent.source, targets: intent.targets }));
          }
        }
        break;
      default: {
        const exhaustive: never = intent;
        failure = { code: 'INVALID_COMMAND', message: 'Unknown action ' + String(exhaustive) };
      }
    }
    if (failure) return rejected(state, failure.code, failure.message);
    if (!draft.execution.frames.some(frame => frame.mode === 'ex')) continueDamageEx(draft, context);
    if (!draft.choice) events.push(...runRuleCheckpoint(draft, context));
    checkOutcomes(draft, context);
    const scheduled = runScheduler(draft, context);
    if (scheduled.error) return rejected(state, scheduled.error.code, scheduled.error.message);
    events.push(...scheduled.events);
    if (!draft.choice) checkOutcomes(draft, context);
    if (!draft.choice && !draft.combat && draft.triggers.length > 0) openTriggerOrder(draft, context);
    draft.seq = state.seq + 1;
    assertInvariants(draft, context);
    return { ok: true, state: draft, events };
  } catch (error) {
    return rejected(state, 'ENGINE_FAULT', error instanceof Error ? error.message : 'The command did not finish.');
  }
}
