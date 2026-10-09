import { test, expect, type Page } from '@playwright/test';

let browserErrors: string[] = [];
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dissidia-priority-holds', JSON.stringify({ 0: true, 1: true })));
  browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
});
test.afterEach(() => {
  expect(browserErrors, 'UI design flow must not produce browser errors').toEqual([]);
});


async function start(page: Page) {
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await expect(page.locator('#pass')).toBeVisible();
}

test('shows public pile counts and opens public zones while keeping deck contents hidden', async ({ page }) => {
  await start(page);
  await expect(page.getByRole('button', { name: 'Inspect Player 1 deck' })).toContainText('13');
  await page.getByRole('button', { name: 'Inspect Player 1 deck' }).click();
  await expect(page.getByRole('dialog', { name: 'Player 1 deck' })).toContainText('identities and order are hidden');
  await page.keyboard.press('Escape');

  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Abandon current match' }).click();
  await page.locator('#scenario-select').selectOption('battlefield-card-status');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect Player 1 damage zone' }).click();
  const damage = page.getByRole('dialog', { name: 'Player 1 damage zone' });
  await expect(damage).toContainText('Scorch');
  await damage.getByRole('button', { name: 'Close zone' }).click();
});

test('finished-match actions export the completed save and return to the menu', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Concede', exact: true }).click();
  const result = page.locator('.result-overlay');
  await expect(result).toContainText('wins');
  await expect(result.getByRole('button', { name: 'New match', exact: true })).toBeVisible();
  const exportButton = result.getByRole('button', { name: 'Export save', exact: true });
  await expect(exportButton).toBeVisible();
  const menuButton = result.getByRole('button', { name: 'Return to menu', exact: true });
  await expect(menuButton).toBeVisible();

  const downloadReady = page.waitForEvent('download');
  await exportButton.click();
  expect((await downloadReady).suggestedFilename()).toMatch(/dissidia-turn-.*\.json/);
  await menuButton.click();
  await expect(page.getByRole('button', { name: 'New match', exact: true })).toBeVisible();
});

test('keeps all four empty field rows labeled from either player view', async ({ page }) => {
  await start(page);
  for (const seat of [1, 2]) {
    await expect(page.getByRole('region', { name: `Player ${seat} Forwards`, exact: true })).toContainText('No forwards');
    await expect(page.getByRole('region', { name: `Player ${seat} Backups`, exact: true })).toContainText('No backups');
  }
  await page.locator('#inspect').click();
  await expect(page.getByRole('region', { name: 'Player 1 Forwards', exact: true })).toContainText('No forwards');
  await expect(page.getByRole('region', { name: 'Player 2 Backups', exact: true })).toContainText('No backups');
});

test('Commander identity is unique and inspection changes the hand', async ({ page }, _info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page);
  const duplicates = await page.locator('[data-card]').evaluateAll(nodes => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      const id = (node as HTMLElement).dataset.card!;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts].filter(([, count]) => count > 1);
  });
  expect.soft(duplicates, 'One interactive representation per physical card').toEqual([]);
  const card = page.locator('.hand-fan .card').last();
  await card.hover();
    const before = await page.locator('.hand-zone > .zone-label').textContent();
  const requestedSeat = (await page.locator('#inspect').textContent())?.match(/Player (\d)/)?.[1];
  await page.locator('#inspect').click();
  const changedHand = await page.locator('.hand-zone > .zone-label').textContent() !== before;
  const inspectorCards = await page.getByRole('region', { name: `Player ${requestedSeat} hand`, exact: true }).locator('[data-card]').count();
  expect.soft(changedHand || inspectorCards > 0, 'Inspect must show the other hand in the table or a labeled inspection browser').toBe(true);
  expect.soft(errors).toEqual([]);
  if (_info.project.use.reducedMotion === 'reduce') {
    const duration = await card.evaluate(node => getComputedStyle(node).transitionDuration);
    expect.soft(duration.split(',').every(value => parseFloat(value) <= 0.01), 'Reduced motion removes card travel transitions').toBe(true);
  }
});


