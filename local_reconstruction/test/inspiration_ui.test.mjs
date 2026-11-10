import assert from 'node:assert/strict'; import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('inspiration_ui')) process.exit(0); const f=await startUiFixture('piperline-inspiration-'); let browser;
try { browser=await launchChromium(); const page=await browser.newPage(); const calls=[]; page.on('request',r=>calls.push(r.url())); await page.goto(`${f.base}/#/inspiration`); await page.locator('#inspirationLocal').waitFor();
  assert.match(await page.locator('#inspirationLocal').innerText(),/Inspiration · feed e desafios[\s\S]*nenhuma tela\/feed capturado[\s\S]*Sem cartões inventados/); assert.equal(await page.locator('#inspirationLocal button').count(),0); assert.ok(!calls.some(u=>/\/api\/(?:inspiration|challenge|remix)(?:\/|\?|$)/i.test(new URL(u).pathname)));
  console.log('inspiration_ui.test.mjs: ok (placeholder factual, sem feed nem ações inventadas)');
} finally { await browser?.close(); await f.close(); }
