import { cinderCompany, tidalAssembly } from '../content/decks';
import { opusPh, opusPhRuntimeEffects } from '../content/manifest';
import { abilityHandlers } from '../content/handlers';
import { applyCommand } from '../rules/engine';
import { mvpFormat } from '../rules/format';
import { createMatch } from '../rules/setup';
import type { Command, DeckList, EngineContext, MatchState, Seat, Transition } from '../rules/types';
import { projectView } from './views';
import { clearRecord, loadRecord, saveRecord } from '../storage/indexed-db';
import { createSave, inspectSave, type MatchSave } from '../storage/save';
import { assertInvariants } from '../rules/invariants';
import { replayTranscript } from '../storage/replay';
import { loadScenario } from '../scenarios/catalog';
import type { CommandTransport } from './protocol';

const context: EngineContext = { catalog: opusPh, handlers: abilityHandlers, cardEffects: opusPhRuntimeEffects };
export class LocalHost implements CommandTransport {
  private state: MatchState | null = null;
  private origin: MatchState | null = null;
  private eventLog: import('../rules/types').RuleEvent[] = [];
  private revision = 0;
  private transcript: Command[] = [];
  private receipts = new Map<string, { payload: string; reply: Transition }>();
  private commandQueue: Promise<void> = Promise.resolve();
  private saveQueue: Promise<void> = Promise.resolve();
  private abandoned = false;
  persistenceError: string | null = null;
  private readonly listeners = new Set<() => void>();

