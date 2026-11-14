import assert from 'node:assert/strict'; import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('notifications_ui')) process.exit(0); const f=await startUiFixture('piperline-notifications-'); let browser;
try { browser=await launchChromium(); const page=await browser.newPage(); await page.goto(`${f.base}/#/home`); await page.locator('#bell').waitFor(); await page.locator('#bell').click(); await page.locator('.note-pop').getByText('Notificações',{exact:true}).waitFor();
  // 13/11/2026: a janela virou um popover ancorado acima do sino (como no original), não um modal no centro.
  assert.equal(await page.locator('.modal').count(), 0, 'notificações não abrem modal no centro');
  // 8 anúncios editoriais observados por tema (REA ev_72d7b4c2…7b20; jan–abr/2026), sem inventar títulos/datas/textos.
  const modal = page.locator('.note-pop');
  assert.equal(await modal.locator('.note').count(), 8, 'os 8 anúncios observados por tema');
  const txt = await modal.innerText();
  // 14/11/2026: títulos REAIS lidos do painel do Pippit em pt-BR (app/lib/editorial_ads.json)
  for (const theme of ['Confira o GPT Image 2', 'mais de 700 avatares gratuitos', 'Pesquisa de satisfação do Pippit', 'Encuesta de satisfacción', 'Nano Banana Pro e Veo 3.1', 'Seedream 4.1', 'Seedream 5.0', 'vídeos mais baratos']) {
    assert.ok(txt.includes(theme), `tema observado presente: ${theme}`);
  }
  assert.doesNotMatch(txt, /UNOBSERVED|REA ev_/, 'texto técnico não aparece na tela do usuário');
  // eventos locais seguem vazios e o "Todas lidas" zera o contador (comportamento observado).
  assert.match(await (await fetch(`${f.base}/api/notifications`)).json().then((x) => JSON.stringify(x.items.filter((i) => i.kind !== 'ad'))), /^\[\]$/);
  await page.locator('#allread').click(); await page.waitForSelector('.note-pop',{state:'detached'});
  const after = await (await fetch(`${f.base}/api/notifications`)).json();
  assert.equal(after.unread, 0); assert.ok(after.items.every((i) => i.read), 'Todas lidas marca os anúncios');
  assert.equal(after.editorial.count, 8); assert.equal(after.editorial.bodies, 'OBSERVADO'); assert.equal(after.editorial.externalCalls, false);
  console.log('notifications_ui.test.mjs: ok (8 anúncios observados por tema, títulos/datas/textos UNOBSERVED, All read)');
} finally { await browser?.close(); await f.close(); }
