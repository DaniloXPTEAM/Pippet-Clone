import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs'; import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('avatar_menu_ui')) process.exit(0);
const f = await startUiFixture('piperline-avatar-menu-'); let browser;
try { const media = await import('../app/lib/media.mjs'); const png = path.join(os.tmpdir(), `avatar-menu-${Date.now()}.png`); const r = spawnSync(media.FFMPEG, ['-y','-v','error','-f','lavfi','-i','color=c=blue:s=320x320','-frames:v','1',png]); assert.equal(r.status,0);
  const created = await fetch(`${f.base}/api/avatars/photo`, { method:'POST', headers:{'x-consent':'true','x-avatar-name':'Teste menu','x-avatar-voice':'Voz local','content-type':'image/png'}, body:fs.readFileSync(png) }); assert.equal(created.status,200); assert.ok((await created.json()).avatar);
  browser = await launchChromium(); const page = await browser.newPage(); await page.goto(`${f.base}/#/avatars`); await page.locator('[data-avatar-more]').waitFor(); await page.locator('[data-avatar-more]').click();
  assert.match(await page.locator('.modal').innerText(), /Menu do avatar próprio[\s\S]*UNOBSERVED[\s\S]*nenhuma ação de renomear\/excluir foi presumida/); assert.match(await page.locator('.modal').innerText(), /Aplicar — CONFIRMED; Menu “…” do avatar — UNOBSERVED; Prévia de áudio — UNOBSERVED/);
  assert.equal(await page.locator('.modal button').filter({ hasText:/Renomear|Excluir/ }).count(),0); console.log('avatar_menu_ui.test.mjs: ok (menu local identifica a lacuna sem inferir ações do serviço)');
} finally { await browser?.close(); await f.close(); }