test('keyboard focus stays visible and Enter opens hand-card inspection', async ({ page }) => {
  await start(page);
  const card = page.locator('.hand-fan [data-card]').first();
  for (let index = 0; index < 50 && !(await card.evaluate(node => document.activeElement === node)); index += 1) {
    await page.keyboard.press('Tab');
  }
  await expect(card).toBeFocused();
  const focus = await card.evaluate(node => {
    const style = getComputedStyle(node);
    return { width: style.outlineWidth, style: style.outlineStyle };
  });
  expect(focus).toEqual({ width: '3px', style: 'solid' });
  await page.keyboard.press('Enter');
  await expect(card).toHaveClass(/selected/);
  await expect(page.locator('.selected-preview')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.selected-preview')).toHaveCount(0);
  await expect(page.locator('.empty-selection')).toBeVisible();
});



test('stolen Forward follows its controller row and inspection preserves its owner', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('control-conflict');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  const borrowedBanner = page.locator('.hand-fan [data-card]').filter({ hasText: 'Borrowed Banner' });
  await borrowedBanner.click();
  await page.getByRole('button', { name: 'Review Summon · 4 CP', exact: true }).click();
  const target = page.locator('[aria-label="Player 1 Forwards"] [data-card]').filter({ hasText: 'Spark Runner' });
  await expect(target).toBeVisible();
  await target.click();
  await page.getByRole('button', { name: 'Confirm Summon · 4 CP', exact: true }).click();
  await expect(page.locator('.stack-row')).toContainText('Borrowed Banner');
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  const stolen = page.locator('[aria-label="Player 2 Forwards"] [data-card]').filter({ hasText: 'Spark Runner' });
  const rows = await page.locator('.field-row').evaluateAll(nodes => nodes.map(node => ({
    label: node.getAttribute('aria-label'), text: (node as HTMLElement).innerText,
  })));
  await expect(stolen, JSON.stringify(rows)).toBeVisible();
  await stolen.click();
  await expect(page.locator('.card-inspection-meta')).toContainText('Owner Player 1');
  await expect(page.locator('.card-inspection-meta')).toContainText('Controller Player 2');
});

test('Commander inspection shows zone, tax, readiness, printed power and rules text', async ({ page }) => {
  await start(page);
  const commander = page.locator('.own-zones [data-card]').first();
  await expect(commander).toBeVisible();
  await commander.click();
  const details = page.locator('.selected-preview');
  const inspectionFontSize = Number.parseFloat(await details.locator('.card-inspection-meta').evaluate(node => getComputedStyle(node).fontSize));
  expect(inspectionFontSize, 'Inspection metadata remains readable at desktop sizes').toBeGreaterThanOrEqual(10);
  await expect(details).toContainText('Commander');
  await expect(details.locator('.card-inspection-meta')).toContainText('commander');
  await expect(details.locator('.card-inspection-meta')).toContainText('Ready');
  await expect(details.locator('.card-inspection-meta')).toContainText('Commander tax 0 CP');
  await expect(details.locator('.card-inspection-meta')).toContainText('Keywords: Brave');
  await expect(details.locator('.card-inspection-meta')).toContainText('Printed');
  await expect(details.locator('.selection-detail')).not.toBeEmpty();
});

