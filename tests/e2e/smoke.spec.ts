import { expect, test } from '@playwright/test';

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

test('keeps contextual choices in the bottom-left at both desktop sizes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: 'New match' }).click();
  const dock = page.getByRole('region', { name: 'Choices' });
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await expect(dock).toBeVisible();
    const bounds = await dock.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x + bounds!.width).toBeLessThan(viewport.width * 0.30);
    expect(bounds!.y).toBeGreaterThan(viewport.height * 0.60);
  }
});

test('pre-caches the release for a second load without network', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByText('Ready for offline play')).toBeVisible({ timeout: 15_000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'New match' })).toBeEnabled();
  await page.getByRole('button', { name: 'New match' }).click();
  await expect(page.getByRole('region', { name: 'Choices' })).toBeVisible();
});

test('edits and saves a singleton deck using the accessible catalog controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deck editor' }).click();
  await expect(page.getByText('19 / 19')).toBeVisible();
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

test('drags a playable Forward from the fan into the battlefield at both desktop sizes', async ({ page }) => {
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
  await expect(page.locator('.battlefield')).toContainText(forwardName!);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.getByRole('button', { name: 'Pass priority' })).toBeVisible();
  await expect(page.locator('.bottom-bar')).toBeVisible();
  const hand = await page.locator('.hand-zone').boundingBox();
  const dock = await page.locator('.bottom-bar').boundingBox();
  expect(hand && dock && hand.y + hand.height).toBeLessThanOrEqual(dock!.y + 2);
  expect(errors).toEqual([]);
});
