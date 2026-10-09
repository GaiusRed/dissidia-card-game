import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dissidia-priority-holds', JSON.stringify({ 0: true, 1: true })));
});

test('field status and controller identity stay readable from both player views', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('battlefield-card-status');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();

  for (const seat of [1, 2]) {
    await expect(page.getByRole('region', { name: `Player ${seat} Forwards`, exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: `Player ${seat} Backups`, exact: true })).toBeVisible();
    await expect(page.locator(`[aria-label="Player ${seat} Backups"] .card.dull`)).toHaveCount(1);
  }
  const firstForward = page.locator('[aria-label="Player 1 Forwards"] .card');
  await firstForward.click();
  await expect(page.locator('.card-inspection-meta')).toContainText('1 damage');
  await expect(page.locator('.card-inspection-meta')).toContainText('Freeze');
  const ids = await page.locator('.table [data-table-instance]').evaluateAll(nodes =>
    nodes.map(node => (node as HTMLElement).dataset.tableInstance));
  expect(new Set(ids).size).toBe(ids.length);

  await page.locator('#inspect').click();
  const secondForward = page.locator('[aria-label="Player 2 Forwards"] .card');
  await secondForward.click();
  await expect(page.locator('.card-inspection-meta')).toContainText('2 damage');
  const viewedIds = await page.locator('.table [data-table-instance]').evaluateAll(nodes =>
    nodes.map(node => (node as HTMLElement).dataset.tableInstance));
  expect(new Set(viewedIds).size).toBe(viewedIds.length);
});
