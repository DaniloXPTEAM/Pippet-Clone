import assert from 'node:assert/strict';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('settings_internal_ui')) process.exit(0);
const f = await startUiFixture('piperline-settings-'); let browser;
try { browser = await launchChromium(); const page = await browser.newPage(); await page.goto(`${f.base}/#/settings/sign_management`); await page.locator('#lang').waitFor();
  assert.ok(await page.locator('#lang option').count() >= 18); assert.ok(await page.locator('input[name=theme][value=light]').isChecked());
  assert.equal(await page.locator('#saveNoWatermark').isDisabled(), false); assert.equal(await page.locator('#saveNoWatermark').isChecked(), false); assert.match(await page.locator('#main').innerText(), /Preferência local[\s\S]*UNOBSERVED[\s\S]*exportações locais não são alteradas/);
  await page.locator('#saveNoWatermark').check(); await page.waitForFunction(async () => (await (await fetch('/api/state')).json()).settings.saveWithoutWatermark === true);
  await page.reload(); await page.locator('#saveNoWatermark').waitFor(); assert.equal(await page.locator('#saveNoWatermark').isChecked(), true);
  await page.locator('input[name=theme][value=dark]').check(); await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  const r = await fetch(`${f.base}/api/state`); const state = await r.json(); assert.equal(state.settings.theme, 'dark');
  // Decisão r16 item 1: os 8 anúncios observados (kind 'ad') são conteúdo sempre-presente do app;
  // o que precisa estar vazio numa instalação nova são os EVENTOS do app (kind !== 'ad').
  assert.deepEqual((await (await fetch(`${f.base}/api/notifications`)).json()).items.filter((x) => x.kind !== 'ad'), [], 'instalação limpa: nenhum evento do app (anúncios kind:ad são sempre-presentes)');
  console.log('settings_internal_ui.test.mjs: ok (idioma, aparência e watermark inerte/UNOBSERVED; eventos do app separados dos anúncios observados)');
} finally { await browser?.close(); await f.close(); }