test('attack party selection submits all selected Forwards together', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('party-first-strike');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  const members = page.locator('[aria-label="Player 2 Forwards"] [data-card]');
  const count = await members.count();
  expect(count).toBeGreaterThanOrEqual(2);
  for (let index = 0; index < 2; index += 1) {
    await members.nth(index).click();
    await page.getByRole('button', { name: 'Add to attack party' }).click();
  }
  const attack = page.getByRole('button', { name: 'Attack with 2 Forwards' });
  await expect(attack).toBeVisible();
  await members.nth(0).click();
  await page.getByRole('button', { name: 'Remove from attack party' }).click();
  await expect(page.getByRole('button', { name: 'Attack with 1 Forward' })).toBeVisible();
  await members.nth(0).click();
  await page.getByRole('button', { name: 'Add to attack party' }).click();
  await expect(page.getByRole('button', { name: 'Attack with 2 Forwards' })).toBeVisible();
  await attack.click();
  await expect(page.getByRole('button', { name: 'Attack with 2 Forwards' })).toHaveCount(0);
  await expect(page.locator('.event-log')).toContainText('Player 2 attacked with');
});

test('match log retains older events in its scrollable history', async ({ page }) => {
  await start(page);
  const events = page.getByRole('log', { name: 'Game log' }).locator('li');
  for (let index = 0; index < 8; index += 1) {
    const pass = page.getByRole('button', { name: 'Pass priority', exact: true });
    if (await pass.count()) await pass.click();
  }
  await expect(events).not.toHaveCount(0);
  const oldest = await events.first().textContent();
  const newest = await events.last().textContent();
  expect(oldest).toBeTruthy();
  expect(newest).toBeTruthy();
  await events.first().scrollIntoViewIfNeeded();
  await expect(events.first()).toBeVisible();
  await events.last().scrollIntoViewIfNeeded();
  await expect(events.last()).toBeVisible();
});


test('deck search retains focus through a real typing sequence', async ({ page }, _info) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deck editor', exact: true }).click();
  const search = page.getByLabel('SEARCH', { exact: true });
  await search.click();
  await search.pressSequentially('Tide', { delay: 50 });
  expect.soft(await search.inputValue(), 'Filtering must retain input focus and all typed characters').toBe('Tide');
  await expect.soft(search).toBeFocused();
  const catalogRows = page.locator('.editor-columns section:last-child .editor-row');
  await expect(catalogRows.first()).toContainText(/Tide/i);
  await page.locator('#editor-type').selectOption('Summon');
  await expect(catalogRows.first()).toContainText('Summon');
  await expect(catalogRows).not.toHaveCount(0);
  await page.locator('#editor-element').selectOption('Water');
  await page.reload();
  await page.getByRole('button', { name: 'Deck editor', exact: true }).click();
  await expect(page.getByLabel('SEARCH', { exact: true })).toHaveValue('Tide');
  await expect(page.locator('#editor-type')).toHaveValue('Summon');
  await expect(page.locator('#editor-element')).toHaveValue('Water');
  const restoredRows = page.locator('.editor-columns section:last-child .editor-row');
  await expect(restoredRows).not.toHaveCount(0);
  await expect(restoredRows.first()).toContainText('Water');
  await expect(restoredRows.first()).toContainText('Summon');
});

test('deck editor exposes every legal Commander and explains invalid element changes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deck editor', exact: true }).click();
  const commander = page.locator('#editor-commander');
  const commanderIds = await commander.locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
  expect(commanderIds).toEqual(['P-001L', 'P-021L']);

  await commander.selectOption('P-021L');
  await expect(page.locator('.editor-error')).toContainText('does not share an element with the Commander');
  await expect(page.locator('.deck-count')).toHaveText('19 / 19');
  await expect(page.getByRole('button', { name: /Save for Player 1/ })).toBeDisabled();

  await commander.selectOption('P-001L');
  await expect(page.locator('.editor-error')).toHaveText('');
  await expect(page.getByRole('button', { name: /Save for Player 1/ })).toBeEnabled();
  const addQuartermaster = page.getByRole('button', { name: 'Add Quartermaster', exact: true });
  await expect(addQuartermaster).toBeDisabled();
  await page.getByRole('button', { name: 'Remove Quartermaster', exact: true }).click();
  await expect(page.locator('.deck-count')).toHaveText('18 / 19');
  await expect(addQuartermaster).toBeEnabled();
  await addQuartermaster.click();
  await expect(page.locator('.deck-count')).toHaveText('19 / 19');
});

