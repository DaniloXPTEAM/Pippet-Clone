// Promoções da home: só os valores observados, com data; nada de cotação atual nem cobrança local.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-promo-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/promotions'); const p = await res.json();
  assert.equal(res.status, 200); assert.equal(p.ok, true);
  assert.equal(p.current, false, 'não pode se apresentar como cotação atual');
  assert.equal(p.currency, 'BRL');
  assert.deepEqual(p.snapshots.map((s) => [s.date, s.bannerPercent]), [['2026-10-20', 90], ['2026-10-21', 40]]);
  assert.deepEqual(p.priceObservations.map((x) => x.model), ['Seedance 2.5', '2.0 Fast']);
  assert.deepEqual(p.priceObservations[0].values, [0.18, 0.45]);
  assert.deepEqual(p.priceObservations[1].values, [0.04, 0.22]);
  assert.ok(p.unobserved.some((x) => /qual valor de preço corresponde/.test(x)), 'mapeamento valor→data segue UNOBSERVED');
  assert.ok(p.unobserved.some((x) => /preço praticado hoje/.test(x)));
  assert.match(p.source, /captures\/audit\/home/, 'origem da captura registrada');
  assert.ok(!/api[_-]?key|token|secret/i.test(JSON.stringify(p)));

  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(ui, /api\/promotions/, 'a home lê a rota local');
  assert.match(ui, /Ofertas observadas/, 'o diálogo declara que são ofertas observadas');
  assert.match(ui, /Não é cotação atual/, 'o diálogo avisa que não é cotação atual');
  console.log('OK promotions_route: 2 capturas datadas, 2 preços por segundo, UNOBSERVED explícito e sem cotação atual');
} finally {
  await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
