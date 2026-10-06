import { expect, test } from '@playwright/test';

test('starts a focused offline scenario from its validated origin', async ({ page }) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('end-trigger-order');
  await expect(page.locator('#scenario-select')).toHaveValue('end-trigger-order');
  await page.getByRole('button', { name: 'Start scenario' }).click();
  await expect(page.getByText('MAIN2')).toBeVisible();
  await expect(page.getByText('Mist Caller')).toBeVisible();
  await expect(page.getByText('Rising Undertow')).toBeVisible();
  await page.reload();
  await expect(page.getByText('MAIN2')).toBeVisible();
  await expect(page.getByText('Mist Caller')).toBeVisible();
});
