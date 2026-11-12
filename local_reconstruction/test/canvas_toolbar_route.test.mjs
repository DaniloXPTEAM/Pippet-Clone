// Barra do canvas (linha 90): ações observadas na captura; ícones, dimensões e contratos UNOBSERVED.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-cvtb-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/canvas/toolbar'); const b = await res.json();
  assert.equal(res.status, 200); assert.equal(b.ok, true);
  assert.equal(b.observedActions.length, 5, 'cinco ações aparecem na captura');
  for (const a of ['painel do agente à direita', 'reposicionar para a esquerda/direita', 'compartilhar tela', 'fechar', 'histórico de chats']) assert.ok(b.observedActions.includes(a), `ação observada: ${a}`);
  assert.equal(b.localTools.length, 9, 'nove ferramentas existem na barra local');
  for (const t of ['minimapa', 'opções de zoom', 'modo trackpad', 'modo mouse']) assert.ok(b.localTools.includes(t), `ferramenta local: ${t}`);
  assert.equal(b.icons, 'UNOBSERVED', 'ícones não foram observados');
  assert.equal(b.dimensions, 'UNOBSERVED', 'dimensões não foram observadas');
  assert.equal(b.contracts, 'UNOBSERVED', 'contratos não foram observados');
  assert.equal(b.nodeAccessibilityTree, 'UNOBSERVED', 'o canvas original não expõe árvore por nó');
  assert.equal(b.externalCalls, false);
  assert.match(b.source, /linha 90/);
  assert.ok(!/"(api[_-]?key|access[_-]?token|secret[_-]?key|password)"/i.test(JSON.stringify(b)));

  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(ui, /api\/canvas\/toolbar/, 'a barra lê a rota local');
  assert.match(ui, /id="cvToolbarNote"/, 'a barra declara o que falta');
  console.log('OK canvas_toolbar_route: 5 ações observadas, 9 ferramentas locais, ícones/dimensões/contratos UNOBSERVED');
} finally {
  await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
