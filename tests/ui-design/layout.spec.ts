import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { driver } from '../support/driver';
import { createSave } from '../../src/storage/save';

async function capture(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: 'image/png' });
}

async function start(page: Page) {
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await expect(page.locator('#pass')).toBeVisible();
}

test('hand hover is unclipped, Commander identity is unique, and inspection changes the hand', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page);
  await capture(page, info, 'normal-start');
  const duplicates = await page.locator('[data-card]').evaluateAll(nodes => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      const id = (node as HTMLElement).dataset.card!;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts].filter(([, count]) => count > 1);
  });
  expect.soft(duplicates, 'One interactive representation per physical card').toEqual([]);
  const card = page.locator('.hand-fan .card').last();
  await card.hover();
  await card.evaluate(async node => {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await Promise.all(node.getAnimations().map(animation => animation.finished.catch(() => undefined)));
  });
  const clipping = await card.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    const clips: string[] = [];
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const box = parent.getBoundingClientRect();
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY) && (bounds.top < box.top - 1 || bounds.bottom > box.bottom + 1)) clips.push(parent.className);
    }
    if (bounds.top < 0 || bounds.bottom > innerHeight) clips.push('viewport');
    return clips;
  });
  await capture(page, info, 'hand-hover');
  expect.soft(clipping, 'Lifted card must escape scroll clipping').toEqual([]);
  const before = await page.locator('.hand-zone > .zone-label').textContent();
  const requestedSeat = (await page.locator('#inspect').textContent())?.match(/Player (\d)/)?.[1];
  await page.locator('#inspect').click();
  const changedHand = await page.locator('.hand-zone > .zone-label').textContent() !== before;
  const inspectorCards = await page.getByRole('region', { name: `Player ${requestedSeat} hand`, exact: true }).locator('[data-card]').count();
  expect.soft(changedHand || inspectorCards > 0, 'Inspect must show the other hand in the table or a labeled inspection browser').toBe(true);
  expect.soft(errors).toEqual([]);
  if (info.project.use.reducedMotion === 'reduce') {
    const duration = await card.evaluate(node => getComputedStyle(node).transitionDuration);
    expect.soft(duration.split(',').every(value => parseFloat(value) <= 0.01), 'Reduced motion removes card travel transitions').toBe(true);
  }
});

test('crowded battlefield separates both players and controls stay reachable', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#scenario-select').selectOption('control-conflict');
  await page.locator('#start-scenario').click();
  await expect(page.locator('.battlefield .card')).toHaveCount(8);
  await capture(page, info, 'crowded-board');
  // Semantic rows are the presentation contract, not a color-only distinction.
  for (const seat of [1, 2]) {
    for (const type of ['Forwards', 'Backups']) {
      expect.soft(await page.getByRole('region', { name: `Player ${seat} ${type}`, exact: true }).count(), `Player ${seat} ${type} row`).toBe(1);
    }
  }
  const hiddenControls = await page.locator('.top-actions button, .phase-controls button, .choice-actions button').evaluateAll(nodes => nodes.flatMap(node => {
    const r = node.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight || !hit || !node.contains(hit)
      ? [(node.textContent ?? '').trim()] : [];
  }));
  expect.soft(hiddenControls, 'Visible controls must be inside the viewport and receive pointer input').toEqual([]);
});

test('contextual choices use consistent control heights without hiding the hand', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#match-seed').fill('2');
  await page.locator('#new-match').click();
  const heights = await page.locator('.choice-actions button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  expect.soft(Math.max(...heights) - Math.min(...heights), 'Peer choice buttons have equal height').toBeLessThanOrEqual(1);
  await capture(page, info, 'starting-choice');
  await page.getByRole('button', { name: 'Take first turn', exact: true }).click();
  await page.getByRole('button', { name: 'Redraw', exact: true }).click();
  const overlap = await page.locator('.choice-panel').evaluate(panel => {
    const a = panel.getBoundingClientRect();
    return [...document.querySelectorAll('.hand-fan .card')].filter(card => {
      const b = card.getBoundingClientRect();
      return Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
    }).length;
  });
  await capture(page, info, 'mulligan-choice');
  expect.soft(overlap, 'Choice dock must not cover cards needed for the decision').toBe(0);
});

test('deck search retains focus through a real typing sequence', async ({ page }, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deck editor', exact: true }).click();
  const search = page.getByLabel('SEARCH', { exact: true });
  await search.click();
  await search.pressSequentially('Tide', { delay: 50 });
  await capture(page, info, 'deck-search');
  expect.soft(await search.inputValue(), 'Rerender must retain input focus and all typed characters').toBe('Tide');
  await expect.soft(search).toBeFocused();
});

test('mandatory two-card discard offers revision and explicit confirmation', async ({ page }, info) => {
  const d = driver({ phase: 'end', placements: ['P-003C', 'P-004C', 'P-005R', 'P-006R', 'P-009C', 'P-010C', 'P-015C']
    .map(card => ({ seat: 0 as const, card, zone: 'hand' as const })) });
  expect(d.send({ kind: 'pass' }).ok).toBe(true);
  expect(d.send({ kind: 'pass' }).ok).toBe(true);
  expect(d.state.choice?.min).toBe(2);
  await start(page);
  await page.locator('#import-save').setInputFiles({ name: 'audit-hand-limit.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(createSave(d.state, []))) });
  await expect(page.getByRole('region', { name: 'Choices' })).toContainText('discard 2 cards');
  await capture(page, info, 'two-card-discard');
  expect.soft(await page.getByRole('region', { name: 'Choices' }).getByRole('button', { name: /Confirm/ }).count(),
    'A mandatory multi-card decision needs a Confirm control').toBe(1);
  const option = page.locator('[data-choice]').first();
  if (await option.count()) {
    await option.click();
    expect.soft(await page.locator('.toast').textContent(), 'Selecting one card edits a draft instead of submitting an invalid answer').toBe('');
  }
});

test('selected-card actions fit the footer and use equal peer button heights', async ({ page }, info) => {
  const d = driver({ phase: 'attack', placements: [
    { seat: 0, card: 'P-001L', zone: 'field' }, { seat: 0, card: 'P-002C', zone: 'hand' },
    { seat: 0, card: 'P-005R', zone: 'hand' }, { seat: 1, card: 'P-024C', zone: 'field' },
  ] });
  await start(page);
  await page.locator('#import-save').setInputFiles({ name: 'audit-controls.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(createSave(d.state, []))) });
  await expect(page.locator('.battlefield .card')).toHaveCount(2);
  await page.locator(`.battlefield [data-card="${d.object(0, 'P-001L')}"]`).click();
  await expect(page.locator('#attack-card')).toBeVisible();
  await expect(page.locator('[data-ability]')).toHaveCount(1);
  await capture(page, info, 'selected-actions');
  const geometry = await page.locator('.selected-preview button').evaluateAll(nodes => {
    const footer = document.querySelector('.bottom-bar')!.getBoundingClientRect();
    const rects = nodes.map(node => node.getBoundingClientRect());
    return { heights: rects.map(rect => rect.height), outside: rects.some(rect => rect.top < footer.top || rect.bottom > footer.bottom),
      occluded: nodes.some(node => {
        const r = node.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !hit || !node.contains(hit);
      }) };
  });
  expect.soft(geometry.outside, 'Card actions fit their reserved footer area').toBe(false);
  expect.soft(geometry.occluded, 'Card actions receive pointer input').toBe(false);
  expect.soft(Math.max(...geometry.heights) - Math.min(...geometry.heights), 'Peer card actions use equal heights').toBeLessThanOrEqual(1);
});
