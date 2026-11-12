// Omni/digital_human (linha 92): nomes de endpoint dos bundles, sem corpos, tela ou execução observados.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-omni-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/capabilities/omni'); const o = await res.json();
  assert.equal(res.status, 200); assert.equal(o.ok, true);
  assert.equal(o.endpoints.length, 11, 'onze endpoints nomeados');
  for (const e of ['get_tone_list', 'text_to_speech', 'try_task', 'batch_delete_digital']) assert.ok(o.endpoints.includes(e), `endpoint citado: ${e}`);
  assert.equal(o.bodies, 'UNOBSERVED', 'corpos de request/response não capturados');
  assert.equal(o.screen, 'UNOBSERVED');
  assert.equal(o.execution, 'UNOBSERVED');
  assert.equal(o.createsRealAvatar, false, 'nada de avatar real criado');
  assert.equal(o.externalCalls, false);
  assert.match(o.source, /linha 92/);
  assert.ok(!/"(api[_-]?key|access[_-]?token|secret[_-]?key|password)"/i.test(JSON.stringify(o)));

  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(ui, /api\/capabilities\/omni/, 'a página Omni lê a rota local');
  const lista = ui.slice(ui.indexOf('const endpoints = [\''), ui.indexOf('];', ui.indexOf("const endpoints = ['")));
  for (const e of o.endpoints) assert.ok(lista.includes(`'${e}'`), `página e rota concordam em ${e}`);
  assert.match(ui, /id="omniEvidence"/, 'a página declara o que falta');
  console.log('OK omni_capabilities_route: 11 endpoints nomeados, corpos/tela/execução UNOBSERVED');
} finally {
  await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
