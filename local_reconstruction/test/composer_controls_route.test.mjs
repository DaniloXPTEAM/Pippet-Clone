// Controles do composer (linha 81): os rótulos observados e o que NÃO foi capturado, sem inventar opções.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-composer-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/composer/controls'); const c = await res.json();
  assert.equal(res.status, 200); assert.equal(c.ok, true);
  assert.equal(c.captured, true, 'os rótulos foram vistos');
  assert.equal(c.internalsCaptured, false, 'as opções internas não foram capturadas');
  assert.deepEqual(c.controls.map((x) => x.id), ['agent', 'mention', 'skills', 'model_preference', 'canvas_toggle']);
  assert.deepEqual(c.controls.map((x) => x.label), ['Agente ▾', '@', 'Habilidades ▾', 'Modelo | Preferência ▾', 'Tela']);
  // Cada controle aponta o seletor local que o implementa, para a UI não mentir sobre o que existe.
  for (const x of c.controls) assert.match(x.local, /^#[a-zA-Z]+$/, `seletor local de #${x.id}`);
  assert.equal(c.controls.find((x) => x.id === 'skills').optionsObserved, true);
  assert.equal(c.controls.filter((x) => !x.optionsObserved).length, 4, 'quatro controles seguem sem opções internas capturadas');
  assert.equal(c.cost.observed, false, 'custo por geração segue sem observação');
  assert.match(c.cost.note, /créditos/);
  assert.equal(c.externalCalls, false, 'nenhuma chamada ao serviço original');
  assert.match(c.source, /linha 81/);
  assert.ok(!/api[_-]?key|token|secret/i.test(JSON.stringify(c)));

  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(ui, /async function modelPrefs\(\)/, 'o painel de modelos é assíncrono para ler a rota');
  assert.match(ui, /api\/composer\/controls/, 'a home lê a rota local');
  assert.match(ui, /id="costnote"/, 'a tela declara o custo UNOBSERVED');
  assert.match(ui, /opções internas capturadas/, 'a tela conta quantos controles ficaram sem captura');
  console.log('OK composer_controls_route: 5 rótulos com seletor local, 4 sem opções internas, custo UNOBSERVED');
} finally {
  await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
