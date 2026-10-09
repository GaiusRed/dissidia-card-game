import { expect, test } from '@playwright/test';

test('default Smart Priority passes empty windows and records the phase', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('dissidia-priority-holds'));
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('battlefield-card-status');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();

  const log = page.getByRole('log', { name: 'Game log' });
  await expect(log).toContainText('automatically', { timeout: 10_000 });
  await expect(log).toContainText('Attack Phase');
  await expect(page.locator('#toggle-hold')).toHaveText('Hold Priority: Off');
  await expect(page.getByRole('button', { name: 'Pass priority', exact: true })).toBeVisible();
});

test('End Turn advances through remaining phases and stops at the next turn', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('dissidia-priority-holds'));
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('return-tide-affordable');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();
  const turn = Number(await page.locator('.table').getAttribute('data-turn'));
  await page.getByRole('button', { name: 'End Turn', exact: true }).click();
  await expect(page.locator('.table')).toHaveAttribute('data-turn', String(turn + 1));
  await expect(page.locator('.table')).toHaveAttribute('data-phase', 'main1');
  await expect(page.getByRole('button', { name: 'End Turn', exact: true })).toBeVisible();
  await expect(page.getByRole('log', { name: 'Game log' })).toContainText('End Phase');
});

test('End Turn preserves a held opponent window and can be canceled there', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dissidia-priority-holds', JSON.stringify({ 0: false, 1: true })));
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'End Turn', exact: true }).click();
  await expect(page.locator('.player-row.current')).toHaveAttribute('data-seat', '1');
  const sequence = await page.locator('.table').getAttribute('data-view-seq');
  await page.getByRole('button', { name: 'Cancel End Turn', exact: true }).click();
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', sequence!);
  await expect(page.getByRole('button', { name: 'Cancel End Turn', exact: true })).toHaveCount(0);
  await expect(page.locator('#toggle-hold')).toHaveText('Hold Priority: On');
});
