import { cinderCompany, tidalAssembly } from '../content/decks';
import { productionContext } from '../content/context';
import { applyCommand } from '../rules/engine';
import { mvpFormat } from '../rules/format';
import { createMatch } from '../rules/setup';
import type { Command, DeckList, EngineContext, MatchState, Seat, Transition } from '../rules/types';
import { projectView } from './views';
import { clearRecord, loadRecord, saveRecord } from '../storage/indexed-db';
import { createSave, inspectSave, type MatchOriginDescriptor, type MatchSave } from '../storage/save';
import { canonicalJsonString, matchStatesEqual, reconstructOrigin } from '../storage/origin';
import { assertInvariants } from '../rules/invariants';
import { replayTranscript } from '../storage/replay';
import { loadScenario, scenarioCatalog } from '../scenarios/catalog';
import type { CommandRequest, CommandTransport } from './protocol';
import { CLIENT_BUILD_ID } from '../app-build';

const context: EngineContext = productionContext;
export class LocalHost implements CommandTransport {
  private state: MatchState | null = null;
  private origin: MatchState | null = null;
  private originDescriptor: MatchOriginDescriptor = { kind: 'snapshot' };
  private eventLog: import('../rules/types').RuleEvent[] = [];
  private revision = 0;
  private generation = 0;
  private transcript: Command[] = [];
  private receipts = new Map<string, { payload: string; command: Command; reply: Extract<Transition, { ok: true }> }>();
  private commandQueue: Promise<void> = Promise.resolve();
  private saveQueue: Promise<void> = Promise.resolve();
  private abandoned = false;
  private clientBuild = CLIENT_BUILD_ID;
  persistenceError: string | null = null;
  private readonly listeners = new Set<() => void>();

