import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { productionContext } from '../../src/content/context';
import { replayTranscript } from '../../src/storage/replay';
import type { MatchSave } from '../../src/storage/save';

async function submitVisibleCommand(page: Page, button: ReturnType<Page['getByRole']>): Promise<void> {
  const sequence = Number(await page.locator('.table').getAttribute('data-view-seq'));
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await button.click();
  await expect.poll(async () => Number(await page.locator('.table').getAttribute('data-view-seq'))).toBeGreaterThan(sequence);
}

async function answerVisibleChoice(page: Page): Promise<void> {
  const panel = page.getByRole('region', { name: 'Required choice' });
  const order = panel.locator('[data-order-choice]');
  if (await order.count()) {
    for (let index = 0; index < await order.count(); index += 1) await order.nth(index).click();
    await submitVisibleCommand(page, panel.getByRole('button', { name: 'Confirm order', exact: true }));
    return;
  }
  const allocation = panel.locator('[data-allocation]');
  if (await allocation.count()) {
    const description = await panel.locator('.choice-copy small').innerText();
    const total = Number(description.match(/Assign (\d+)/)?.[1]);
    if (!Number.isFinite(total)) throw new Error(`Could not read the allocation total: ${description}`);
    await allocation.first().fill(String(total));
    await submitVisibleCommand(page, panel.getByRole('button', { name: 'Confirm allocation', exact: true }));
    return;
  }
  const choices = panel.locator('[data-choice]');
  const skip = panel.getByRole('button', { name: /^(Skip|Decline|No)$/ }).first();
  if (await skip.count()) {
    await submitVisibleCommand(page, skip);
    return;
  }
  const description = await panel.locator('.choice-copy small').innerText();
  const bounds = description.match(/Choose (\d+)–?(\d+)?/);
  const minimum = Number(bounds?.[1] ?? 1);
  const maximum = Number(bounds?.[2] ?? 1);
  if (maximum === 1) {
    await submitVisibleCommand(page, choices.first());
    return;
  }
  for (let index = 0; index < minimum; index += 1) await choices.nth(index).click();
  await submitVisibleCommand(page, panel.getByRole('button', { name: 'Confirm choice', exact: true }));
}

async function makeAvailableForwardOrBackup(page: Page, _seat: number): Promise<boolean> {
  const hand = page.locator('.hand-fan .card.playable');
  const forward = hand.filter({ hasText: /Forward ·/ }).first();
  const backup = hand.filter({ hasText: /Backup ·/ }).first();
  const card = await forward.count() ? forward : backup;
  if (!(await card.count())) return false;
  await card.click();
  const review = page.getByRole('button', { name: /Review cast/ });
  if (!(await review.count())) return false;
  await review.click();
  const confirm = page.getByRole('button', { name: /Confirm cast/ });
  if (!(await confirm.isEnabled())) {
    await page.getByRole('button', { name: 'Cancel action', exact: true }).click();
    return false;
  }
  await submitVisibleCommand(page, confirm);
  return true;
}

async function declareOneAvailableAttack(page: Page, seat: number): Promise<boolean> {
  const row = page.getByRole('region', { name: `Player ${seat + 1} Forwards`, exact: true });
  const cards = row.locator('[data-card]');
  for (let index = 0; index < await cards.count(); index += 1) {
    await cards.nth(index).click();
    const add = page.getByRole('button', { name: 'Add to attack party', exact: true });
    if (await add.count()) {
      await add.click();
      await submitVisibleCommand(page, page.getByRole('button', { name: 'Attack with 1 Forward', exact: true }));
      return true;
    }
  }
  return false;
}

async function declareOneAvailableBlock(page: Page, seat: number): Promise<boolean> {
  const row = page.getByRole('region', { name: `Player ${seat + 1} Forwards`, exact: true });
  const cards = row.locator('[data-card]');
  for (let index = 0; index < await cards.count(); index += 1) {
    await cards.nth(index).click();
    const block = page.getByRole('button', { name: 'Block this attack', exact: true });
    if (await block.count()) {
      await submitVisibleCommand(page, block);
      return true;
    }
  }
  return false;
}

