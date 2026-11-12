import assert from 'node:assert/strict';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('templates_ui')) process.exit(0);
const f = await startUiFixture('piperline-templates-'); let browser;
try { browser = await launchChromium(); const page = await browser.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${f.base}/#/templates`); await page.locator('#templateStudio').waitFor();
  const expected = ['Shot-and-Drop Reveal', 'Secret Shelf Test', 'Living Garment Swap Reveal', 'Cursor Download Reveal', 'Product Spin Reveal', 'Folder Outfit Demo', 'Robbery Bag Reveal', 'Single Image Detail Stop'];
  assert.equal(await page.locator('[data-template]').count(), 8); for (const n of expected) assert.equal(await page.locator('[data-template]', { hasText: n }).count(), 1);
  assert.match(await page.locator('#templateCount').innerText(), /8 nomes conhecidos de 10.*2 não identificados/); await page.waitForFunction(()=>/UNOBSERVED/.test(document.querySelector('#templateEvidence')?.textContent||'')); assert.match(await page.locator('#templateEvidence').innerText(),/8 nomes preservados de 10 relatados; 2 sem nome\. Imagens: UNOBSERVED; texto pré-preenchido: UNOBSERVED; fluxo Gerar: UNOBSERVED/);
  await page.locator('[data-template="Secret Shelf Test"]').click(); assert.match(await page.locator('.modal').innerText(), /Texto de “Qual é a história\?”: não preservado[\s\S]*UNOBSERVED/); assert.equal(await page.locator('.modal button').filter({ hasText: 'Gerar' }).count(), 0);
  assert.deepEqual(errors, []); console.log('templates_ui.test.mjs: ok (8 nomes confirmados; 2 e prompts marcados como desconhecidos; nenhuma geração)');
} finally { await browser?.close(); await f.close(); }
