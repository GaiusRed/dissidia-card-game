import { expect, test } from '@playwright/test';

test('default Smart Priority passes empty windows and records the phase', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('dissidia-priority-holds'));
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('battlefield-card-status');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();

  const log = page.getByRole('log', { name: 'Game log' });
  await expect(log).toContainText('[Smart Priority]', { timeout: 10_000 });
  await expect(log).toContainText('attack Phase');
  await expect(page.locator('#toggle-hold')).toHaveText('Hold Priority: Off');
  await expect(page.getByRole('button', { name: 'Pass priority', exact: true })).toBeVisible();
});