test('deck editor inspects full card rules from both the catalog and deck list', async ({ page }, _info) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deck editor', exact: true }).click();
  const catalog = page.locator('.editor-columns section:last-child');
  await catalog.getByRole('button', { name: 'Inspect Tide Warden', exact: true }).first().click();
  const inspector = page.getByRole('region', { name: 'Card inspection' });
  await expect(inspector).toContainText('Tide Warden');
  await expect(inspector).toContainText('P-021L');
  await expect(inspector).toContainText('7000');
  await expect(inspector).toContainText("Return it to its owner's hand.");
  await expect(inspector).toBeVisible();

  const mainDeck = page.locator('.editor-columns section:first-child');
  const firstDeckCard = await mainDeck.locator('.editor-row strong').first().textContent();
  expect(firstDeckCard).toBeTruthy();
  await mainDeck.getByRole('button', { name: `Inspect ${firstDeckCard}`, exact: true }).click();
  await expect(inspector).toContainText(firstDeckCard!);
  const keyboardInspect = mainDeck.getByRole('button', { name: `Inspect ${firstDeckCard}`, exact: true });
  await keyboardInspect.focus();
  await page.keyboard.press('Enter');
  await expect(inspector).toContainText(firstDeckCard!);
});

test('stack cards and the event log remain available during a Commander destination choice', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('commander-removed-destination');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const commander = page.locator('[aria-label="Player 2 Forwards"] [data-card]').filter({ hasText: 'Tide Warden' });
  const summon = page.locator('[aria-label="Player 1 hand"] [data-card]').filter({ hasText: 'Controlled Burn' });
  await summon.click();
  await page.getByRole('button', { name: 'Review Summon · 3 CP', exact: true }).click();
  await page.getByRole('button', { name: 'Remove a Forward', exact: true }).click();
  await commander.click();
  await page.getByRole('button', { name: 'Confirm Summon · 3 CP', exact: true }).click();
  const stackDetails = page.getByRole('region', { name: 'Stack details' });
  const queuedStackEntry = stackDetails.getByRole('listitem').filter({ hasText: 'Controlled Burn' });
  await expect(queuedStackEntry).toContainText('Player 1');
  await expect(queuedStackEntry).toContainText('Tide Warden');
  await expect(queuedStackEntry).toHaveAttribute('data-resolving', 'false');
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Required choice' })).toContainText('Commander');
  await expect(page.locator('.stack-row [data-card]')).toHaveCount(1);
  const resolvingStackEntry = stackDetails.getByRole('listitem').filter({ hasText: 'Resolving Controlled Burn' });
  await expect(resolvingStackEntry).toContainText('Player 1');
  await expect(resolvingStackEntry).toHaveAttribute('data-resolving', 'true');
});

