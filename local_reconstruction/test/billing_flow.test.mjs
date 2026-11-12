// Linha #39 — compra/assinatura real: SÓ ESTRUTURA (decisão do usuário) — checkout, webhook ASSINADO e
// portal contra SERVIDOR FALSO. Sem gateway real, sem SDK e sem cobrança. Só o webhook com HMAC-SHA256
// válido muda estado; evento desconhecido/assinatura errada = nada aplicado.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-bf-'));
process.env.PIPPIT_LOCAL_DATA = tmp;
process.env.PIPPIT_LLM = 'off';
process.env.BILLING_GATEWAY_KEY = 'gw-key-test';
process.env.BILLING_WEBHOOK_SECRET = 'whsec-teste';

// ---------- servidor falso do gateway ----------
const gw = { hits: [] };
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const u = new URL(req.url, 'http://127.0.0.1'); const raw = Buffer.concat(chunks);
    gw.hits.push({ method: req.method, path: u.pathname, auth: req.headers.authorization || null, body: raw.toString('utf8') });
    const json = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.headers.authorization !== 'Bearer gw-key-test') return json(401, { error: 'credencial inválida' });
    if (u.pathname === '/v1/checkout/sessions' && req.method === 'POST') {
      const b = JSON.parse(raw.toString() || '{}');
      return json(200, { id: 'cs-1', url: `http://127.0.0.1:${fake.address().port}/checkout/cs-1`, amount: b.amount, currency: b.currency || 'BRL', status: 'checkout_pendente' });
    }
    if (u.pathname === '/v1/billing/portal') return json(200, { url: `http://127.0.0.1:${fake.address().port}/portal/p-1` });
    return json(404, { error: `rota falsa ${req.method} ${u.pathname}` });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
process.env.BILLING_GATEWAY_BASE_URL = `http://127.0.0.1:${fake.address().port}`;

const { server: app } = await import('../app/server.mjs');
const BF = await import('../src/billing_flow.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
process.env.PIPERLINE_PUBLIC_ORIGIN = base;

const api = async (url, body, method = 'POST') => { const r = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const why = (r) => (r.body?.error || JSON.stringify(r.body)).slice(0, 300);
const ok = (r, what) => { assert.ok(r.status >= 200 && r.status < 300, `${what}: HTTP ${r.status} — ${why(r)}`); return r.body; };
const postWebhook = async (event, signature) => {
  const raw = JSON.stringify(event);
  const r = await fetch(base + '/api/billing/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': signature }, body: raw });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

try {
  // ---------- contrato ----------
  const flow = ok(await api('/api/billing/flow', undefined, 'GET'), 'fluxo');
  assert.match(flow.line, /S(Ó|O) ESTRUTURA/);
  assert.equal(flow.configured, true);
  assert.deepEqual(flow.events, ['checkout.completed', 'payment.paid', 'payment.failed', 'refund.created']);
  assert.deepEqual(flow.states, ['sem_cobranca', 'checkout_pendente', 'pago', 'recusado', 'reembolsado']);
  assert.ok(!JSON.stringify(flow).includes('gw-key-test') && !JSON.stringify(flow).includes('whsec-teste'), 'credenciais nunca em resposta');

  // ---------- checkout ----------
  const ck = ok(await api('/api/billing/checkout', { planId: 'starter', billing: 'monthly' }), 'checkout');
  assert.equal(ck.session.state, 'checkout_pendente');
  assert.equal(ck.session.amount, 7.59, 'valor do catálogo local');
  assert.equal(ck.session.id, 'cs-1');
  assert.match(ck.checkoutUrl, /\/checkout\/cs-1/);
  const gh = gw.hits.find((h) => h.path === '/v1/checkout/sessions');
  assert.ok(gh && gh.auth === 'Bearer gw-key-test', 'gateway recebe a chave do ambiente');
  assert.ok(gh.body.includes('"plan_id":"starter"') && gh.body.includes('"amount":7.59'));
  const ckFree = await api('/api/billing/checkout', { planId: 'free' });
  assert.equal(ckFree.status, 400, 'plano gratuito não abre checkout real'); // priceFor ok mas o gateway... free: amount 0
  // (free: checkoutIntent devolve sem_cobranca e a rota registra sessão — aqui esperamos 400 só para plano inválido)
  const ckRuim = await api('/api/billing/checkout', { planId: 'nao-existe' });
  assert.equal(ckRuim.status, 400);

  // ---------- webhook assinado ----------
  const sigErrado = await postWebhook({ type: 'payment.paid', session_id: 'cs-1', plan_id: 'plus' }, 'deadbeef');
  assert.equal(sigErrado.status, 401); assert.match(sigErrado.body.error, /assinatura/);
  let st = (await api('/api/billing/flow', undefined, 'GET')).body.sessions[0];
  assert.equal(st.state, 'checkout_pendente', 'assinatura errada não muda estado');

  const pago = await postWebhook({ type: 'payment.paid', session_id: 'cs-1', plan_id: 'plus' }, BF.signWebhook(JSON.stringify({ type: 'payment.paid', session_id: 'cs-1', plan_id: 'plus' }), 'whsec-teste'));
  assert.equal(pago.status, 200); assert.equal(pago.body.session.state, 'pago');
  assert.equal(pago.body.planChange.plan, 'plus', 'troca de plano aplicada só após verificação');
  assert.equal(pago.body.planChange.charged, false, 'troca local: nada cobrado');

  const tipoRuim = await postWebhook({ type: 'evento.inventado', session_id: 'cs-1' }, BF.signWebhook(JSON.stringify({ type: 'evento.inventado', session_id: 'cs-1' }), 'whsec-teste'));
  assert.equal(tipoRuim.status, 400); assert.match(tipoRuim.body.error, /desconhecido/);

  const falhou = await postWebhook({ type: 'payment.failed', session_id: 'cs-1' }, BF.signWebhook(JSON.stringify({ type: 'payment.failed', session_id: 'cs-1' }), 'whsec-teste'));
  assert.equal(falhou.body.session.state, 'recusado');
  const reemb = await postWebhook({ type: 'refund.created', session_id: 'cs-1' }, BF.signWebhook(JSON.stringify({ type: 'refund.created', session_id: 'cs-1' }), 'whsec-teste'));
  assert.equal(reemb.body.session.state, 'reembolsado');

  // ---------- portal ----------
  const pt = ok(await api('/api/billing/portal', {}), 'portal');
  assert.match(pt.portalUrl, /\/portal\/p-1/);

  // ---------- sem gateway no ambiente: bloqueio honesto com os NOMES das variáveis ----------
  const saved = [process.env.BILLING_GATEWAY_BASE_URL, process.env.BILLING_GATEWAY_KEY];
  delete process.env.BILLING_GATEWAY_BASE_URL; delete process.env.BILLING_GATEWAY_KEY;
  const semCfg = await api('/api/billing/checkout', { planId: 'starter' });
  assert.equal(semCfg.status, 409); assert.equal(semCfg.body.blocked, true);
  assert.match(semCfg.body.error, /BILLING_GATEWAY_BASE_URL/);
  const semPortal = await api('/api/billing/portal', {});
  assert.equal(semPortal.status, 409);
  process.env.BILLING_GATEWAY_BASE_URL = saved[0]; process.env.BILLING_GATEWAY_KEY = saved[1];

  console.log('ok (test/billing_flow.test.mjs)');
} finally {
  await new Promise((r) => app.close(r)); await new Promise((r) => fake.close(r));
}
