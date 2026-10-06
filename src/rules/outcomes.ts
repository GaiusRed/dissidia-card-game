import type { EngineContext, MatchState, Result, Seat } from './types';

export function checkOutcomes(state: MatchState, _context: EngineContext): void {
  if (state.result) return;
  const damageLosers = ([0, 1] as const).filter(seat => state.zones[seat].damage.length >= state.format.damageLimit);
  const emptyDraws = state.work.filter(item => item.handler === 'rule-process' && item.step === 'empty-deck')
    .map(item => (item.data as { seat: Seat }).seat);
  const losers = [...new Set([...damageLosers, ...emptyDraws])];
  let result: Result | null = null;
  if (losers.length === 2) result = { winner: null, reason: 'simultaneous' };
  else if (losers.length === 1) {
    const loser = losers[0]!;
    result = { winner: loser === 0 ? 1 : 0, reason: damageLosers.includes(loser) ? 'damage' : 'deckout' };
  }
  if (result) {
    state.result = result;
    state.priority = null;
    state.work = [];
    state.choice = null;
  }
}
