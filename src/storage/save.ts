import type { Command, MatchState, Versions } from '../rules/types';

export interface MatchSave {
  format: 'dissidia-save-v1';
  versions: Versions;
  savedAt: string;
  origin: MatchState;
  state: MatchState;
  transcript: Command[];
}
export function createSave(state: MatchState, transcript: Command[], origin: MatchState = state): MatchSave {
  return { format: 'dissidia-save-v1', versions: { ...state.versions }, savedAt: new Date().toISOString(),
    origin: JSON.parse(JSON.stringify(origin)) as MatchState, state: JSON.parse(JSON.stringify(state)) as MatchState,
    transcript: JSON.parse(JSON.stringify(transcript)) as Command[] };
}
export function inspectSave(value: MatchSave | null, current: Versions): { compatible: boolean; reason: string | null } {
  if (!value || value.format !== 'dissidia-save-v1') return { compatible: false, reason: 'This file is not a supported Dissidia match save.' };
  for (const key of ['schema', 'engine', 'format', 'catalog'] as const) {
    if (value.versions[key] !== current[key]) return { compatible: false, reason: `Save ${key} version ${value.versions[key]} does not match this app (${current[key]}).` };
  }
  return { compatible: true, reason: null };
}