async function playDuel(page: Page, info: TestInfo, viewport: { width: number; height: number }, reuseOfflineShell = false): Promise<void> {
  const remoteRequests: string[] = [];
  const browserErrors: string[] = [];
  let offline = reuseOfflineShell;
  page.on('request', request => {
    if (offline && new URL(request.url()).origin !== new URL(page.url()).origin) remoteRequests.push(request.url());
  });
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.setViewportSize(viewport);
  if (!reuseOfflineShell) {
    await page.addInitScript(() => localStorage.setItem('dissidia-priority-holds', JSON.stringify({ 0: true, 1: true })));
    await page.context().setOffline(false);
    await page.goto('/');
    await expect(page.locator('#offline-status')).toHaveText('Ready for offline play', { timeout: 20_000 });
  } else {
    await expect(page.getByRole('button', { name: 'New match', exact: true })).toBeVisible();
  }
  await page.locator('#deck-one').selectOption('fire');
  await page.locator('#deck-two').selectOption('water');
  await page.locator('#match-seed').fill('1');
  await page.getByRole('button', { name: 'New match', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Take first turn', exact: true })).toBeVisible();

  await page.context().setOffline(true);
  offline = true;
  await page.reload();
  await expect(page.getByRole('button', { name: 'Take first turn', exact: true })).toBeVisible();
  await submitVisibleCommand(page, page.getByRole('button', { name: 'Take first turn', exact: true }));
  await submitVisibleCommand(page, page.getByRole('button', { name: 'Keep', exact: true }));
  await submitVisibleCommand(page, page.getByRole('button', { name: 'Keep', exact: true }));

  console.log(`Offline duel started at ${viewport.width}x${viewport.height}.`);
  const casts = new Set<number>();
  const attacks = new Set<number>();
  const blocks = new Set<number>();
  const castsThisTurn = new Set<string>();
  const attackedThisTurn = new Set<string>();
  for (let step = 0; step < 220; step += 1) {
    const hasResult = await page.locator('.result-overlay').count();
    if (hasResult) break;
    const hasChoice = await page.getByRole('region', { name: 'Required choice' }).count();
    if (hasChoice) {
      await answerVisibleChoice(page);
      continue;
    }
    if (!(await page.getByRole('button', { name: 'Pass priority', exact: true }).count())) {
      throw new Error('The duel reached a state with no result, choice, or legal priority control.');
    }
    const visibleState = await page.evaluate(() => {
      const current = document.querySelector<HTMLElement>('.player-row.current');
      const opponent = document.querySelector<HTMLElement>('.player-row.opponent');
      const currentSeat = Number(current?.dataset.seat);
      const opponentIsActive = opponent?.querySelector('.player-info small')?.textContent?.includes('ACTIVE PLAYER');
      return { seat: currentSeat, activeSeat: opponentIsActive ? 1 - currentSeat : currentSeat,
        turn: Number(document.querySelector<HTMLElement>('.table')?.dataset.turn), phase: document.querySelector<HTMLElement>('.table')?.dataset.phase?.toUpperCase() };
    });
    const { seat, activeSeat } = visibleState;
    const { turn, phase } = visibleState;
    const turnKey = `${turn}:${seat}`;

    if (phase === 'MAIN1' && seat === activeSeat && !castsThisTurn.has(turnKey)) {
      castsThisTurn.add(turnKey);
      if (await makeAvailableForwardOrBackup(page, seat)) {
        casts.add(seat);
        continue;
      }
    }
    if (phase === 'ATTACK' && seat === activeSeat && !attackedThisTurn.has(turnKey)) {
      attackedThisTurn.add(turnKey);
      if (await declareOneAvailableAttack(page, seat)) {
        attacks.add(seat);
        continue;
      }
    }
    if (phase === 'ATTACK' && seat !== activeSeat && blocks.size === 0) {
      if (await declareOneAvailableBlock(page, seat)) {
        blocks.add(seat);
        continue;
      }
    }
    await submitVisibleCommand(page, page.getByRole('button', { name: 'Pass priority', exact: true }));
  }

  const result = page.locator('.result-overlay');
  await expect(result, `duel did not reach a result at ${viewport.width}×${viewport.height}`).toBeVisible();
  const log = await page.getByRole('log', { name: 'Game log' }).innerText();
  const downloadReady = page.waitForEvent('download');
  await result.getByRole('button', { name: 'Export save', exact: true }).click();
  const download = await downloadReady;
  const savePath = info.outputPath(`offline-duel-${viewport.width}.json`);
  await download.saveAs(savePath);
  const save = JSON.parse(await readFile(savePath, 'utf8')) as MatchSave;
  console.log(`Duel at ${viewport.width}: result=${JSON.stringify(save.state.result)} casts=${JSON.stringify([...casts])} attacks=${JSON.stringify([...attacks])} blocks=${JSON.stringify([...blocks])}`);
  await info.attach(`duel-log-${viewport.width}`, { body: log, contentType: 'text/plain' });
  await info.attach(`duel-transcript-summary-${viewport.width}`, { body: JSON.stringify(save.transcript.map(command => ({ seat: command.seat, intent: command.intent.kind })), null, 2), contentType: 'application/json' });
  await expect(result, `Expected a legal winner. Visible log tail: ${log.slice(-2000)}`).toContainText(/Player [12] wins/);
  expect([...casts].sort(), log.slice(-2000)).toEqual([0, 1]);
  expect([...attacks].sort(), log.slice(-2000)).toEqual([0, 1]);
  expect(blocks.size, log.slice(-2000)).toBeGreaterThan(0);
  expect(save.originDescriptor).toMatchObject({ kind: 'normal', seed: 1 });
  expect(save.state.result).not.toBeNull();
  expect(['damage', 'deckout']).toContain(save.state.result?.reason);
  expect(save.transcript.some(command => command.intent.kind === 'cast' && command.seat === 0)).toBe(true);
  expect(save.transcript.some(command => command.intent.kind === 'cast' && command.seat === 1)).toBe(true);
  expect(save.transcript.some(command => command.intent.kind === 'attack' && command.seat === 0)).toBe(true);
  expect(save.transcript.some(command => command.intent.kind === 'attack' && command.seat === 1)).toBe(true);
  expect(save.transcript.some(command => command.intent.kind === 'block')).toBe(true);
  const replay = replayTranscript(save.origin, save, productionContext, save.receipts);
  expect(replay.state.result).toEqual(save.state.result);
  expect(remoteRequests).toEqual([]);
  expect(browserErrors).toEqual([]);
}

test('completes a normal-start contested duel offline at both target sizes and replays its export', async ({ page }, info) => {
  test.setTimeout(180_000);
  await playDuel(page, info, { width: 1280, height: 720 });
  await page.getByRole('button', { name: 'Return to menu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New match', exact: true })).toBeVisible();
  await playDuel(page, info, { width: 1920, height: 1080 }, true);
});
