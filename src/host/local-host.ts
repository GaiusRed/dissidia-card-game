import { cinderCompany, tidalAssembly } from '../content/decks';
import { opusPh } from '../content/opus-ph';
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

const context: EngineContext = { catalog: opusPh, handlers: abilityHandlers };
export class LocalHost {
  private state: MatchState | null = null;
  private origin: MatchState | null = null;
  private eventLog: import('../rules/types').RuleEvent[] = [];
  private revision = 0;
  private transcript: Command[] = [];
  private receipts = new Map<string, { payload: string; reply: Transition }>();
  private saveQueue: Promise<void> = Promise.resolve();
  persistenceError: string | null = null;
  private readonly listeners = new Set<() => void>();

  start(seed = 1, decks: [DeckList, DeckList] = [cinderCompany, tidalAssembly]): void {
    this.revision += 1;
    this.state = createMatch({ seed, decks, format: mvpFormat }, context);
    this.origin = JSON.parse(JSON.stringify(this.state)) as MatchState;
    this.eventLog = [];
    this.transcript = [];
    this.receipts.clear();
    this.persistenceError = null;
    this.persist();
    this.publish();
  }
  startScenario(id: string): void {
    this.revision += 1;
    this.state = loadScenario(id, context);
    this.origin = JSON.parse(JSON.stringify(this.state)) as MatchState;
    this.eventLog = [];
    this.transcript = [];
    this.receipts.clear();
    this.persistenceError = null;
    this.persist();
    this.publish();
  }
  getState(): MatchState {
    if (!this.state) throw new Error('Start a match first.');
    return this.state;
  }
  view(seat: Seat | null = null) { return projectView(this.getState(), seat, this.eventLog); }
  submit(command: Command): Transition {
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
      this.persist(); this.publish();
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
      this.rememberAcceptedCommands(save.transcript, save.state);
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
  async importSave(serialized: string): Promise<{ imported: boolean; reason: string | null }> {
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
      await saveRecord(parsed);
      this.revision += 1;
      this.state = parsed.state;
      this.origin = parsed.origin;
      this.eventLog = replayed.events;
      this.transcript = parsed.transcript;
      this.rememberAcceptedCommands(parsed.transcript, parsed.state);
      this.persistenceError = null;
      this.publish();
      return { imported: true, reason: null };
    } catch (error) { return { imported: false, reason: error instanceof Error ? error.message : 'Could not import the save.' }; }
  }
  async clearSave(): Promise<void> { await clearRecord(); }
  async waitForSave(): Promise<void> { await this.saveQueue; }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private publish(): void { for (const listener of this.listeners) listener(); }
  private rememberAcceptedCommands(commands: Command[], finalState: MatchState): void {
    this.receipts.clear();
    for (const command of commands) {
      const payload = JSON.stringify(command);
      const existing = this.receipts.get(command.id);
      if (existing && existing.payload !== payload) throw new Error('Saved transcript reuses a command ID for different actions.');
      this.receipts.set(command.id, { payload, reply: { ok: true, state: finalState, events: [] } });
    }
  }
  private persist(): void {
    if (!this.state) return;
    const save = createSave(this.state, this.transcript, this.origin ?? this.state);
    this.saveQueue = this.saveQueue.then(() => saveRecord(save)).catch(error => {
      this.persistenceError = error instanceof Error ? error.message : 'Could not save the match.';
      this.publish();
    });
  }
}