test('every queued End Phase trigger stays ordered while the top trigger resolves', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('end-trigger-order');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();

  await page.locator('.hand-fan [data-card]').filter({ hasText: 'Rising Undertow' }).click();
  await page.getByRole('button', { name: 'Review Summon · 2 CP', exact: true }).click();
  await page.locator('.card[data-payment-option="backup"]').filter({ hasText: 'Mist Caller' }).click();
  const cast = page.getByRole('button', { name: 'Confirm Summon · 2 CP', exact: true });
  await expect(cast).toBeEnabled();
  await cast.click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();

  const order = page.getByRole('region', { name: 'Required choice' });
  await expect(order).toContainText('order');
  const options = page.locator('[data-order-choice]');
  await options.filter({ hasText: 'Rising Undertow' }).click();
  await options.filter({ hasText: 'Mist Caller' }).click();
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click();

  const target = page.locator('[data-choice]').filter({ hasText: 'River Recruit' });
  await expect(target).toBeVisible();
  const sequenceBeforeTarget = Number(await page.locator('.table').getAttribute('data-view-seq'));
  await target.click();
  await expect.poll(async () => Number(await page.locator('.table').getAttribute('data-view-seq')))
    .toBe(sequenceBeforeTarget + 1);

  const stack = page.getByRole('region', { name: 'Stack details' });
  const entries = stack.getByRole('listitem');
  await expect(entries).toHaveCount(2);
  await expect(entries.nth(0)).toContainText('2. Rising Undertow');
  await expect(entries.nth(0)).toContainText('Player 2');
  await expect(entries.nth(0)).toContainText('Targets: None');
  await expect(entries.nth(0)).toHaveAttribute('data-resolving', 'false');
  await expect(entries.nth(1)).toContainText('1. Mist Caller');
  await expect(entries.nth(1)).toContainText('Player 2');
  await expect(entries.nth(1)).toContainText('River Recruit');
  await expect(entries.nth(1)).toHaveAttribute('data-resolving', 'false');

  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await expect(entries).toHaveCount(1);
  await expect(entries.nth(0)).toContainText('1. Rising Undertow');
  await expect(entries.nth(0)).toContainText('Player 2');
  await expect(entries.nth(0)).toHaveAttribute('data-resolving', 'false');
  await expect(page.locator('[aria-label="Player 2 Forwards"] [data-card]').filter({ hasText: 'River Recruit' }))
    .not.toHaveClass(/dull/);
});

test('multi-card mulligan order is editable and requires explicit confirmation', async ({ page }) => {
  // Use the real multi-card mulligan order choice so save reconstruction remains authoritative.
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  const choicePanel = page.getByRole('region', { name: 'Required choice' });
  await page.getByRole('button', { name: 'Redraw', exact: true }).click();
  await expect(choicePanel).toContainText('Choose order 0/5');
  expect.soft(await choicePanel.getByRole('button', { name: /Confirm/ }).count(),
    'A mandatory multi-card decision needs a Confirm control').toBe(1);
  const sequenceBefore = await page.locator('.table').getAttribute('data-view-seq');
  expect(sequenceBefore).not.toBeNull();
  await page.locator('#inspect').click();
  await expect(choicePanel).toContainText('Player 1 is making a private choice');
  await page.locator('#inspect').click();
  await expect(choicePanel).toContainText('Choose order 0/5');
  const options = page.locator('[data-order-choice]');
  await options.nth(0).click();
  await expect(options.nth(0)).toContainText('1.');
  await expect(page.getByRole('button', { name: 'Confirm order' })).toBeDisabled();
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', sequenceBefore!);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Required choice' })).toContainText('Choose order 0/5');
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', sequenceBefore!);
  const reloadedOptions = page.locator('[data-order-choice]');
  await reloadedOptions.nth(0).click();
  await expect(reloadedOptions.nth(0)).toContainText('1.');
  await expect(page.getByRole('button', { name: 'Confirm order' })).toBeDisabled();
  await reloadedOptions.nth(1).click();
  await expect(reloadedOptions.nth(1)).toContainText('2.');
  await reloadedOptions.nth(0).click();
  await expect(reloadedOptions.nth(0)).not.toContainText('1.');
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', sequenceBefore!);
  await reloadedOptions.nth(1).click();
  await expect(choicePanel).toContainText('Choose order 0/5');
  for (let index = 0; index < 5; index += 1) await reloadedOptions.nth(index).click();
  await expect(page.getByRole('button', { name: 'Confirm order' })).toBeEnabled();
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', sequenceBefore!);
  await page.getByRole('button', { name: 'Confirm order' }).click();
  await expect.poll(async () => Number(await page.locator('.table').getAttribute('data-view-seq'))).toBeGreaterThan(Number(sequenceBefore));
  await expect(choicePanel).toContainText('Keep your opening hand or redraw it once.');
});

test('Escape cannot dismiss a required starting-player choice', async ({ page }) => {
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  const choice = page.getByRole('button', { name: 'Take first turn', exact: true });
  await expect(choice).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(choice).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take second turn', exact: true })).toBeVisible();
});

