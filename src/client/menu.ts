import { scenarioCatalog } from '../scenarios/catalog';

const escapeText = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function homeMenu(custom: [boolean, boolean] = [false, false], resume = false, recoveryReason: string | null = null,
  restoreComplete = false): string {
  const scenarios = scenarioCatalog.map(scenario => `<option value="${scenario.id}">${scenario.title}</option>`).join('');
  const recovery = recoveryReason ? `<section class="recovery-panel" role="alert"><strong>Saved match needs attention</strong><p>${escapeText(recoveryReason)}</p><button class="soft" id="export-stored-save">Export preserved save</button><button class="soft" id="discard-stored-save">Discard saved match data</button></section>` : '';
  const blocked = recoveryReason || !restoreComplete ? 'disabled' : '';
  return `<section class="splash"><div class="crest">D</div><p class="eyebrow">OFFLINE PLAYTEST BUILD</p><h1>Dissidia<br><em>Card Game</em></h1><p class="intro">A two-seat local duel using the Commander Duel playtest format.</p>
    ${recovery}
    <div class="deck-pickers"><label>PLAYER 1 DECK<select id="deck-one">${custom[0] ? '<option value="custom-one">Saved custom deck</option>' : ''}<option value="fire">Cinder Company · Fire</option><option value="water">Tidal Assembly · Water</option></select></label><label>PLAYER 2 DECK<select id="deck-two">${custom[1] ? '<option value="custom-two">Saved custom deck</option>' : ''}<option value="water">Tidal Assembly · Water</option><option value="fire">Cinder Company · Fire</option></select></label></div>
    ${resume ? '<button class="primary" id="resume-match">Resume match</button><button class="soft" id="abandon-match">Abandon current match</button>' : ''}<label class="seed-field">MATCH SEED<input id="match-seed" inputmode="numeric" placeholder="Random seed" /></label><button class="primary" id="new-match" ${blocked}>New match</button><button class="soft" id="edit-decks">Deck editor</button>
    <div class="scenario-launch"><label>FOCUSED PLAYTEST SCENARIO<select id="scenario-select">${scenarios}</select></label><button class="soft" id="start-scenario" ${blocked}>Start scenario</button></div>
    <p class="subtle">Opus Placeholder · 19 cards + Commander · 7 damage</p><p class="offline-label" id="offline-status"></p></section>`;
}
