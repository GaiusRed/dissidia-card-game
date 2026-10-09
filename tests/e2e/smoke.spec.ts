import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dissidia-priority-holds', JSON.stringify({ 0: true, 1: true })));
});

test('starts a match, completes setup, and advances priority from the real controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'New match' }).click();
  await page.getByRole('button', { name: 'Take first turn' }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await expect(page.getByText('MAIN1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pass priority' }).click();
  await page.getByRole('button', { name: 'Pass priority' }).click();
  await expect(page.getByText('ATTACK', { exact: true })).toBeVisible();
  await expect(page.getByRole('log', { name: 'Game log' })).toContainText('passed priority');
  expect(errors).toEqual([]);
});

test('lets a player order the mulligan cards through the decision dock', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New match' }).click();
  await page.locator('[data-choice]').first().click();
  await page.locator('[data-choice="redraw"]').click();
  const choices = page.locator('[data-order-choice]');
  await expect(choices).toHaveCount(5);
  for (let index = 0; index < 5; index += 1) await choices.nth(index).click();
  await expect(page.getByRole('button', { name: 'Confirm order' })).toBeEnabled();
  await expect(page.getByText('Choose order 5/5')).toBeVisible();
});

test('pre-caches the release for a second load without network', async ({ page, context }) => {
  const requests: Array<{ url: string; type: string }> = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('request', request => requests.push({ url: request.url(), type: request.resourceType() }));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Ready for offline play')).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => navigator.serviceWorker.ready.then(registration => registration.active?.state));
  const offlineCacheEvidence = await page.evaluate(async () => ({
    registrations: (await navigator.serviceWorker.getRegistrations()).map(registration => registration.active?.state ?? null),
    shellCaches: (await caches.keys()).filter(name => name.startsWith('dissidia-shell-')),
    build: document.documentElement.dataset.clientBuild,
  }));
  expect(offlineCacheEvidence.registrations).toContain('activated');
  expect(offlineCacheEvidence.shellCaches.length).toBeGreaterThan(0);
  expect(offlineCacheEvidence.build).toBeTruthy();
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'New match' })).toBeEnabled();
  await page.getByRole('button', { name: 'New match' }).click();
  await expect(page.getByRole('region', { name: 'Required choice' })).toBeVisible();
  const baseOrigin = new URL(page.url()).origin;
  const externalRequests = requests.filter(request => new URL(request.url).origin !== baseOrigin);
  expect(externalRequests, `cached play made remote requests: ${JSON.stringify(externalRequests)}`).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  const savedMatch = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dissidia-playtest', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const saved = await new Promise<any>((resolve, reject) => {
      const request = database.transaction('match', 'readonly').objectStore('match').get('current');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return { origin: saved?.originDescriptor, transcript: saved?.transcript, clientBuild: saved?.clientBuild,
      decision: saved?.state.choice?.kind };
  });
  expect(savedMatch.origin.kind).toBe('normal');
  expect(savedMatch.origin.seed).toBeGreaterThan(0);
  expect(savedMatch.transcript).toEqual([]);
  expect(savedMatch.clientBuild).toBe(offlineCacheEvidence.build);
  expect(savedMatch.decision).toBe('starting-player');
});
test('edits and saves a singleton deck using the accessible catalog controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deck editor' }).click();
  await expect(page.getByText('19 / 19')).toBeVisible();
  const commander = page.getByLabel('COMMANDER');
  await commander.selectOption('P-021L');
  await expect(commander).toHaveValue('P-021L');
  await expect(page.getByRole('button', { name: 'Save for Player 1' })).toBeDisabled();
  await commander.selectOption('P-001L');
  const search = page.getByLabel('SEARCH');
  await search.fill('P-011R');
  await expect(page.getByRole('button', { name: 'Add Quartermaster' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Ash Recruit' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove Quartermaster' }).click();
  await page.getByRole('button', { name: 'Add Quartermaster' }).click();
  await page.getByRole('button', { name: 'Save for Player 1' }).click();
  await expect(page.getByLabel('PLAYER 1 DECK')).toContainText('Saved custom deck');
  await page.reload();
  await expect(page.getByLabel('PLAYER 1 DECK')).toContainText('Saved custom deck');
});

test('does not offer a saved deck that fails current format validation', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('dissidia-playtest', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('decks', 'readwrite');
      transaction.objectStore('decks').put({ id: 'custom-0', name: 'Invalid saved deck', deck: { commander: 'P-001L', main: [] } });
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  }));
  await page.reload();
  await expect(page.getByRole('status')).toContainText('invalid saved deck');
  await expect(page.locator('#deck-one option[value="custom-one"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New match', exact: true })).toBeEnabled();
});

test('restores an incomplete deck editor draft after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deck editor', exact: true }).click();
  await page.getByRole('button', { name: 'Remove Quartermaster' }).click();
  await expect(page.getByText('18 / 19')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('dissidia-editor-draft-0'))).not.toBeNull();
  await page.reload();
  await page.getByRole('button', { name: 'Deck editor', exact: true }).click();
  await expect(page.getByText('18 / 19')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Quartermaster' })).toBeEnabled();
});

