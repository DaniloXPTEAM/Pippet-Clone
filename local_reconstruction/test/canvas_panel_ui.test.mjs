import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { shotsDir } from './support/shots.mjs'; // rodada 10: capturas fora da árvore versionada
if (skipUnavailableBrowser('canvas_panel_ui')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-canvas-panel-'));
process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs');
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port; let browser;
try {
  const response = await fetch(`http://127.0.0.1:${port}/api/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'canvas', title: 'Canvas com painel de agente' }) });
  const project = await response.json(); assert.ok(project.id);
  browser = await launchChromium();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/#/project/${project.id}`);
  await page.locator('#chatHistory').waitFor();
  assert.ok(await page.locator('#newChat').isVisible());
  assert.ok(await page.locator('#chatHistory').isVisible());
  assert.ok(await page.locator('#chatLeft').isVisible(), 'canvas toolbar includes show-on-left');
  assert.ok(await page.locator('#shareC').isVisible());
  const chat = page.locator('.chat'), cv = page.locator('.cv');
  assert.ok((await chat.boundingBox()).x > (await cv.boundingBox()).x, 'chat starts on the right');
  await page.locator('#chatLeft').click();
  assert.equal(await page.locator('.ws').evaluate((el) => el.classList.contains('chat-left')), true);
  assert.equal(await page.locator('#chatLeft').getAttribute('aria-pressed'), 'true');
  assert.ok((await chat.boundingBox()).x < (await cv.boundingBox()).x, 'show-on-left moves chat before canvas');
  await page.locator('#chatLeft').click();
  assert.ok((await chat.boundingBox()).x > (await cv.boundingBox()).x, 'toggle returns chat to the right');
  await page.locator('#cin').fill('rascunho local preservado');
  await page.locator('#chatClose').click();
  assert.equal(await chat.isVisible(), false);
  assert.ok(await page.locator('#chatReopen').isVisible(), 'closed panel has a local reopen affordance');
  await page.locator('#chatReopen').click();
  assert.ok(await chat.isVisible());
  assert.equal(await page.locator('#cin').inputValue(), 'rascunho local preservado');
  const screenshots = shotsDir();
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, '94_canvas_chat_controls.png') });
  assert.deepEqual(errors, []);
  console.log('canvas_panel_ui.test.mjs: ok (history, left/right placement, close/reopen, draft preserved; local only)');
} finally {
  await browser?.close(); await new Promise((resolve) => server.close(resolve)); fs.rmSync(tmp, { recursive: true, force: true });
}
