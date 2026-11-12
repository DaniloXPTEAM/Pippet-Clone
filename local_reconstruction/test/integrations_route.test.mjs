// Integrações de loja/marketplace (linha 77): a frase de marketing é observada; a TELA local existe desde a
// rodada 18 (#14) — o conteúdo da tela do Pippit real continua UNOBSERVED. Social confirmado.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-integr-'));
process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_LLM = 'off';
const { server } = await import('../app/server.mjs');
await new Promise((x) => server.listen(0, '127.0.0.1', x));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const res = await fetch(base + '/api/integrations'); const i = await res.json();
  assert.equal(res.status, 200); assert.equal(i.ok, true);
  assert.equal(i.claimCaptured, true, 'a frase de marketing foi vista');
  assert.match(i.marketingClaim, /mercado de vendas online/);
  assert.equal(i.marketplace.screens, 1, 'a tela de integrações foi implementada (rodada 18, #14)');
  assert.match(i.marketplace.status, /implementada.*UNOBSERVED/);
  assert.match(i.marketplace.note, /tela local/);
  assert.equal(i.marketplace.adapter.id, 'generic-rest');
  assert.ok(!/api[_-]?key|token|secret/i.test(JSON.stringify(i)), 'nem nome/valor de credencial nesta rota');
  assert.deepEqual(i.social.map((x) => x.id), ['tiktok', 'facebook', 'instagram']);
  assert.ok(i.social.every((x) => x.status === 'CONFIRMED'), 'só o social está confirmado');
  assert.ok(i.social.every((x) => /publicação/.test(x.where)), 'cada canal aponta onde aparece');
  assert.equal(i.oauth, 'UNOBSERVED', 'vincular conta real nunca foi observado');
  assert.equal(i.externalCalls, false, 'nenhuma chamada ao serviço original');
  assert.match(i.source, /linha 77/);
  assert.ok(!/api[_-]?key|token|secret/i.test(JSON.stringify(i)));

  const ui = fs.readFileSync(new URL('../app/public/app.js', import.meta.url), 'utf8');
  assert.match(ui, /api\/integrations/, 'a página de preços lê a rota local');
  assert.match(ui, /id="integrationsNote"/, 'a página de preços tem o aviso na tela');
  assert.match(ui, /Redes sociais confirmadas/, 'o aviso nomeia o que está confirmado');
  console.log('OK integrations_route: marketplace implementado (conteúdo UNOBSERVED), 3 canais sociais confirmados, sem chamada externa');
} finally {
  await new Promise((x) => server.close(x)); fs.rmSync(tmp, { recursive: true, force: true });
}
