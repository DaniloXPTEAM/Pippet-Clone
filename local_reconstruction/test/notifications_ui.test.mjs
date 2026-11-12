import assert from 'node:assert/strict'; import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('notifications_ui')) process.exit(0); const f=await startUiFixture('piperline-notifications-'); let browser;
try { browser=await launchChromium(); const page=await browser.newPage(); await page.goto(`${f.base}/#/home`); await page.locator('#bell').waitFor(); await page.locator('#bell').click(); await page.locator('.modal').getByText('Notificações',{exact:true}).waitFor();
  // 8 anúncios editoriais observados por tema (REA ev_72d7b4c2…7b20; jan–abr/2026), sem inventar títulos/datas/textos.
  const modal = page.locator('.modal');
  assert.equal(await modal.locator('.note').count(), 8, 'os 8 anúncios observados por tema');
  const txt = await modal.innerText();
  for (const theme of ['GPT Image 2', '700+ avatares via @', 'Pesquisa de satisfação (pt/es)', 'Nano Banana Pro/Veo 3.1', 'Seedream 4.1', 'Seedream 5.0', 'Geração agendada', 'Mais tarefas de crédito']) {
    assert.ok(txt.includes(theme), `tema observado presente: ${theme}`);
  }
  assert.match(txt, /UNOBSERVED/); assert.match(txt, /jan–abr\/2026/);
  // eventos locais seguem vazios e o "Todas lidas" zera o contador (comportamento observado).
  assert.match(await (await fetch(`${f.base}/api/notifications`)).json().then((x) => JSON.stringify(x.items.filter((i) => i.kind !== 'ad'))), /^\[\]$/);
  await page.locator('#allread').click(); await page.waitForSelector('.modal-bg',{state:'detached'});
  const after = await (await fetch(`${f.base}/api/notifications`)).json();
  assert.equal(after.unread, 0); assert.ok(after.items.every((i) => i.read), 'Todas lidas marca os anúncios');
  assert.equal(after.editorial.count, 8); assert.equal(after.editorial.bodies, 'UNOBSERVED'); assert.equal(after.editorial.externalCalls, false);
  console.log('notifications_ui.test.mjs: ok (8 anúncios observados por tema, títulos/datas/textos UNOBSERVED, All read)');
} finally { await browser?.close(); await f.close(); }
