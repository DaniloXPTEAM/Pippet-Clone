// Linha 29 do inventário — campo de ideia do Chat history (documentado no capture, nunca enviado).
// O que se registrou: o campo existe no diálogo. O destino do envio nunca foi observado — aqui o
// equivalente local cria um novo chat do projeto com a ideia como primeira mensagem (sem Pippit).
import assert from 'node:assert/strict';
import { startUiFixture } from './support/ui-fixture.mjs';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';

if (skipUnavailableBrowser('chat_history_idea_ui')) process.exit(0);
const f = await startUiFixture('piperline-chat-idea-');
const created = await fetch(`${f.base}/api/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'canvas', title: 'Canvas do campo de ideia' }) });
const project = await created.json(); assert.ok(project.id);
let browser;
try {
  browser = await launchChromium();
  const page = await browser.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${f.base}/#/project/${project.id}`);
  await page.locator('#chatHistory').waitFor();
  await page.locator('#chatHistory').click();
  assert.ok(await page.locator('#chIdea').isVisible(), 'campo de ideia presente no diálogo');
  assert.match(await page.locator('#chIdea').getAttribute('placeholder'), /Campo de ideia.*UNOBSERVED/);
  assert.ok(await page.locator('#chIdeaGo').isVisible(), 'botão de envio do campo de ideia');
  await page.locator('#chIdea').fill('Ideia documentada no capture');
  await page.locator('#chIdeaGo').click();
  await page.locator('.modal-bg').waitFor({ state: 'detached' });
  // Equivalente local: a ideia virou a primeira mensagem de um novo chat deste projeto.
  const res = await fetch(`${f.base}/api/projects/${project.id}`).then((r) => r.json());
  const withIdea = (res.chats || []).find((c) => c.messages.some((m) => m.text === 'Ideia documentada no capture'));
  assert.ok(withIdea, 'novo chat local criado com a ideia como primeira mensagem');
  assert.match(await page.locator('#msgs').innerText(), /Ideia documentada no capture/);
  assert.deepEqual(errors, []);
  console.log('chat_history_idea_ui.test.mjs: ok (campo de ideia documentado; envio local cria chat — destino original UNOBSERVED)');
} finally {
  await browser?.close(); await f.close();
}