test('party blockers are selectable through the pass window', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('party-first-strike');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  const attackers = page.locator('[aria-label="Player 2 Forwards"] [data-card]');
  for (let index = 0; index < 2; index += 1) {
    await attackers.nth(index).click();
    await page.getByRole('button', { name: 'Add to attack party' }).click();
  }
  await page.getByRole('button', { name: 'Attack with 2 Forwards' }).click();
  // Both sides pass priority before the defender gets the block window.
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await expect(page.locator('[aria-label="Player 1 Forwards"] [data-card]')).toHaveCount(1);
  await page.locator('[aria-label="Player 1 Forwards"] [data-card]').click();
  await page.getByRole('button', { name: 'Block this attack' }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  const allocation = page.getByRole('region', { name: 'Required choice' });
  await expect(allocation).toContainText('Assign the blocking Forward');
  const amounts = allocation.locator('[data-allocation]');
  await expect(amounts).toHaveCount(2);
  const sequenceBeforeAllocation = await page.locator('.table').getAttribute('data-view-seq');
  await amounts.nth(0).fill('1000');
  await amounts.nth(1).fill('2000');
  await expect(page.locator('#confirm-allocation')).toBeEnabled();
  expect(await page.locator('.table').getAttribute('data-view-seq')).toBe(sequenceBeforeAllocation);
  await page.getByRole('button', { name: 'Confirm allocation' }).click();
  await expect(allocation).toHaveCount(0);
  await expect(page.locator('.event-log')).toContainText('combat damage');
});

test('defender can decline a block and resolve an unblocked attack', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('party-first-strike');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  const attacker = page.locator('[aria-label="Player 2 Forwards"] [data-card]').first();
  await attacker.click();
  await page.getByRole('button', { name: 'Add to attack party' }).click();
  await page.getByRole('button', { name: 'Attack with 1 Forward' }).click();
  for (let pass = 0; pass < 5; pass += 1) {
    await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  }
  await expect(page.locator('.event-log')).toContainText('Player 1 took damage; Ember Medic entered their Damage Zone.');
  await expect(page.locator('.player-row').filter({ hasText: 'Player 1' }).locator('.damage')).toContainText('1');
});

test('First Strike Forward removes its blocker through the combat controls', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('party-first-strike');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  const firstStrikeForward = page.locator('[aria-label="Player 2 Forwards"] [data-card]')
    .filter({ hasText: 'Tide Duelist' });
  await expect(firstStrikeForward).toHaveCount(1);
  await firstStrikeForward.click();
  await page.getByRole('button', { name: 'Add to attack party' }).click();
  await page.getByRole('button', { name: 'Attack with 1 Forward' }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();

  const blocker = page.locator('[aria-label="Player 1 Forwards"] [data-card]');
  await expect(blocker).toHaveCount(1);
  await blocker.click();
  await page.getByRole('button', { name: 'Block this attack' }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();

  await expect(page.locator('[aria-label="Player 1 Forwards"] [data-card]')).toHaveCount(0);
  await expect(page.locator('[aria-label="Player 2 Forwards"] [data-card]').filter({ hasText: 'Tide Duelist' })).toHaveCount(1);
  await expect(page.locator('.player-row').filter({ hasText: 'Player 1' }).locator('.damage')).toContainText('0');
});

test('selected-card actions remain available for attack selection', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('party-first-strike');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  const card = page.locator('[aria-label="Player 2 Forwards"] [data-card]').first();
  await card.click();
  await expect(page.locator('.card-inspection-meta')).toContainText('Owner Player 2');
  await expect(page.locator('#toggle-party-member')).toBeVisible();
  await page.locator('#toggle-party-member').click();
  await expect(page.locator('#toggle-party-member')).toContainText('Remove from attack party');
  await expect(page.getByRole('button', { name: 'Attack with 1 Forward' })).toBeEnabled();
});
