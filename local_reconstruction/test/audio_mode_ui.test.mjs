import assert from 'node:assert/strict'; import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('audio_mode_ui')) process.exit(0); const f=await startUiFixture('piperline-audio-mode-'); let browser;
try { browser=await launchChromium(); const page=await browser.newPage(); await page.goto(`${f.base}/#/home`); await page.locator('#modeB').click(); await page.locator('.menu a').filter({hasText:'Áudio'}).click();
  assert.equal((await page.locator('#modeB').innerText()).trim(),'Áudio ▾'); await page.waitForFunction(() => /SAPI|provedor do usuário/.test(document.querySelector('#audioModeNote')?.textContent || ''), null, { timeout: 10_000 });
  const note = await page.locator('#audioModeNote').innerText(); assert.match(note, /UNOBSERVED/); assert.match(note, /SAPI|provedor do usuário/);
  const before=(await (await fetch(`${f.base}/api/projects`)).json()).length; await page.locator('#modelB').click(); assert.match(await page.locator('#toast').innerText(),/não foram capturados; nenhuma geração iniciada/); assert.equal(await page.locator('.modal').count(),0);
  assert.equal((await (await fetch(`${f.base}/api/projects`)).json()).length,before); console.log('audio_mode_ui.test.mjs: ok (modo Audio visível; nota mostra voz local padrão e presets/custo UNOBSERVED; modelo não inventa geração)');
} finally { await browser?.close(); await f.close(); }
