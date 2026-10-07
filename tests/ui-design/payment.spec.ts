import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

async function beginMatch(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.locator('#match-seed').fill('1');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
}

test('payment draft lets the player revise suggested CP sources before confirming a cast', async ({ page }, info) => {
  await beginMatch(page);
  const ash = page.locator('.hand-fan [data-card]').filter({ hasText: 'Ash Recruit' });
  await ash.click();
  await page.getByRole('button', { name: /Review cast/ }).click();

  const panel = page.getByRole('region', { name: 'Payment draft' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('1 CP');
  await expect(page.locator('.hand-fan')).toContainText('Ash Recruit');
  await expect(page.locator('.battlefield')).not.toContainText('Ash Recruit');
  const panelBox = await panel.boundingBox();
  const confirmBox = await page.locator('#confirm-cast').boundingBox();
  const cancelBox = await page.locator('#cancel-draft').boundingBox();
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(panelBox && panelBox.x + panelBox.width).toBeLessThanOrEqual(viewportWidth);
  expect(panelBox && panelBox.width).toBeLessThanOrEqual(560);
  expect(confirmBox && cancelBox && Math.abs(confirmBox.width - cancelBox.width)).toBeLessThanOrEqual(2);
  expect(confirmBox && cancelBox && Math.abs(confirmBox.height - cancelBox.height)).toBeLessThanOrEqual(2);
  const reviewScreenshot = info.outputPath('payment-draft-review.png');
  await page.screenshot({ path: reviewScreenshot, fullPage: true });
  await info.attach('payment-draft-review', { path: reviewScreenshot, contentType: 'image/png' });
  const sources = panel.locator('[data-payment-source]');
  await expect(sources).not.toHaveCount(0);
  await expect(page.locator('#confirm-cast')).toBeEnabled();

  await panel.locator('[data-payment-source][aria-pressed="true"]').first().click();
  await expect(page.locator('#confirm-cast')).toBeDisabled();
  await expect(page.locator('.event-log')).not.toContainText('was cast');

  await panel.locator('[data-payment-source][aria-pressed="false"]').first().click();
  await expect(page.locator('#confirm-cast')).toBeEnabled();
  await expect(panel).toContainText('Generated 2');
  await expect(panel).toContainText('Spent 1');
  await expect(page.locator('.hand-fan')).toContainText('Ash Recruit');
  await page.getByRole('button', { name: /Confirm cast/ }).click();
  await expect(page.locator('.battlefield')).toContainText('Ash Recruit');
});

test('Escape cancels an uncommitted payment draft without submitting the cast', async ({ page }) => {
  await beginMatch(page);
  const ash = page.locator('.hand-fan [data-card]').filter({ hasText: 'Ash Recruit' });
  await ash.click();
  await page.getByRole('button', { name: /Review cast/ }).click();
  await expect(page.getByRole('region', { name: 'Payment draft' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Payment draft' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Confirm cast/ })).toHaveCount(0);
  await expect(page.locator('.hand-fan')).toContainText('Ash Recruit');
  await expect(page.locator('.battlefield')).not.toContainText('Ash Recruit');
});

test('activated abilities review source costs and targets before confirmation', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('commander-third-cast');
  await page.getByRole('button', { name: 'Start scenario', exact: true }).click();

  const source = page.locator('.battlefield [data-card]').filter({ hasText: 'Forge Apprentice' });
  const target = page.locator('.battlefield [data-card]').filter({ hasText: 'Spark Runner' });
  await expect(source).toBeVisible();
  await expect(target).toBeVisible();
  await source.click();
  const abilityButton = page.getByRole('button', { name: 'Activate ability' });
  await expect(page.locator('.selected-preview .selection-detail')).toContainText('Choose 1 Fire Forward');
  await abilityButton.click();

  const payment = page.getByRole('region', { name: 'Payment draft' });
  await expect(payment).toBeVisible();
  await expect(payment).toContainText('Cost 0 CP');
  await expect(payment).toContainText('Dull source');
  await target.click();
  await expect(page.getByRole('button', { name: 'Confirm ability' })).toBeEnabled();
  const abilityTextClipped = await abilityButton.evaluate(button => {
    const element = button as HTMLElement;
    return element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1;
  });
  expect(abilityTextClipped, 'activated ability text must fit inside its control').toBe(false);
  const layoutIssues = await page.evaluate(() => {
    const issues: string[] = [];
    const handTop = document.querySelector<HTMLElement>('.hand-zone')!.getBoundingClientRect().top;
    const battlefieldBottom = document.querySelector<HTMLElement>('.battlefield')!.getBoundingClientRect().bottom;
    if (battlefieldBottom > handTop + 1) issues.push('battlefield viewport overlaps the hand');
    for (const row of document.querySelectorAll<HTMLElement>('.field-row')) {
      const area = row.getBoundingClientRect();
      for (const card of row.querySelectorAll<HTMLElement>('.card')) {
        const box = card.getBoundingClientRect();
        if (box.top < area.top - 14 || box.bottom > area.bottom + 1) issues.push(`card clipped in ${row.getAttribute('aria-label')}`);
      }
    }
    const controls = [...document.querySelectorAll<HTMLElement>(
      '.selected-preview [data-ability], .selected-preview #confirm-ability, .selected-preview #cancel-draft, .selected-preview .payment-draft',
    )].map(node => ({ label: node.id || node.getAttribute('data-ability') || 'payment', box: node.getBoundingClientRect() }));
    for (let left = 0; left < controls.length; left += 1) {
      for (let right = left + 1; right < controls.length; right += 1) {
        const a = controls[left]!.box;
        const b = controls[right]!.box;
        if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) {
          issues.push(`${controls[left]!.label} overlaps ${controls[right]!.label}`);
        }
      }
    }
    return issues;
  });
  expect(layoutIssues).toEqual([]);
  const screenshot = await page.screenshot({ fullPage: true });
  await info.attach('activated-ability-payment-review', { body: screenshot, contentType: 'image/png' });
  const evidence = resolve(process.cwd(), 'docs/ui-captures');
  mkdirSync(evidence, { recursive: true });
  writeFileSync(resolve(evidence, `payment-activation-${info.project.name}.png`), screenshot);

  await page.getByRole('button', { name: 'Confirm ability' }).click();
  await expect(page.getByRole('region', { name: 'Payment draft' })).toHaveCount(0);
  await expect(page.locator('.event-log')).toContainText('activated');
  await page.locator('#pass').click();
  await page.locator('#pass').click();
  await expect(target).toContainText('5000 power');
  await expect(source).toHaveClass(/dull/);
});
