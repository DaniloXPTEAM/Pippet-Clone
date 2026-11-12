import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
if (skipUnavailableBrowser('marketing_entities_ui')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-marketing-entities-'));
process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const media = await import('../app/lib/media.mjs'); const { server } = await import('../app/server.mjs');
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  const imagePath = path.join(tmp, 'reference.png');
  const rendered = spawnSync(media.FFMPEG, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=orange:s=320x240', '-frames:v', '1', imagePath], { encoding: 'utf8' });
  assert.equal(rendered.status, 0, rendered.stderr);
  const image = await fetch(`${base}/api/assets`, { method: 'POST', headers: { 'x-file-name': 'reference.png', 'content-type': 'image/png' }, body: fs.readFileSync(imagePath) });
  const asset = await image.json(); assert.ok(asset.id);
  const created = await fetch(`${base}/api/assets/${asset.id}/character`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Personagem Exemplo' }) }); assert.equal(created.status, 200);

  browser = await launchChromium(); const page = await browser.newPage(); const errors = []; page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${base}/#/marketing`); await page.locator('#prod').click(); await page.locator('#mkEntityList').waitFor();
  assert.match(await page.locator('#mkEntityList').innerText(), /Nenhum produto ainda/);
  await page.locator('#mkEntityAdd').click(); await page.locator('.modal').getByText('Escolher a partir dos Ativos').waitFor();
  await page.locator('.mediaitem', { hasText: 'reference.png' }).click(); await page.locator('#nm').fill('Produto Criado no Teste'); await page.locator('#cyes').click();
  await page.locator('[data-entity]').filter({ hasText: 'Produto Criado no Teste' }).click(); assert.equal(await page.locator('#mkEntitySelect').isDisabled(), false);
  await page.locator('#mkEntitySelect').click(); assert.match(await page.locator('#prod').innerText(), /Produto Criado no Teste/);

  await page.locator('#chr').click(); await page.locator('[data-entity]').waitFor(); assert.equal(await page.locator('[data-entity]').count(), 1); await page.locator('#mkEntitySearch').fill('Exemplo'); assert.equal(await page.locator('[data-entity]').count(), 1); await page.locator('[data-entity]').click(); await page.locator('#mkEntitySelect').click(); assert.match(await page.locator('#chr').innerText(), /Personagem Exemplo/);
  await page.locator('#chr').click(); await page.locator('[data-tab="recommended"]').click(); assert.match(await page.locator('#mkEntityList').innerText(), /catálogo não incluído/); await page.locator('#mkEntityCancel').click();
  await page.locator('#prod').click(); await page.locator('#mkEntitySearch').fill('ausente'); assert.equal(await page.locator('[data-entity]').count(), 0); await page.locator('#mkEntitySearch').fill('');
  const sort = page.locator('#mkEntitySort'); const before = await sort.innerText(); await sort.click(); assert.notEqual(await sort.innerText(), before);
  await page.locator('#mkEntityCancel').click(); await page.locator('#prod [data-clear]').click(); assert.match(await page.locator('#prod').innerText(), /Produto/); assert.doesNotMatch(await page.locator('#prod').innerText(), /Produto Criado no Teste/);
  assert.deepEqual(errors, []);
  console.log('marketing_entities_ui.test.mjs: ok (busca, ordenação, criação com ativo, seleção, cadastro local e recomendados indisponíveis; sem Pippit)');
} finally {
  await browser?.close(); await new Promise((resolve) => server.close(resolve)); fs.rmSync(tmp, { recursive: true, force: true });
}
