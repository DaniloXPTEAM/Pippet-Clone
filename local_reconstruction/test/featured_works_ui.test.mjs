// Adendo r19 (13/11/2026) — feed "Featured works" na Home (cards de título + autor) e detalhe
// /home?work_id=N com Close, Share, Author e "Work intro", como observado no Pippit real.
import assert from 'node:assert/strict'; import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('featured_works_ui')) process.exit(0); const f = await startUiFixture('piperline-featured-'); let browser;
try {
  browser = await launchChromium(); const page = await browser.newPage();
  await page.goto(`${f.base}/#/home`);
  await page.waitForSelector('#fwfeed .fw', { timeout: 10_000 });
  assert.match(await page.locator('#fwfeed').innerText(), /Sunset Drive/, 'card com título');
  assert.match(await page.locator('#fwfeed').innerText(), /Ana P\./, 'card com autor');
  assert.ok((await page.locator('#fwfeed .fw').count()) >= 6, 'vários cards');

  await page.locator('#fwfeed .fw').first().click();
  await page.waitForSelector('#workdetail, .modal', { timeout: 10_000 });
  const detail = await page.locator('.modal').innerText();
  assert.match(detail, /Close/); assert.match(detail, /Share/); assert.match(detail, /Work intro/);
  assert.match(detail, /Ana P\./, 'Author no detalhe');
  assert.match(detail, /Sunset Drive/);
  assert.match(page.url(), /work_id=1/, 'URL /home?work_id=N');
  await page.locator('#wclose').click();
  assert.equal(await page.locator('.modal').count(), 0, 'Close fecha o detalhe');

  // URL direta /home?work_id=N (SPA fallback do servidor + leitura da query)
  await page.goto(`${f.base}/home?work_id=2`);
  await page.waitForSelector('#fwfeed', { timeout: 10_000 });
  await page.waitForFunction(() => /Café da Manhã/.test(document.querySelector('.modal')?.textContent || ''), null, { timeout: 10_000 });
  assert.match(await page.locator('.modal').innerText(), /Work intro/);

  console.log('featured_works_ui.test.mjs: ok (feed Featured works título+autor; detalhe /home?work_id=N com Close/Share/Author/Work intro)');
} finally { await browser?.close(); await f.close(); }
