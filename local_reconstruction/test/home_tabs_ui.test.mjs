// 14/11/2026 — abas da Home (Criativo/Marketing/Histórias trocam só o palco), 96 cartões de modelo com filtros que
// filtram, diálogo de prévia (Remixar/Experimentar) e criação REAL de história pelo agente (antes abria projeto vazio).
import assert from 'node:assert/strict'; import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('home_tabs_ui')) process.exit(0); const f = await startUiFixture('piperline-hometabs-'); let browser;
try {
  browser = await launchChromium(); const page = await browser.newPage({ viewport: { width: 1536, height: 900 } });
  await page.goto(`${f.base}/#/home`); await page.waitForSelector('.hero .seg');
  assert.match(await page.locator('.hero h1').innerText(), /CineForma/, 'marca CineForma na Home');
  // trocar de aba NÃO sai da página: a URL continua /home e o hero permanece
  await page.click('.hero .seg button[data-t=Marketing]'); await page.waitForSelector('.tpl');
  assert.match(page.url(), /#\/home/); assert.equal(await page.locator('.hero').count(), 1, 'hero permanece');
  // 96 cartões e filtros com as contagens medidas no original
  const esperado = [96, 24, 20, 13, 15, 14, 7, 3];
  for (let i = 0; i < 8; i++) { await page.locator('.tpl-tabs button').nth(i).click(); assert.equal(await page.locator('.tpl').count(), esperado[i], `filtro ${i}`); }
  // diálogo de prévia: 3 quadros, Remixar em cada um, Experimentar marca a etiqueta no campo
  await page.locator('.tpl-tabs button').first().click(); await page.locator('.tpl').nth(1).click(); await page.waitForSelector('.tpl-dlg');
  assert.equal(await page.locator('.tpd-v').count(), 3); assert.equal(await page.locator('.tpd-remix').count(), 3);
  await page.locator('#tpdTry').click(); assert.equal(await page.locator('.tpl-dlg').count(), 0);
  assert.match(await page.locator('#mkchips .pill').innerText(), /Formatos de anúncio：Teste da prateleira secreta/);
  // Histórias: "Roteirista de IA" CRIA a história (projeto + chat com a mensagem), não um projeto vazio
  await page.click('.hero .seg button[data-t="Histórias"]'); await page.waitForSelector('#ai'); await page.click('#ai'); await page.fill('#sp', 'Um drama curto: dois irmãos disputam a padaria da família.'); await page.dispatchEvent('#sp', 'input');
  await page.click('#sg'); await page.waitForFunction(() => /#\/project\//.test(location.hash), null, { timeout: 60_000 });
  const id = (await page.evaluate(() => location.hash)).match(/project\/(\d+)/)[1];
  const proj = await (await fetch(`${f.base}/api/projects/${id}`)).json();
  assert.equal(proj.type, 'story'); assert.ok(proj.chats[0].messages.some((m) => m.role === 'user' && /padaria/.test(m.text)), 'a ideia foi enviada ao agente');
  console.log('home_tabs_ui.test.mjs: ok (abas dentro da Home, 96 cartões e filtros, diálogo de prévia, história criada pelo agente)');
} finally { await browser?.close(); await f.close(); }
