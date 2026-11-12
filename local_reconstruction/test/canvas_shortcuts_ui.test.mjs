// UI da linha 47: o diálogo de atalhos diz o que funciona aqui, e o atalho de zoom realmente funciona.
import assert from 'node:assert/strict';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { startUiFixture } from './support/ui-fixture.mjs';
if (skipUnavailableBrowser('canvas_shortcuts_ui')) process.exit(0);
const f = await startUiFixture('piperline-canvas-keys-ui-'); let browser;
try {
  const post = (p, b) => fetch(f.base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }).then((r) => r.json());
  const project = await post('/api/projects', { type: 'story', title: 'Atalhos' });
  await post(`/api/projects/${project.id}/nodes`, { type: 'Texto' });
  browser = await launchChromium(); const page = await browser.newPage();
  await page.goto(`${f.base}/#/project/${project.id}`);
  await page.locator('#kbd').waitFor(); await page.locator('#kbd').click();
  await page.locator('#kbdPop').waitFor();
  // A nota declara que a lista é referência do Pippit (não observada) e o que é local.
  await page.waitForFunction(() => /não observada/.test(document.querySelector('#kbdNote')?.textContent || ''), null, { timeout: 10_000 });
  assert.match(await page.locator('#kbdPop').innerText(), /não implementado/i);
  assert.match(await page.locator('#kbdPop').innerText(), /Compartilhar tela: copia o link.*UNOBSERVED/);
  assert.equal((await page.locator('#kbdPop [data-k="Ctrl Z"] .kstate').textContent()).trim(), 'local');
  // Rodada 15: os atalhos da referência viraram extensões locais; só a pinça segue não implementada.
  assert.equal((await page.locator('#kbdPop [data-k="Ctrl G"] .kstate').textContent()).trim(), 'local');
  assert.equal((await page.locator('#kbdPop [data-k="Delete"] .kstate').textContent()).trim(), 'local');
  assert.equal((await page.locator('#kbdPop [data-k="Pinça"] .kstate').textContent()).trim(), 'não implementado');
  // O atalho de zoom marcado como local funciona de fato (evento, não prazo fixo).
  await page.locator('#kbdPop').click(); // fecha o pop
  const before = await page.locator('#zopt').innerText();
  await page.keyboard.press('Control+Equal');
  await page.waitForFunction((prev) => document.querySelector('#zopt')?.textContent !== prev, before, { timeout: 10_000 });
  assert.notEqual(await page.locator('#zopt').innerText(), before, 'Ctrl + aumenta o zoom de verdade');
  console.log('canvas_shortcuts_ui: diálogo classifica cada atalho (local x não implementado), compartilhar tela UNOBSERVED e Ctrl + altera o zoom');
} finally { await browser?.close(); await f.close(); }