  start(seed = 1, decks: [DeckList, DeckList] = [cinderCompany, tidalAssembly]): void {
    this.revision += 1;
    this.generation += 1;
    this.abandoned = false;
    this.clientBuild = CLIENT_BUILD_ID;
    this.state = createMatch({ seed, decks, format: mvpFormat }, context);
    this.origin = JSON.parse(JSON.stringify(this.state)) as MatchState;
    this.originDescriptor = { kind: 'normal', seed, decks: JSON.parse(JSON.stringify(decks)) as [DeckList, DeckList] };
    this.eventLog = [];
    this.transcript = [];
    this.receipts.clear();
    this.persistenceError = null;
    void this.persist();
    this.publish();
  }
  startScenario(id: string): void {
    this.revision += 1;
    this.generation += 1;
    this.abandoned = false;
    this.clientBuild = CLIENT_BUILD_ID;
    this.state = loadScenario(id, context);
    this.origin = JSON.parse(JSON.stringify(this.state)) as MatchState;
    const scenario = scenarioCatalog.find(item => item.id === id);
    if (!scenario) throw new Error(`Unknown scenario: ${id}`);
    this.originDescriptor = { kind: 'scenario', id, version: scenario.version };
    this.eventLog = [];
    this.transcript = [];
    this.receipts.clear();
    this.persistenceError = null;
    void this.persist();
    this.publish();
  }
  getState(): MatchState {
    if (!this.state) throw new Error('Start a match first.');
    return JSON.parse(JSON.stringify(this.state)) as MatchState;
  }
  view(seat?: Seat) {
    const state = this.getState();
    const viewpoint = seat ?? state.choice?.seat ?? state.priority ?? state.active;
    return projectView(state, viewpoint, this.eventLog, context, this.generation);
  }
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
      this.generation += 1;
      this.state = null;
      this.origin = null;
      this.originDescriptor = { kind: 'snapshot' };
      this.eventLog = [];
      this.transcript = [];
      this.receipts.clear();
      await clearRecord();
      this.publish();
    });
    this.commandQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }
  submit(request: CommandRequest): Promise<Transition>;
  submit(command: Command): Promise<Transition>;
  submit(input: CommandRequest | Command): Promise<Transition> {
    const request = 'command' in input ? input : null;
    const command = request?.command ?? input as Command;
    const generation = request?.generation ?? this.generation;
    const snapshot = JSON.parse(JSON.stringify(this.getState())) as MatchState;
    const operation = this.commandQueue.then(() => this.submitSerialized(command, generation, snapshot));
    this.commandQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }
  private async submitSerialized(command: Command, generation: number, snapshot: MatchState): Promise<Transition> {
    if (generation !== this.generation) return { ok: false, state: snapshot, error: {
      code: 'STALE_MATCH', message: 'This command belongs to a match that has been replaced.',
    }, events: [] };
    const state = this.getState();
    const payload = canonicalJsonString(command);
    const prior = this.receipts.get(command.id);
    if (prior) {
      if (prior.payload !== payload) return { ok: false, state, error: {
        code: 'COMMAND_ID_REUSED', message: 'This command ID was already used for a different action.',
      }, events: [] };
      return JSON.parse(JSON.stringify(prior.reply)) as Transition;
    }
    const reply = applyCommand(state, command, context);
    if (reply.ok) {
      this.receipts.set(command.id, { payload, command: JSON.parse(JSON.stringify(command)) as Command,
        reply: JSON.parse(JSON.stringify(reply)) as Extract<Transition, { ok: true }> });
      this.revision += 1;
      this.state = reply.state;
      this.transcript.push(JSON.parse(JSON.stringify(command)) as Command);
      this.eventLog.push(...JSON.parse(JSON.stringify(reply.events)) as import('../rules/types').RuleEvent[]);
      await this.persist();
      this.publish();
    }
    return JSON.parse(JSON.stringify(reply)) as Transition;
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
      const rebuiltOrigin = reconstructOrigin(save.originDescriptor);
      if (!matchStatesEqual(rebuiltOrigin, save.origin)) throw new Error('The saved origin does not match its seed, decks, or registered scenario.');
      assertInvariants(rebuiltOrigin, context);
      const replayed = replayTranscript(rebuiltOrigin, save, context, save.receipts);
      if (this.revision !== startRevision) return { restored: false, reason: null };
      this.state = save.state;
      this.clientBuild = save.clientBuild ?? CLIENT_BUILD_ID;
      this.origin = save.origin;
      this.originDescriptor = save.originDescriptor;
      this.eventLog = replayed.events;
      this.transcript = save.transcript;
      this.rememberAcceptedCommands(save.transcript, save.origin);
      this.revision += 1;
      this.generation += 1;
      this.persistenceError = null;
      this.publish();
      // Rewrite legacy-compatible saves with this build's persistent client pin.
      if (!save.clientBuild) void this.persist();
      return { restored: true, reason: null };
    } catch (error) {
      this.persistenceError = error instanceof Error ? error.message : 'Local save storage is unavailable.';
      this.publish();
      return { restored: false, reason: this.persistenceError };
    }
  }
  async exportSave(): Promise<string> {
    await this.commandQueue;
    await this.saveQueue;
    const state = this.getState();
    const save = createSave(state, this.transcript, this.origin ?? state, this.originDescriptor, this.savedReceipts(), this.clientBuild);
    return JSON.stringify(save, null, 2);
  }
  async exportStoredRecord(): Promise<string | null> {
    await this.commandQueue;
    await this.saveQueue;
    const save = await loadRecord();
    return save ? JSON.stringify(save, null, 2) : null;
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
      const rebuiltOrigin = reconstructOrigin(parsed.originDescriptor);
      if (!matchStatesEqual(rebuiltOrigin, parsed.origin)) throw new Error('The saved origin does not match its seed, decks, or registered scenario.');
      assertInvariants(rebuiltOrigin, context);
      const replayed = replayTranscript(rebuiltOrigin, parsed, context, parsed.receipts);
      if (this.revision !== importRevision) return { imported: false, reason: 'The current match changed during import. Try again.' };
      await this.enqueueSave(parsed);
      if (this.revision !== importRevision) {
        // A synchronous start may supersede this import while its IndexedDB write is pending.
        // Reconcile storage to the now-current match before reporting the import as rejected.
        await this.persist();
        return { imported: false, reason: 'The current match changed during import. Try again.' };
      }
      this.revision += 1;
      this.generation += 1;
      this.state = parsed.state;
      this.clientBuild = parsed.clientBuild ?? CLIENT_BUILD_ID;
      this.origin = parsed.origin;
      this.originDescriptor = parsed.originDescriptor;
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
  async retrySave(): Promise<boolean> {
    await this.commandQueue;
    if (!this.state) return false;
    await this.persist();
    return this.persistenceError === null;
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private publish(): void { for (const listener of this.listeners) listener(); }
  private rememberAcceptedCommands(commands: Command[], origin: MatchState): void {
    this.receipts.clear();
    let state = JSON.parse(JSON.stringify(origin)) as MatchState;
    for (const command of commands) {
      const payload = canonicalJsonString(command);
      const existing = this.receipts.get(command.id);
      if (existing && existing.payload !== payload) throw new Error('Saved transcript reuses a command ID for different actions.');
      const reply = applyCommand(state, command, context);
      if (!reply.ok) throw new Error(`Saved command ${command.id} cannot be replayed.`);
      this.receipts.set(command.id, { payload, command: JSON.parse(JSON.stringify(command)) as Command,
        reply: JSON.parse(JSON.stringify(reply)) as Extract<Transition, { ok: true }> });
      state = reply.state;
    }
  }
  private persist(): Promise<void> {
    if (!this.state) return Promise.resolve();
    const save = createSave(this.state, this.transcript, this.origin ?? this.state, this.originDescriptor, this.savedReceipts(), this.clientBuild);
    return this.enqueueSave(save).catch(() => undefined);
  }
  private savedReceipts(): MatchSave['receipts'] {
    return [...this.receipts.values()].map(receipt => ({
      command: JSON.parse(JSON.stringify(receipt.command)) as Command,
      reply: JSON.parse(JSON.stringify(receipt.reply)) as Extract<Transition, { ok: true }>,
    }));
  }
  private enqueueSave(save: MatchSave): Promise<void> {
    const operation = this.saveQueue.then(async () => {
      await saveRecord(save);
      this.persistenceError = null;
    });
    this.saveQueue = operation.catch(error => {
      this.persistenceError = error instanceof Error ? error.message : 'Could not save the match.';
      this.publish();
    });
    return operation;
  }
}
