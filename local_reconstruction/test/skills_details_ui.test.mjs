import assert from 'node:assert/strict';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('skills_details_ui')) process.exit(0);
const f = await startUiFixture('piperline-skill-details-'); let browser;
try { browser = await launchChromium(); const page = await browser.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${f.base}/#/skills`); await page.locator('.skill-card').first().waitFor();
  const card = page.locator('.skill-card', { hasText: 'Anúncios de drama' }); await card.locator('[data-d]').click(); await page.locator('#sguide').waitFor();
  assert.match(await page.locator('.modal').innerText(), /Anúncios de drama[\s\S]*Autor: Pippit oficial[\s\S]*Categoria: Marketing Publicidade/);
  assert.match(await page.locator('#sguide').innerText(), /Guia de uso[\s\S]*Pick a genre/); assert.match(await page.locator('#stools').innerText(), /render_video/);
  assert.ok(await page.locator('#suse').isVisible()); assert.ok(await page.locator('#sfav').isVisible()); assert.deepEqual(errors, []);
  console.log('skills_details_ui.test.mjs: ok (detalhe oficial: guia, ferramentas, categorias, favoritos e Use now)');
} finally { await browser?.close(); await f.close(); }