  start(seed = 1, decks: [DeckList, DeckList] = [cinderCompany, tidalAssembly]): void {
    this.revision += 1;
    this.abandoned = false;
    this.state = createMatch({ seed, decks, format: mvpFormat }, context);
    this.origin = JSON.parse(JSON.stringify(this.state)) as MatchState;
    this.eventLog = [];
    this.transcript = [];
    this.receipts.clear();
    this.persistenceError = null;
    void this.persist();
    this.publish();
  }
  startScenario(id: string): void {
    this.revision += 1;
    this.abandoned = false;
    this.state = loadScenario(id, context);
    this.origin = JSON.parse(JSON.stringify(this.state)) as MatchState;
    this.eventLog = [];
    this.transcript = [];
    this.receipts.clear();
    this.persistenceError = null;
    void this.persist();
    this.publish();
  }
  getState(): MatchState {
    if (!this.state) throw new Error('Start a match first.');
    return this.state;
  }
  view(seat: Seat | null = null) { return projectView(this.getState(), seat, this.eventLog, context); }
  async requestUpdate(): Promise<{ allowed: boolean; reason: string | null }> {
    await this.commandQueue;
    const allowed = this.state === null || this.state.result !== null || this.abandoned;
    return { allowed, reason: allowed ? null : 'Finish or abandon the current match before updating.' };
  }
  abandon(): Promise<void> {
    const operation = this.commandQueue.then(async () => {
      await this.saveQueue;
      this.abandoned = true;
      this.revision += 1;
      this.state = null;
      this.origin = null;
      this.eventLog = [];
      this.transcript = [];
      this.receipts.clear();
      await clearRecord();
      this.publish();
    });
    this.commandQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }
  submit(command: Command): Promise<Transition> {
    const operation = this.commandQueue.then(() => this.submitSerialized(command));
    this.commandQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }
  private async submitSerialized(command: Command): Promise<Transition> {
    const state = this.getState();
    const payload = JSON.stringify(command);
    const prior = this.receipts.get(command.id);
    if (prior) {
      if (prior.payload !== payload) return { ok: false, state, error: {
        code: 'COMMAND_ID_REUSED', message: 'This command ID was already used for a different action.',
      }, events: [] };
      return JSON.parse(JSON.stringify(prior.reply)) as Transition;
    }
    const reply = applyCommand(state, command, context);
    this.receipts.set(command.id, { payload, reply: JSON.parse(JSON.stringify(reply)) as Transition });
    if (reply.ok) {
      this.revision += 1;
      this.state = reply.state;
      this.transcript.push(JSON.parse(JSON.stringify(command)) as Command);
      this.eventLog.push(...JSON.parse(JSON.stringify(reply.events)) as import('../rules/types').RuleEvent[]);
      await this.persist();
      this.publish();
    }
    return reply;
  }
  async restore(): Promise<{ restored: boolean; reason: string | null }> {
    const startRevision = this.revision;
    try {
      const save = await loadRecord();
      if (!save) return { restored: false, reason: null };
      const expected = createMatch({ seed: 1, decks: [cinderCompany, tidalAssembly], format: mvpFormat }, context).versions;
      const compatibility = inspectSave(save, expected);
      if (!compatibility.compatible) return { restored: false, reason: compatibility.reason };
      assertInvariants(save.state, context);
      assertInvariants(save.origin, context);
      const replayed = replayTranscript(save.origin, save, context);
      if (this.revision !== startRevision) return { restored: false, reason: null };
      this.state = save.state;
      this.origin = save.origin;
      this.eventLog = replayed.events;
      this.transcript = save.transcript;
      this.rememberAcceptedCommands(save.transcript, save.origin);
      this.persistenceError = null;
      this.publish();
      return { restored: true, reason: null };
    } catch (error) {
      this.persistenceError = error instanceof Error ? error.message : 'Local save storage is unavailable.';
      this.publish();
      return { restored: false, reason: this.persistenceError };
    }
  }
  async exportSave(): Promise<string> {
    await this.saveQueue;
    const state = this.getState();
    const save = createSave(state, this.transcript, this.origin ?? state);
    return JSON.stringify(save, null, 2);
  }
  importSave(serialized: string): Promise<{ imported: boolean; reason: string | null }> {
    const operation = this.commandQueue.then(() => this.importSaveSerialized(serialized));
    this.commandQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }
  private async importSaveSerialized(serialized: string): Promise<{ imported: boolean; reason: string | null }> {
    const importRevision = this.revision;
    let parsed: MatchSave;
    try { parsed = JSON.parse(serialized) as MatchSave; }
    catch { return { imported: false, reason: 'The selected file is not valid JSON.' }; }
    const expected = createMatch({ seed: 1, decks: [cinderCompany, tidalAssembly], format: mvpFormat }, context).versions;
    const compatibility = inspectSave(parsed, expected);
    if (!compatibility.compatible) return { imported: false, reason: compatibility.reason };
    try {
      assertInvariants(parsed.state, context);
      assertInvariants(parsed.origin, context);
      const replayed = replayTranscript(parsed.origin, parsed, context);
      if (this.revision !== importRevision) return { imported: false, reason: 'The current match changed during import. Try again.' };
      await this.enqueueSave(parsed);
      if (this.revision !== importRevision) return { imported: false, reason: 'The current match changed during import. Try again.' };
      this.revision += 1;
      this.state = parsed.state;
      this.origin = parsed.origin;
      this.eventLog = replayed.events;
      this.transcript = parsed.transcript;
      this.rememberAcceptedCommands(parsed.transcript, parsed.origin);
      this.persistenceError = null;
      this.publish();
      return { imported: true, reason: null };
    } catch (error) { return { imported: false, reason: error instanceof Error ? error.message : 'Could not import the save.' }; }
  }
  async clearSave(): Promise<void> { await this.commandQueue; await this.saveQueue; await clearRecord(); }
  async waitForSave(): Promise<void> { await this.saveQueue; }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private publish(): void { for (const listener of this.listeners) listener(); }
  private rememberAcceptedCommands(commands: Command[], origin: MatchState): void {
    this.receipts.clear();
    let state = JSON.parse(JSON.stringify(origin)) as MatchState;
    for (const command of commands) {
      const payload = JSON.stringify(command);
      const existing = this.receipts.get(command.id);
      if (existing && existing.payload !== payload) throw new Error('Saved transcript reuses a command ID for different actions.');
      const reply = applyCommand(state, command, context);
      if (!reply.ok) throw new Error(`Saved command ${command.id} cannot be replayed.`);
      this.receipts.set(command.id, { payload, reply: JSON.parse(JSON.stringify(reply)) as Transition });
      state = reply.state;
    }
  }
  private persist(): Promise<void> {
    if (!this.state) return Promise.resolve();
    const save = createSave(this.state, this.transcript, this.origin ?? this.state);
    return this.enqueueSave(save).catch(() => undefined);
  }
  private enqueueSave(save: MatchSave): Promise<void> {
    const operation = this.saveQueue.then(() => saveRecord(save));
    this.saveQueue = operation.catch(error => {
      this.persistenceError = error instanceof Error ? error.message : 'Could not save the match.';
      this.publish();
    });
    return operation;
  }
}
