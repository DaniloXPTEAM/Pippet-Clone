// Adendo r19 (13/11/2026) — envio em modo Áudio (plano Free) NÃO gera: chama o check e abre o modal
// "Subscribe to boost your business" com os textos e preços anuais observados. Mensal = UNOBSERVED.
import assert from 'node:assert/strict'; import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('subscribe_modal_ui')) process.exit(0); const f = await startUiFixture('piperline-submodal-'); let browser;
try {
  browser = await launchChromium(); const page = await browser.newPage();
  const checks = []; page.on('request', (r) => { if (r.url().includes('/api/biz/v2/videogen/check')) checks.push(r.postData() || ''); });
  await page.goto(`${f.base}/#/home`);
  await page.waitForSelector('#modeB');
  await page.locator('#modeB').click(); await page.locator('.menu a').filter({ hasText: 'Áudio' }).click();
  await page.locator('#prompt').fill('locução de teste');
  const before = (await (await fetch(`${f.base}/api/projects`)).json()).length;
  await page.locator('#send').click();
  await page.waitForSelector('.modal', { timeout: 10_000 });
  const t = await page.locator('.modal').innerText();
  assert.match(t, /Subscribe to boost your business/);
  assert.match(t, /Monthly/); assert.match(t, /Yearly/);
  assert.match(t, /Always free — No credit card required/);
  assert.match(t, /Current plan/);
  assert.match(t, /Starter/); assert.match(t, /\(Best value\)/); assert.match(t, /R\$513/); assert.match(t, /R\$855/);
  assert.match(t, /Plus/); assert.match(t, /R\$1,252/); assert.match(t, /R\$2,087/);
  assert.match(t, /Pro/); assert.match(t, /R\$18,325/); assert.match(t, /R\$30,542/);
  assert.ok(await page.locator('#proSlider').count() === 1, 'slider no card Pro');
  assert.match(t, /Auto renews, cancel anytime\./);
  assert.match(t, /UNOBSERVED/, 'preço mensal marcado como não capturado');
  assert.equal(checks.length, 1, 'uma chamada a /api/biz/v2/videogen/check');
  assert.match(checks[0], /generate_source/, 'corpo {"generate_source":1}');
  assert.equal((await (await fetch(`${f.base}/api/projects`)).json()).length, before, 'envio não gera nada');
  assert.equal(await page.locator('.modal [data-sub]').count(), 3, 'Subscribe nos planos pagos');
  console.log('subscribe_modal_ui.test.mjs: ok (send em Áudio = check + modal "Subscribe to boost your business"; preços anuais observados; mensal UNOBSERVED; nada gera)');
} finally { await browser?.close(); await f.close(); }
