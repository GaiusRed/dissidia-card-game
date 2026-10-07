import type { EngineContext, MatchState, Zone } from './types';
import { mvpFormat, productionFormat, validateDeck } from './format';
import { resolveStep } from './scheduler';

const otherZones: Exclude<Zone, 'field' | 'stack'>[] = ['deck', 'hand', 'break', 'removed', 'damage', 'commander'];
export function assertInvariants(state: MatchState, context: EngineContext): void {
  for (const resume of [
    ...state.execution.frames.map(frame => frame.resume),
    ...state.execution.delayed.map(delayed => delayed.resume),
    ...state.stack.flatMap(item => item.resume ? [item.resume] : []),
  ]) {
    let step;
    try { step = resolveStep(resume, context); }
    catch (cause) {
      const detail = cause instanceof Error ? cause.message : 'unknown resolver error';
      throw new Error(`Saved execution ${resume.script}/${resume.version}/${resume.ability}/${resume.step} is unknown or incompatible: ${detail}`);
    }
    if (!step.payloadSchema.safeParse(resume.payload).success) {
      throw new Error('Saved execution has a malformed continuation payload');
    }
  }
  if (!state.result) {
    if (state.choice) {
      if (state.priority !== null || (state.choice.seat !== 0 && state.choice.seat !== 1)) {
        throw new Error('A required choice must have one valid decision actor and no priority holder');
      }
      const optionIds = state.choice.options.map(option => option.id);
      if (!Number.isSafeInteger(state.choice.min) || !Number.isSafeInteger(state.choice.max) ||
          state.choice.min < 0 || state.choice.max < state.choice.min || state.choice.max > optionIds.length ||
          new Set(optionIds).size !== optionIds.length) {
        throw new Error('A required choice must have valid bounds and unique options');
      }
      const knownObjects = new Set(Object.values(state.cards).map(card => card.object));
      if (state.choice.options.some(option => option.object !== null && !knownObjects.has(option.object))) {
        throw new Error('A required choice cannot reference an unknown card object');
      }
      if ('script' in state.choice.resume) {
        const frame = state.execution.frames.at(-1);
        const choiceResume = state.choice.resume;
        if (!frame || frame.resume.script !== choiceResume.script || frame.resume.version !== choiceResume.version ||
            frame.resume.ability !== choiceResume.ability || frame.resume.step !== choiceResume.step ||
            JSON.stringify(frame.resume.payload) !== JSON.stringify(choiceResume.payload)) {
          throw new Error('A typed choice must match the active execution frame');
        }
      }
    } else if (state.priority !== 0 && state.priority !== 1) {
      throw new Error('A live match must have a priority actor or a required choice');
    }
  } else if (state.choice !== null || state.priority !== null) {
    throw new Error('A completed match cannot retain a choice or priority actor');
  }
  const registeredFormat = [mvpFormat, productionFormat].find(format => format.id === state.format.id);
  if (!registeredFormat || state.versions.format !== registeredFormat.id ||
      state.format.mainSize !== registeredFormat.mainSize || state.format.damageLimit !== registeredFormat.damageLimit ||
      [...state.format.allowedSets].sort().join(',') !== [...registeredFormat.allowedSets].sort().join(',')) {
    throw new Error('The match uses an unknown or modified format profile');
  }
  const locations = new Map<string, Zone>();
  const objectIds = new Set<string>();
  const add = (instance: string, zone: Zone) => {
    if (locations.has(instance)) throw new Error('Card ' + instance + ' appears in more than one zone');
    const card = state.cards[instance];
    if (!card) throw new Error('Zone ' + zone + ' contains unknown card instance ' + instance);
    locations.set(instance, zone);
  };
  for (const instance of state.field) add(instance, 'field');
  for (const instance of state.stackCards) add(instance, 'stack');
  for (const seat of [0, 1] as const) for (const zone of otherZones) {
    for (const instance of state.zones[seat][zone]) {
      const card = state.cards[instance];
      if (card && card.owner !== seat) throw new Error('Card ' + instance + ' is in another owner zone');
      add(instance, zone);
    }
  }
  for (const [instance, card] of Object.entries(state.cards)) {
    if (card.instance !== instance || !locations.has(instance)) throw new Error('Card ' + instance + ' must appear in exactly one zone');
    if (locations.get(instance) !== card.zone) throw new Error('Card ' + instance + ' zone does not match its location');
    if (card.owner !== 0 && card.owner !== 1) throw new Error('Card ' + instance + ' has an invalid owner');
    if (card.controller !== 0 && card.controller !== 1) throw new Error('Card ' + instance + ' has an invalid controller');
    if (card.damage < 0 || card.controlledSinceTurn < 0 || (card.attackedTurn !== null && card.attackedTurn < 0)) {
      throw new Error('Card ' + instance + ' has a negative counter');
    }
    if (objectIds.has(card.object)) throw new Error('Zone object ' + card.object + ' is not unique');
    objectIds.add(card.object);
    if (!context.catalog[card.card]) throw new Error('Card ' + instance + ' has unknown definition ' + card.card);
  }
  if (state.combat) {
    const participantObjects = new Set<string>();
    const participantInstances = new Set<string>();
    for (const snapshot of state.combat.participants) {
      const current = state.cards[snapshot.instance];
      if (participantObjects.has(snapshot.object) || participantInstances.has(snapshot.instance) ||
          !current || current.owner !== snapshot.owner || current.card !== snapshot.card) {
        throw new Error('Combat participant snapshots must identify unique conserved cards');
      }
      participantObjects.add(snapshot.object);
      participantInstances.add(snapshot.instance);
    }
    if (new Set(state.combat.attackers).size !== state.combat.attackers.length ||
        state.combat.attackers.some(object => !participantObjects.has(object))) {
      throw new Error('Combat attackers must be unique objects in the participant snapshots');
    }
    if (state.combat.blocker !== null && (!participantObjects.has(state.combat.blocker) || state.combat.attackers.includes(state.combat.blocker))) {
      throw new Error('Combat blocker must be a participant object distinct from the attackers');
    }
    if (Object.entries(state.combat.allocation).some(([object, amount]) =>
      !state.combat!.attackers.includes(object) || amount < 0 || amount % 1000 !== 0)) {
      throw new Error('Combat allocation must use known attackers and legal increments');
    }
  }
  for (const seat of [0, 1] as const) {
    const commander = state.commanders[seat];
    const card = state.cards[commander.instance];
    const definition = card ? context.catalog[card.card] : undefined;
    if (!card || card.owner !== seat || !definition || definition.type !== 'Forward' || definition.rarity !== 'L') {
      throw new Error('Player ' + seat + ' has an invalid Commander designation');
    }
    if (commander.casts < 0) throw new Error('Player ' + seat + ' has a negative Commander cast count');
    const owned = Object.values(state.cards).filter(card => card.owner === seat);
    if (owned.length !== state.format.mainSize + 1) throw new Error('Player ' + seat + ' has an invalid card-conservation count');
    const deckErrors = validateDeck({ commander: card.card,
      main: owned.filter(item => item.instance !== commander.instance).map(item => item.card),
    }, state.format, context.catalog);
    if (deckErrors.length > 0) throw new Error('Player ' + seat + ' has an invalid saved deck: ' + deckErrors[0]!.message);
    const numbers = new Set<string>();
    for (const card of owned) {
      if (numbers.has(card.card)) throw new Error('Player ' + seat + ' has a duplicate card number in a singleton format');
      numbers.add(card.card);
    }
  }
  if (state.seq < 0 || state.turn < 0 || state.passes < 0 || state.nextId < 0) throw new Error('Match counters cannot be negative');
  if (state.choice && state.choice.seat !== 0 && state.choice.seat !== 1) throw new Error('Pending choice has an invalid seat');
  if (state.cards && Object.keys(state.cards).length === 0) throw new Error('Match must contain cards');
}
