import { test, expect, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.addInitScript(() => localStorage.setItem('dissidia-priority-holds', JSON.stringify({ 0: true, 1: true })));
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
}

test('all own piles remain clickable beside the hand and battlefield fits vertically', async ({ page }) => {
  await start(page);
  for (const zone of ['deck', 'break zone', 'damage zone', 'removed zone']) {
    await page.getByRole('button', { name: `Inspect Player 1 ${zone}`, exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  const bounds = await page.locator('.battlefield').evaluate(node => ({ height: node.clientHeight, content: node.scrollHeight }));
  expect(bounds.content).toBeLessThanOrEqual(bounds.height + 1);
});

test('selection can be cleared and inspection has separate face and details', async ({ page }) => {
  await start(page);
  await expect(page.locator('.hand-fan [data-card]').filter({ hasText: 'Final Spark' }).locator('.card-rules')).toContainText('2 points of damage');
  const rules = await page.locator('.hand-fan [data-card]').filter({ hasText: 'Cinder Witness' }).locator('.card-rules').evaluate(node => ({ visible: node.clientHeight, content: node.scrollHeight }));
  expect(rules.content).toBeLessThanOrEqual(rules.visible + 1);
  const card = page.locator('.hand-fan [data-card]').first();
  await card.click();
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
  await expect(page.locator('.selected-preview')).toHaveCount(0);
  await card.click({ button: 'right' });
  const inspector = page.getByRole('dialog');
  await expect(inspector.locator('.inspector-details')).toBeVisible();
  await expect(inspector.locator('.inspector-face')).toBeVisible();
  await expect(inspector.locator('.inspector-details')).toContainText(/P-\d/);
  await expect(page.locator('.hand-fan .card-number')).toHaveCount(0);
});

test('log can be hidden and reopened without losing the current turn header', async ({ page }) => {
  await start(page);
  await expect(page.locator('.log-header')).toContainText('Turn 1');
  const before = await page.locator('.center-table').boundingBox();
  await page.getByRole('button', { name: 'Hide log', exact: true }).click();
  await expect(page.locator('.event-log')).toHaveCount(0);
  const after = await page.locator('.center-table').boundingBox();
  expect(after!.width).toBeGreaterThan(before!.width);
  await page.getByRole('button', { name: 'Show log', exact: true }).click();
  await expect(page.locator('.log-header')).toContainText('Turn 1');
});
