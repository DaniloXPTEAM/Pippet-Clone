// Templates de marketing (linha 76): 8 nomes preservados de 10; imagens, texto e fluxo Gerar UNOBSERVED.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-tmpl-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/templates/state'); const t = await res.json();
  assert.equal(res.status, 200); assert.equal(t.ok, true);
  assert.equal(t.totalReported, 10, 'total relatado no inventário');
  assert.equal(t.namesPreserved.length, 8, 'só oito nomes foram preservados');
  assert.equal(t.missingNames, 2, 'dois templates seguem sem nome');
  assert.deepEqual(t.namesPreserved, ['Shot-and-Drop Reveal', 'Secret Shelf Test', 'Living Garment Swap Reveal', 'Cursor Download Reveal', 'Product Spin Reveal', 'Folder Outfit Demo', 'Robbery Bag Reveal', 'Single Image Detail Stop']);
  assert.equal(new Set(t.namesPreserved).size, 8, 'sem nome duplicado inventado');
  assert.equal(t.images, 'UNOBSERVED');
  assert.equal(t.prefillText, 'UNOBSERVED');
  assert.equal(t.generateFlow, 'UNOBSERVED');
  assert.equal(t.externalCalls, false, 'nenhuma chamada ao serviço original');
  assert.match(t.source, /linha 76/);
  assert.ok(!/"(api[_-]?key|access[_-]?token|secret[_-]?key|password)"/i.test(JSON.stringify(t)), 'nenhuma credencial no corpo (o nome "Secret Shelf Test" é template, não segredo)');

  // a página precisa listar exatamente os mesmos nomes da rota (uma fonte de verdade só)
  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  const block = ui.slice(ui.indexOf('const KNOWN_MARKETING_TEMPLATES'), ui.indexOf('function pageTemplates'));
  for (const n of t.namesPreserved) assert.ok(block.includes(`'${n}'`), `nome ${n} presente na página`);
  assert.match(ui, /api\/templates\/state/, 'a página lê a rota local');
  assert.match(ui, /id="templateEvidence"/, 'a página declara o que falta');
  console.log('OK templates_route: 8/10 nomes preservados, imagens e fluxo Gerar UNOBSERVED');
} finally {
  await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
