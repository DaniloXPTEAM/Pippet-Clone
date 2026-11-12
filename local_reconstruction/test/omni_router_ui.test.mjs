// Composer em modo Imagem -> Omni Router (servidor falso em 127.0.0.1). Sem chamada real, sem chave em arquivo.
import assert from 'node:assert/strict';
import http from 'node:http';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
if (skipUnavailableBrowser('omni_router_ui')) process.exit(0);

// JPEG 1x1 válido (mesmos bytes de um JPEG cinza gerado localmente); o navegador precisa decodificar de fato.
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
);
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const seen = [];
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); seen.push({ path: req.url, model: body.model, auth: req.headers.authorization });
    if (req.headers.authorization !== 'Bearer ui-omni-key') return json(res, 401, { error: 'missing bearer' });
    if (req.url === '/v1/images/generations') return json(res, 200, { data: [{ b64_json: JPEG.toString('base64') }] });
    if (req.url === '/v1/chat/completions') return json(res, 200, { choices: [{ message: { content: 'texto fake' } }] });
    return json(res, 404, { error: 'not found' });
  });
});
await new Promise((resolve) => fake.listen(0, '127.0.0.1', resolve));
process.env.OMNIROUTER_API_KEY = 'ui-omni-key';
process.env.OMNIROUTER_BASE_URL = `http://127.0.0.1:${fake.address().port}/v1`;

const { startUiFixture } = await import('./support/ui-fixture.mjs');
const fixture = await startUiFixture('piperline-omni-ui-'); let browser;
try {
  // Configura o provedor pelo preset real da UI (mesma rota que o botão usa).
  const preset = await fetch(`${fixture.base}/api/free-router/preset/omni`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((r) => r.json());
  assert.equal(preset.ok, true);
  assert.ok(preset.provider.timeoutMs >= 120_000);

  browser = await launchChromium(); const page = await browser.newPage();
  await page.goto(`${fixture.base}/#/home`); await page.locator('#prompt').waitFor();
  // Modo Imagem pelo menu do composer (evento real de clique).
  await page.locator('#modeB').click();
  await page.locator('.menu a', { hasText: 'Imagem' }).first().click();
  await page.locator('#modeB').filter({ hasText: 'Imagem' }).waitFor();
  await page.locator('#prompt').fill('um farol ao entardecer');
  await page.locator('#send').click();
  await page.locator('#localRunPage').waitFor();
  assert.match(page.url(), /#\/tasks\/run\//, 'o composer abre a tarefa do roteador');
  // Espera o EVENTO de carregamento da imagem, não um prazo fixo.
  await page.waitForFunction(() => { const i = document.querySelector('#runAsset'); return !!i && i.complete && i.naturalWidth > 0; }, null, { timeout: 30_000 });
  const state = await page.locator('#runState').innerText();
  assert.match(state, /Concluída/);
  assert.match(await page.locator('#localRunPage').innerText(), /Imagem gerada/);
  assert.match(await page.locator('#runAsset').getAttribute('src'), /^\/files\/.+\.jpg$/);
  assert.equal(seen.filter((r) => r.path === '/v1/images/generations').length, 1, 'uma única chamada de imagem');
  assert.equal(seen[0].model, 'nvidia/black-forest-labs/flux.2-klein-4b');
  assert.equal(seen[0].auth, 'Bearer ui-omni-key');
  // Abrir o Canvas mostra o nó de Imagem ligado ao ativo gerado.
  await page.locator('#localRunPage a[href^="#/project/"]').first().click();
  await page.waitForFunction(() => document.body.innerText.includes('Imagem do roteador gratuito'), null, { timeout: 30_000 });
  console.log('omni_router_ui: composer em modo Imagem gera pelo Omni e abre a tarefa com a imagem; Canvas recebe o nó');
} finally { await browser?.close(); await fixture.close(); await new Promise((r) => fake.close(r)); }
