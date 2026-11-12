// UI: Gancho do Estúdio de marketing — itens por categoria observados (REA ev_7b82c3d1…6e71; relatório de hooks no Drive).
import assert from 'node:assert/strict';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('marketing_hooks_ui')) process.exit(0);
const f = await startUiFixture('piperline-hooks-'); let browser;
try {
  browser = await launchChromium(); const page = await browser.newPage();
  await page.goto(`${f.base}/#/marketing`); await page.locator('#hook').click();
  assert.equal(await page.locator('#mq').getAttribute('placeholder'), 'Search hook');
  assert.deepEqual(await page.locator('#mcats button').allTextContents(), ['All', 'Eye-Catching Visuals', 'Video Formats', 'Persuasive Messaging', 'Catchy Sounds', 'Standout Styles']);
  const counts = {};
  for (const [cat, total] of [['Eye-Catching Visuals', 9], ['Video Formats', 9], ['Persuasive Messaging', 7], ['Catchy Sounds', 7], ['Standout Styles', 8]]) {
    await page.locator('#mcats button', { hasText: cat }).click();
    counts[cat] = await page.locator('.mk-card').count();
    assert.equal(counts[cat], total, `${cat} deve ter ${total} ganchos observados`);
  }
  await page.locator('#mcats button', { hasText: 'All' }).click();
  await page.fill('#mq', 'ASMR Unboxing');
  assert.equal(await page.locator('.mk-card').count(), 1, 'busca filtra o gancho observado');
  await page.locator('.mk-card').first().locator('[data-sel]').click();
  assert.equal(await page.locator('.modal').count(), 0, 'selecionar fecha o diálogo');
  assert.match(await page.locator('#mkchips').innerText(), /Gancho: ASMR Unboxing/);
  await page.locator('#mkchips [data-x="hook"]').click();
  assert.equal((await page.locator('#mkchips').innerText()).includes('Gancho:'), false, 'chip é removível');
  console.log('marketing_hooks_ui.test.mjs: ok (5 categorias, 40 ganchos observados, busca, seleção e remoção do chip)');
} finally { await browser?.close(); await f.close(); }
