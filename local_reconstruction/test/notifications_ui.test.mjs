import assert from 'node:assert/strict'; import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('notifications_ui')) process.exit(0); const f=await startUiFixture('piperline-notifications-'); let browser;
try { browser=await launchChromium(); const page=await browser.newPage(); await page.goto(`${f.base}/#/home`); await page.locator('#bell').waitFor(); await page.locator('#bell').click(); await page.locator('.modal').getByText('Notificações',{exact:true}).waitFor();
  assert.match(await page.locator('.modal').innerText(),/Sem notificações/); assert.equal(await page.locator('.modal .note').count(),0); await page.locator('#allread').click(); await page.waitForSelector('.modal-bg',{state:'detached'});
  assert.equal((await (await fetch(`${f.base}/api/notifications`)).json()).unread,0); console.log('notifications_ui.test.mjs: ok (dialog local vazio, All read, sem conteúdo editorial Pippit)');
} finally { await browser?.close(); await f.close(); }
