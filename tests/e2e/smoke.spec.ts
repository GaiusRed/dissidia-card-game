import { expect, test } from '@playwright/test';

test('starts with the approved light theme tokens and readable text', async ({ page }) => {
  await page.goto('/');
  const theme = await page.locator('html').evaluate(element => {
    const root = getComputedStyle(element);
    const app = getComputedStyle(document.querySelector('#app')!);
    return {
      colorScheme: root.colorScheme,
      canvas: root.getPropertyValue('--canvas').trim(),
      surface: root.getPropertyValue('--surface').trim(),
      text: root.getPropertyValue('--text').trim(),
      appBackground: app.backgroundColor,
      appColor: app.color,
    };
  });
  expect(theme).toMatchObject({
    colorScheme: 'light', canvas: '#f7f5ef', surface: '#fff', text: '#172b3a',
    appBackground: 'rgb(247, 245, 239)', appColor: 'rgb(23, 43, 58)',
  });
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

test('keeps contextual choices in the reserved bottom dock at both desktop sizes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: 'New match' }).click();
  const dock = page.getByRole('region', { name: 'Required choice' });
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await expect(dock).toBeVisible();
    await expect.poll(() => dock.boundingBox()).not.toBeNull();
    const bounds = await dock.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBe(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width * 0.56);
    expect(bounds!.y).toBeGreaterThan(viewport.height * 0.60);
  }
});

test('lets a player order the mulligan cards through the bottom-left choice dock', async ({ page }) => {
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
  await page.goto('/');
  await expect(page.getByText('Ready for offline play')).toBeVisible({ timeout: 15_000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'New match' })).toBeEnabled();
  await page.getByRole('button', { name: 'New match' }).click();
  await expect(page.getByRole('region', { name: 'Required choice' })).toBeVisible();
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

test('reviews a dragged playable Forward before casting it at both desktop sizes', async ({ page }) => {
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
  await handCard.dragTo(page.locator('#battlefield-drop'));
  await expect(page.getByRole('region', { name: 'Payment draft' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Confirm cast/ })).toBeVisible();
  await expect(page.locator('.hand-zone')).toContainText(forwardName!);
  await expect(page.locator('.battlefield')).not.toContainText(forwardName!);
  await page.getByRole('button', { name: /Confirm cast/ }).click();
  await expect(page.locator('.battlefield')).toContainText(forwardName!);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.getByRole('button', { name: 'Pass priority' })).toBeVisible();
  await expect(page.locator('.bottom-bar')).toBeVisible();
  const hand = await page.locator('.hand-zone').boundingBox();
  const dock = await page.locator('.bottom-bar').boundingBox();
  expect(hand && dock && hand.y + hand.height).toBeLessThanOrEqual(dock!.y + 2);
  expect(errors).toEqual([]);
});

test('shows one physical Commander in the Commander Zone', async ({ page }) => {
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.getByRole('button', { name: 'New match' }).click();
  await page.getByRole('button', { name: 'Take first turn' }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  const zone = page.locator('.own-zones');
  await expect(zone.locator('.zone-label')).toContainText('COMMANDER ZONE');
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
  await commander.click();
  await page.getByRole('button', { name: /Review Cast Commander/ }).click();
  await page.getByRole('button', { name: /Confirm Commander cast/ }).click();
  await expect(page.locator('.battlefield')).toContainText('Cinder Marshal');
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
  await expect(page.locator('.event-log')).toContainText('Return Tide was cast.');
  await expect(page.locator('.stack-row [data-card]')).toHaveCount(1);
});
