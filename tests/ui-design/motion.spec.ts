import { expect, test } from '@playwright/test';

test('accepted cast shows the same final state with motion on and off', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#match-seed').fill('1');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await expect(page.getByText('MAIN1', { exact: true })).toBeVisible();

  const sequence = Number(await page.locator('.table').getAttribute('data-view-seq'));
  await page.locator('.hand-fan [data-card]').filter({ hasText: 'Ash Recruit' }).click();
  await page.getByRole('button', { name: /Review cast/ }).click();
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', String(sequence));
  await expect(page.locator('[data-event-motion]')).toHaveCount(0);
  await page.getByRole('button', { name: /Confirm cast/ }).click();

  const castCard = page.locator('.battlefield [data-card]').filter({ hasText: 'Ash Recruit' });
  await expect(castCard).toBeVisible();
  await expect(castCard).toHaveAttribute('data-event-motion', 'cast');
  await expect(page.locator('.hand-fan')).not.toContainText('Ash Recruit');
  await expect(page.locator('.table')).toHaveAttribute('data-view-seq', String(sequence + 1));
  const duration = Number.parseFloat(await castCard.evaluate(node => getComputedStyle(node).animationDuration));
  if (info.project.use.reducedMotion === 'reduce') expect(duration).toBeLessThanOrEqual(0.01);
  else expect(duration).toBeGreaterThan(0.1);
});
