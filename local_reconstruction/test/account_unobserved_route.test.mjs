// Conta (linha 22): CLI, wishlist e atendimento nunca foram abertos numa captura — três UNOBSERVED explícitos.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-account-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/account/unobserved'); const a = await res.json();
  assert.equal(res.status, 200); assert.equal(a.ok, true);
  assert.deepEqual(a.items.map((x) => x.id), ['cli', 'wishlist', 'support']);
  assert.deepEqual(a.items.map((x) => x.label), ['CLI', 'Feature wishlist', 'Customer service']);
  assert.ok(a.items.every((x) => x.status === 'UNOBSERVED'), 'nenhum destino foi observado');
  assert.ok(a.items.every((x) => /não capturad/.test(x.note)), 'cada item explica a lacuna');
  assert.equal(a.openedDestinations, 0, 'nenhum destino aberto');
  assert.equal(a.externalCalls, false);
  assert.match(a.source, /linha 22/);
  assert.ok(!/"(api[_-]?key|access[_-]?token|secret[_-]?key|password)"/i.test(JSON.stringify(a)));

  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(ui, /api\/account\/unobserved/, 'o menu da conta lê a rota local');
  assert.match(ui, /Lacunas da conta/, 'o menu tem a entrada que mostra as lacunas');
  console.log('OK account_unobserved_route: 3 destinos UNOBSERVED, nenhum aberto, sem chamada externa');
} finally {
  await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