test('restores the exact open mulligan decision after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New match' }).click();
  await page.getByRole('button', { name: 'Take first turn' }).click();
  await expect(page.getByRole('button', { name: 'Keep', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Keep', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await expect(page.getByText('MAIN1', { exact: true })).toBeVisible();
});

test('reviews a pointer-dragged playable Forward before casting it at both desktop sizes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.locator('#match-seed').fill('1');
  await page.getByRole('button', { name: 'New match' }).click();
  await page.getByRole('button', { name: 'Take first turn' }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  const handCard = page.locator('.hand-fan .card.playable').filter({ hasText: 'Forward' }).first();
  await expect(handCard).toBeVisible();
  const forwardName = (await handCard.locator('strong').textContent())?.trim();
  expect(forwardName).toBeTruthy();
  const handBounds = await handCard.boundingBox();
  const fieldBounds = await page.locator('#battlefield-drop').boundingBox();
  expect(handBounds).not.toBeNull();
  expect(fieldBounds).not.toBeNull();
  await page.mouse.move(handBounds!.x + handBounds!.width / 2, handBounds!.y + handBounds!.height / 2);
  await page.mouse.down();
  await page.mouse.move(fieldBounds!.x + fieldBounds!.width / 2, fieldBounds!.y + fieldBounds!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole('region', { name: 'Payment draft' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Confirm cast/ })).toBeVisible();
  await expect(page.locator('.hand-zone')).toContainText(forwardName!);
  await expect(page.locator('.battlefield')).not.toContainText(forwardName!);
  await page.getByRole('button', { name: /Confirm cast/ }).click();
  await expect(page.locator('.battlefield')).toContainText(forwardName!);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.getByRole('button', { name: 'Pass priority' })).toBeVisible();
  await expect(page.locator('.bottom-bar')).toBeVisible();
  expect(errors).toEqual([]);
});

test('shows one physical Commander in the Command Zone', async ({ page }) => {
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.getByRole('button', { name: 'New match' }).click();
  await page.getByRole('button', { name: 'Take first turn' }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  const zone = page.locator('.own-zones');
  await expect(zone.locator('.zone-label')).toContainText('COMMAND ZONE');
  await expect(zone.locator('[data-card]')).toHaveCount(1);
  await expect(zone.locator('[data-card]')).toContainText(/Cinder Marshal|Tide Warden/);
});

test('casts the Commander from its zone without adding it to hand', async ({ page }) => {
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.getByRole('button', { name: 'New match' }).click();
  await page.getByRole('button', { name: 'Take first turn' }).click();
  const firstMulliganSeat = await page.locator('.choice-panel .eyebrow').textContent();
  const secondMulliganSeat = firstMulliganSeat?.includes('PLAYER 1') ? 'PLAYER 2 DECISION' : 'PLAYER 1 DECISION';
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await expect(page.locator('.choice-panel .eyebrow')).toHaveText(secondMulliganSeat);
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pass priority' })).toBeVisible();
  const handLabel = page.locator('.hand-zone > .zone-label');
  const handBefore = (await handLabel.textContent())?.match(/HAND\s+(\d+)/)?.[1];
  const commander = page.locator('.own-zones .card');
  const commanderInstance = await commander.getAttribute('data-table-instance');
  expect(commanderInstance).toBeTruthy();
  await commander.click();
  await page.getByRole('button', { name: /Review Cast Commander/ }).click();
  await page.getByRole('button', { name: /Confirm Commander cast/ }).click();
  await expect(page.locator('.battlefield')).toContainText('Cinder Marshal');
  await expect(page.locator(`[data-table-instance="${commanderInstance}"]`)).toHaveCount(1);
  await expect(page.locator(`[data-table-instance="${commanderInstance}"]`)).toHaveAttribute('data-zone', 'field');
  await expect(page.locator('.own-zones .card')).toHaveCount(0);
  await expect(page.locator('.commander-status')).toContainText('Cinder Marshal');
  const handAfter = (await handLabel.textContent())?.match(/HAND\s+(\d+)/)?.[1];
  expect(handBefore).toBe('6');
  expect(handAfter).toBe('4');
});

test('reviews a targeted Summon before submitting its cast', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('return-tide-affordable');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const tide = page.locator('[aria-label="Player 2 hand"] [data-card]').filter({ hasText: 'Return Tide' });
  await tide.click();
  await page.getByRole('button', { name: 'Review Summon · 2 CP', exact: true }).click();
  const target = page.locator('[aria-label="Player 1 Forwards"] [data-card]').first();
  await target.click();
  await expect(page.getByRole('button', { name: 'Confirm Summon · 2 CP', exact: true })).toBeVisible();
  await expect(page.locator('.event-log')).not.toContainText('summon cast');
  await expect(target).toBeVisible();

  await page.getByRole('button', { name: 'Confirm Summon · 2 CP', exact: true }).click();
  await expect(page.locator('.event-log')).toContainText('Player 2 cast Return Tide.');
  await expect(page.locator('.stack-row [data-card]')).toHaveCount(1);
});

