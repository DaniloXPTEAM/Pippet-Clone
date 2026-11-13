// Adendo r19 (13/11/2026) — o menu "Link account" mostra APENAS TikTok, Facebook Page e Instagram Reels.
import assert from 'node:assert/strict'; import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('link_account_channels_ui')) process.exit(0); const f = await startUiFixture('piperline-link-acc-'); let browser;
try {
  browser = await launchChromium(); const page = await browser.newPage();
  await page.goto(`${f.base}/#/schedule`);
  await page.waitForSelector('#vc', { timeout: 10_000 });
  await page.locator('#vc').click();
  await page.waitForSelector('.menu', { timeout: 5_000 });
  const items = await page.locator('.menu a, .menu button, .menu .mi').allInnerTexts();
  const labels = items.map((t) => t.trim()).filter(Boolean);
  assert.ok(labels.includes('TikTok'), 'TikTok');
  assert.ok(labels.includes('Facebook Page'), 'Facebook Page');
  assert.ok(labels.includes('Instagram Reels'), 'Instagram Reels');
  assert.ok(!labels.some((l) => /YouTube|Shopify|Dropbox|Shop/.test(l)), 'nada além dos 3 canais observados');
  console.log('link_account_channels_ui.test.mjs: ok (menu Link account = TikTok, Facebook Page, Instagram Reels)');
} finally { await browser?.close(); await f.close(); }
