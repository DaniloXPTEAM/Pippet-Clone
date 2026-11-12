import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
if (skipUnavailableBrowser('chat_history_ui')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-chat-history-'));
process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs');
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
let browser;
try {
  const projectResponse = await fetch(`http://127.0.0.1:${port}/api/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'canvas', title: 'Canvas para teste de histórico' }) });
  const project = await projectResponse.json(); assert.ok(project.id);
  browser = await launchChromium();
  const page = await browser.newPage(); const errors = []; page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/#/project/${project.id}`);
  await page.locator('#chatHistory').waitFor();
  await page.locator('#chatHistory').click();
  assert.equal(await page.getByText('No history yet', { exact: true }).count(), 1);
  assert.ok(await page.getByText('Histórico disponível apenas neste projeto local.').isVisible());
  await page.locator('.modal-bg .x').click();
  await page.locator('#newChat').click(); await page.locator('#chatHistory').waitFor();
  await page.locator('#chatHistory').click();
  const prior = page.locator('.modal-bg [data-chat]');
  assert.equal(await prior.count(), 1, 'chat anterior aparece no histórico do projeto');
  assert.ok(await prior.innerText().then((text) => text.includes('Novo chat')));
  await prior.click(); await page.waitForTimeout(100);
  assert.equal(await page.locator('.modal-bg').count(), 0, 'seleção fecha diálogo');
  assert.deepEqual(errors, []);
  console.log('chat_history_ui.test.mjs: ok (empty state, chats locais e navegação; sem chamada ao Pippit)');
} finally {
  await browser?.close(); await new Promise((resolve) => server.close(resolve)); fs.rmSync(tmp, { recursive: true, force: true });
}