test('moves a field Commander back to its zone without duplicating its physical card', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('commander-destinations');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const commander = page.locator('[aria-label="Player 1 Forwards"] [data-card]').filter({ hasText: 'Cinder Marshal' });
  const physicalId = await commander.getAttribute('data-table-instance');
  expect(physicalId).toBeTruthy();
  const tide = page.locator('.hand-fan [data-card]').filter({ hasText: 'Return Tide' });
  await tide.click();
  await page.getByRole('button', { name: 'Review Summon · 2 CP', exact: true }).click();
  await commander.click();
  await page.locator('.card[data-payment-option="backup"]').filter({ hasText: 'Tide Witness' }).click();
  await page.getByRole('button', { name: 'Confirm Summon · 2 CP', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Required choice' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Required choice' })).toContainText('Commander');
  await page.getByRole('button', { name: 'Return to Command Zone', exact: true }).click();
  await expect(page.locator(`[data-table-instance="${physicalId}"]`)).toHaveCount(1);
  await expect(page.locator(`[data-table-instance="${physicalId}"]`)).toHaveAttribute('data-zone', 'commander');
});

test('tracks the Commander zone when its owner chooses a normal destination', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('commander-destinations');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const commander = page.locator('[aria-label="Player 1 Forwards"] [data-card]').filter({ hasText: 'Cinder Marshal' });
  const physicalId = await commander.getAttribute('data-table-instance');
  const tide = page.locator('.hand-fan [data-card]').filter({ hasText: 'Return Tide' });
  await tide.click();
  await page.getByRole('button', { name: 'Review Summon · 2 CP', exact: true }).click();
  await commander.click();
  await page.locator('.card[data-payment-option="backup"]').filter({ hasText: 'Tide Witness' }).click();
  await page.getByRole('button', { name: 'Confirm Summon · 2 CP', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Use normal destination', exact: true }).click();
  await expect(page.locator(`[data-table-instance="${physicalId}"]`)).toHaveCount(1);
  await expect(page.locator(`[data-table-instance="${physicalId}"]`)).toHaveAttribute('data-zone', 'hand');
  await expect(page.locator('.own-zones .commander-status')).toContainText('In hand');
  await expect(page.locator(`.hand-fan [data-table-instance="${physicalId}"]`)).toHaveCount(1);
});

test('keeps one Commander identity when a Summon sends it to the removed zone', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('commander-removed-destination');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const commander = page.locator('[aria-label="Player 2 Forwards"] [data-card]').filter({ hasText: 'Tide Warden' });
  const physicalId = await commander.getAttribute('data-table-instance');
  expect(physicalId).toBeTruthy();

  const summon = page.locator('[aria-label="Player 1 hand"] [data-card]').filter({ hasText: 'Controlled Burn' });
  await summon.click();
  await page.getByRole('button', { name: 'Review Summon · 3 CP', exact: true }).click();
  await page.getByRole('button', { name: 'Remove a Forward', exact: true }).click();
  await commander.click();
  await page.getByRole('button', { name: 'Confirm Summon · 3 CP', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();

  const choice = page.getByRole('region', { name: 'Required choice' });
  await expect(choice).toContainText('Commander');
  await page.getByRole('button', { name: 'Use normal destination', exact: true }).click();
  await expect(page.locator(`[data-table-instance="${physicalId}"]`)).toHaveCount(1);
  await expect(page.locator(`[data-table-instance="${physicalId}"]`)).toHaveAttribute('data-zone', 'removed');
});

test('keeps one Commander identity when a Summon sends it to the Break Zone', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('commander-break-destination');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const commander = page.locator('[aria-label="Player 2 Forwards"] [data-card]').filter({ hasText: 'Tide Warden' });
  const physicalId = await commander.getAttribute('data-table-instance');
  expect(physicalId).toBeTruthy();

  const summon = page.locator('[aria-label="Player 1 hand"] [data-card]').filter({ hasText: 'Ashen Verdict' });
  await summon.click();
  await page.getByRole('button', { name: 'Review Summon · 3 CP', exact: true }).click();
  await commander.click();
  await page.getByRole('button', { name: 'Confirm Summon · 3 CP', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();
  await page.getByRole('button', { name: 'Pass priority', exact: true }).click();

  const choice = page.getByRole('region', { name: 'Required choice' });
  await expect(choice).toContainText('Commander');
  await page.getByRole('button', { name: 'Use normal destination', exact: true }).click();
  const physicalIdentity = page.locator(`[data-table-instance="${physicalId}"]`);
  await expect(physicalIdentity).toHaveCount(1);
  await expect(physicalIdentity).toHaveAttribute('data-zone', 'break');
});
