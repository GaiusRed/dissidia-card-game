import { commandSchema } from './codec';
import { castCharacter, castSummon } from './casting';
import { declareAttack, declareBlock, resolveCombat } from './combat';
import { activateAbility } from './activation';
import { resolveDeparture } from './commander';
import { assertInvariants } from './invariants';
import { checkOutcomes } from './outcomes';
import { openTriggerOrder, passPriority, runEndCheckpoint } from './priority';
import { answerChoice } from './setup';
import { moveCard } from './zones';
import { continueDamageEx } from './damage';
import { runRuleCheckpoint } from './checkpoints';
import { prepareBatch } from './batches';
import { resumePendingSummonResolution } from './summons';
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
        if ('script' in pending.resume) {
          const resumed = resumeChoice(draft, answer, context);
          failure = resumed.error;
          events.push(...resumed.events);
        } else if (pending.resume.handler === 'setup') {
          failure = firstError(answerChoice(draft, answer, command.seat, context));
        } else if (pending.resume.handler === 'trigger-declaration' && pending.resume.step === 'target') {
          const data = pending.resume.data as { item?: unknown };
          const item = typeof data.item === 'string' ? draft.stack.find(candidate => candidate.id === data.item) : undefined;
          const selected = answer.selected[0];
          if (!item || pending.seat !== command.seat || answer.selected.length !== 1 || Object.keys(answer.amounts).length > 0 ||
              !selected || !pending.options.some(option => option.id === selected)) {
            failure = { code: 'INVALID_SELECTION', message: 'Choose one of the targets shown for this trigger.' };
            break;
          }
          const card = Object.values(draft.cards).find(candidate => candidate.object === selected);
          if (!card || card.zone !== 'field' || context.catalog[card.card]?.type !== 'Forward') {
            failure = { code: 'STALE_CHOICE', message: 'The selected trigger target is no longer legal.' };
            break;
          }
          const itemData = item.data && typeof item.data === 'object' && !Array.isArray(item.data)
            ? item.data as Record<string, import('./types').Json> : {};
          const { declarationTarget: _declarationTarget, ...remainingData } = itemData;
          item.targets = [selected];
          item.data = { ...remainingData, targets: [selected] };
          draft.choice = null;
          openTriggerTargetChoice(draft, context);
          if (!draft.choice) { draft.priority = draft.active; draft.passes = 0; }
          events.push(event(draft, 'trigger.target-declared', { item: item.id, target: selected }));
        } else if (pending.resume.handler === 'trigger-order' && pending.resume.step === 'order') {
          const group = draft.triggers[0];
          const data = group?.data as { seat?: unknown; items?: unknown } | null;
          const items = Array.isArray(data?.items) ? data.items as import('./types').StackItem[] : [];
          if (data?.seat !== command.seat || answer.selected.length !== items.length ||
              new Set(answer.selected).size !== answer.selected.length ||
              answer.selected.some(id => !items.some(item => item.id === id)) || Object.keys(answer.amounts).length > 0) {
            failure = { code: 'INVALID_SELECTION', message: 'Choose each triggered ability once in the order they should be put on the stack.' };
            break;
          }
          draft.triggers.shift();
          for (const id of answer.selected) draft.stack.push(items.find(item => item.id === id)!);
          draft.choice = null;
          openTriggerOrder(draft, context);
          events.push(event(draft, 'trigger.order-chosen', { seat: command.seat, order: answer.selected }));
        } else if (pending.resume.handler === 'end-phase-discard' && pending.resume.step === 'discard') {
          if (pending.seat !== command.seat || answer.selected.length !== pending.min ||
              new Set(answer.selected).size !== answer.selected.length ||
              answer.selected.some(id => !pending.options.some(option => option.id === id)) || Object.keys(answer.amounts).length > 0) {
            failure = { code: 'INVALID_SELECTION', message: 'Choose the required number of cards to discard.' };
            break;
          }
          for (const id of answer.selected) {
            const card = Object.values(draft.cards).find(item => item.object === id);
            if (!card || card.zone !== 'hand' || card.owner !== command.seat) {
              failure = { code: 'STALE_CHOICE', message: 'A selected card is no longer in your hand.' };
              break;
            }
            const old = moveCard(draft, card.instance, 'break');
            events.push(event(draft, 'card.discarded', { seat: command.seat, card: old.card, reason: 'End Phase hand limit' }));
          }
          if (!failure) {
            draft.choice = null;
            events.push(...runEndCheckpoint(draft, context));
          }
        } else if (pending.resume.handler === 'rule-checkpoint' && pending.resume.step === 'excess-backups') {
          if (pending.seat !== command.seat || answer.selected.length !== pending.min || new Set(answer.selected).size !== answer.selected.length ||
              answer.selected.some(id => !pending.options.some(option => option.id === id)) || Object.keys(answer.amounts).length > 0) {
            failure = { code: 'INVALID_SELECTION', message: 'Choose the required number of Backups to put into the Break Zone.' };
            break;
          }
          const backups = answer.selected.map(id => Object.values(draft.cards).find(card => card.object === id));
          if (backups.some(backup => !backup || backup.zone !== 'field' || context.catalog[backup.card]?.type !== 'Backup' || backup.controller !== command.seat)) {
              failure = { code: 'STALE_CHOICE', message: 'A selected Backup is no longer under your control.' };
          }
          if (!failure) {
            draft.choice = null;
            draft.execution.batch = prepareBatch(draft, { simultaneous: true, operations: answer.selected.map(object => ({
              kind: 'move', object, to: 'break', index: null,
            })) }, context);
          }
        } else if (pending.resume.handler === 'combat' && pending.resume.step === 'party-allocation') {
          const requirement = pending.allocation;
          const values = Object.entries(answer.amounts);
          const total = values.reduce((sum, [, amount]) => sum + amount, 0);
          if (!requirement || answer.selected.length !== 0 || total !== requirement.total ||
              values.some(([id, amount]) => !pending.options.some(option => option.id === id) || amount < 0 || amount % requirement.increment !== 0) ||
              Object.keys(answer.amounts).length > pending.options.length) {
            failure = { code: 'INVALID_ALLOCATION', message: 'Assign the blocking Forward’s full damage in 1000 point increments.' };
            break;
          }
          if (!draft.combat || draft.combat.step !== 'damage') {
            failure = { code: 'STALE_CHOICE', message: 'The party is no longer in its damage step.' };
            break;
          }
          draft.combat.allocation = { ...answer.amounts };
          draft.choice = null;
          events.push(event(draft, 'combat.damage-allocated', { amounts: answer.amounts }));
          events.push(...resolveCombat(draft, context));
        } else if (pending.resume.handler === 'departure') {
          if (answer.selected.length !== 1 || Object.keys(answer.amounts).length > 0) {
            failure = { code: 'INVALID_SELECTION', message: 'Choose one Commander destination.' };
            break;
          }
          const receipt = resolveDeparture(draft, answer.selected[0]!, context);
          if (!receipt) failure = { code: 'INVALID_SELECTION', message: 'Choose one of the displayed Commander destinations.' };
          else events.push(event(draft, 'commander.departed', {
            instance: receipt.old.instance, oldObject: receipt.old.object, destination: receipt.destination,
          }));
          if (!failure && !draft.choice) events.push(...resumePendingSummonResolution(draft, context));
          if (!failure && draft.phase === 'end' && !draft.choice) events.push(...runEndCheckpoint(draft, context));
        } else if (context.handlers?.[pending.resume.handler]) {
          if (answer.selected.length < pending.min || answer.selected.length > pending.max ||
              answer.selected.some(id => !pending.options.some(option => option.id === id)) ||
              new Set(answer.selected).size !== answer.selected.length || Object.keys(answer.amounts).length > 0) {
            failure = { code: 'INVALID_SELECTION', message: 'Choose the required options shown for this decision.' };
            break;
          }
          draft.choice = null;
          const result = context.handlers![pending.resume.handler]!({
            state: draft, catalog: context.catalog, handlers: context.handlers!, registry: context.registry,
            frame: { ...pending.resume, data: { ...(pending.resume.data as Record<string, import('./types').Json>), selected: answer.selected } },
          });
          events.push(...result.events);
          draft.work.push(...result.next);
          if (result.choice) draft.choice = result.choice;
        } else {
          failure = { code: 'UNSUPPORTED_CHOICE', message: 'This decision cannot be resolved yet.' };
        }
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
