// Rodada 7 · item 5 — pagamento (estrutura): planos, créditos e cobrança com adaptador `gratuito` (atual) e
// gateway DESABILITADO (checkout/webhook/portal). Sem SDK, sem chamada, nada cobrado. Teste de rede: 0 saídas.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
if (skipUnavailableBrowser('billing_structure')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-bill-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const PORT = 5204; const base = `http://127.0.0.1:${PORT}`; const outbound = [];
const realFetch = globalThis.fetch; globalThis.fetch = (u, o) => { const s = String(u?.url || u); if (!s.startsWith(base)) outbound.push('fetch ' + s); return realFetch(u, o); };
for (const [n, mod] of [['http', http], ['https', https]]) { const rq = mod.request; mod.request = function (...a) { const hh = typeof a[0] === 'string' ? a[0] : a[0]?.hostname || ''; if (!/^(127\.0\.0\.1|localhost)$/.test(String(hh))) outbound.push(n + ' ' + hh); return rq.apply(this, a); }; }

const B = await import('../src/billing.mjs');
// ---------- 1. adaptadores e contrato
assert.deepEqual(Object.keys(B.BILLING_ADAPTERS), ['gratuito', 'gateway']);
assert.equal(B.BILLING_ADAPTERS.gratuito.enabled, true); assert.equal(B.BILLING_ADAPTERS.gateway.enabled, false);
assert.deepEqual(B.BILLING_ADAPTERS.gateway.env, ['BILLING_GATEWAY_BASE_URL', 'BILLING_GATEWAY_KEY', 'BILLING_WEBHOOK_SECRET', 'BILLING_PORTAL_URL']);
assert.equal(B.BILLING_ADAPTERS.gateway.configured, false, 'sem variáveis no ambiente: não configurado');
assert.ok(B.GATEWAY_CONTRACT.checkout.endpoint.includes('/v1/checkout/sessions'));
assert.match(B.GATEWAY_CONTRACT.webhook.headers[0], /HMAC-SHA256/); assert.ok(B.GATEWAY_CONTRACT.webhook.events.includes('payment.paid'));
assert.ok(B.GATEWAY_CONTRACT.portal.endpoint.includes('/v1/billing/portal'));
assert.ok(!/require\(|from 'stripe'|import .*stripe/i.test(fs.readFileSync(new URL('../src/billing.mjs', import.meta.url), 'utf8')), 'nenhum SDK de pagamento');
assert.deepEqual(B.BILLING_STATES, ['sem_cobranca', 'checkout_pendente', 'pago', 'recusado', 'reembolsado']);

// preço vem do catálogo local
assert.equal(B.priceFor('starter').amount, 7.59); assert.equal(B.priceFor('starter', { billing: 'annual' }).amount, 513);
assert.equal(B.priceFor('free').amount, 0); assert.equal(B.priceFor('plus').currency, 'BRL'); assert.match(B.priceFor('nao-existe').error, /plano inválido/);

// checkout: nada é cobrado em nenhum caminho
let ck = B.checkoutIntent({ planId: 'starter', adapter: B.BILLING_ADAPTERS.gratuito });
assert.equal(ck.ok, true); assert.equal(ck.charged, false); assert.equal(ck.state, 'sem_cobranca'); assert.equal(ck.intent.amount, 7.59); assert.match(ck.note, /nenhum valor é debitado/);
ck = B.checkoutIntent({ planId: 'free' }); assert.equal(ck.charged, false); assert.match(ck.note, /nada a cobrar/);
ck = B.checkoutIntent({ planId: 'plus', adapter: B.BILLING_ADAPTERS.gateway }); assert.equal(ck.ok, false); assert.equal(ck.status, 501); assert.match(ck.error, /desabilitado \(estrutura\)/); assert.ok(ck.contract.checkout); assert.equal(ck.charged, false);
assert.equal(B.checkoutIntent({ planId: 'xyz' }).status, 400);
const ch = B.applyPlanChange({ planId: 'plus' }); assert.equal(ch.ok, true); assert.equal(ch.charged, false); assert.equal(ch.amount, 0); assert.match(B.applyPlanChange({ planId: 'nada' }).error, /plano inválido/);
const summary = B.billingSummary({ adapter: 'gratuito', user: { plan: 'free' }, balance: 280 });
assert.equal(summary.charged, false); assert.equal(summary.state, 'sem_cobranca'); assert.equal(summary.credits.purchaseEnabled, false); assert.equal(summary.plans.length, 4);
assert.equal(summary.adapters.find((a) => a.id === 'gateway').enabled, false);

// ---------- 2. rotas
const { server } = await import('../app/server.mjs'); await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
const j = async (p, o = {}) => { const rr = await fetch(base + p, o); return { status: rr.status, body: await rr.json() }; };
const send = (m) => (p, b, headers = {}) => j(p, { method: m, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(b || {}) }); const post = send('POST');
let s = (await j('/api/billing')).body;
assert.equal(s.ok, true); assert.equal(s.adapter, 'gratuito'); assert.equal(s.charged, false); assert.equal(s.credits.purchaseEnabled, false);
assert.ok(!/"(secret|apiKey|key)"\s*:\s*"[^"]+"/i.test(JSON.stringify(s)), 'só nomes de variáveis, nunca valores');
const before = (await j('/api/state')).body; 
let r = await post('/api/billing/checkout', { planId: 'starter' }); assert.equal(r.status, 200); assert.equal(r.body.charged, false); assert.equal(r.body.state, 'sem_cobranca');
assert.equal((await j('/api/state')).body.user.plan, before.user.plan, 'checkout não troca plano nem cobra');
assert.equal((await j('/api/state')).body.balance, before.balance, 'saldo de créditos intacto');
r = await post('/api/billing/checkout', { planId: 'nao-existe' }); assert.equal(r.status, 400);
// gateway: selecionável, mas 501 com contrato
assert.equal((await post('/api/billing/adapter', { adapter: 'pix' })).status, 400);
r = await post('/api/billing/adapter', { adapter: 'gateway' }); assert.equal(r.status, 200); assert.equal(r.body.adapter, 'gateway');
r = await post('/api/billing/checkout', { planId: 'starter', billing: 'annual' }); assert.equal(r.status, 501); assert.match(r.body.error, /desabilitado/); assert.ok(r.body.contract.checkout); assert.equal(r.body.charged, false); assert.ok(r.body.missing.length >= 3);
r = await post('/api/billing/webhook', { event: 'payment.paid', amount: 7.59 }); assert.equal(r.status, 501); assert.equal(r.body.charged, false); assert.match(r.body.error, /nenhum evento é processado/);
r = await post('/api/billing/webhook', { event: 'payment.paid' }, { 'x-signature': 'deadbeef' }); assert.equal(r.status, 501); assert.equal(r.body.signed, true, 'mesmo assinado, nada é aplicado sem gateway real');
assert.equal((await j('/api/billing/portal')).status, 501);
assert.equal((await j('/api/state')).body.user.plan, before.user.plan, 'webhook/portal/checkout não mudam o plano');
assert.equal((await j('/api/ledger')).body.entries.filter((e2) => /compra|pagamento|checkout/i.test(e2.label)).length, 0, 'nenhum lançamento de compra');
// troca local de plano continua funcionando (adaptador gratuito) e sem cobrança
r = await post('/api/plan', { plan: 'plus' }); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.charged, false); assert.equal((await j('/api/state')).body.user.plan, 'plus');
assert.equal((await post('/api/plan', { plan: 'nada' })).status, 400);
assert.equal((await post('/api/plan', { plan: 'free' })).status, 200);
await post('/api/billing/adapter', { adapter: 'gratuito' });
assert.equal((await j('/api/billing')).body.adapter, 'gratuito');
assert.deepEqual(outbound, [], 'nenhuma chamada para gateway (sem SDK e sem rede)');

// ---------- 3. tela: nota de cobrança e checkout honesto no modal de planos
const browser = await launchChromium(); const errors = [];
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage(); page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + '/#/home'); await page.waitForSelector('#credits');
  await page.locator('#credits').click(); await page.getByText('Ver planos').click(); await page.waitForSelector('.plans');
  const txt = await page.locator('.modal').innerText();
  assert.match(txt, /Produto gratuito e sem bloqueio/); assert.match(txt, /Estrutura de pagamento presente no código, desligada/);
  assert.equal(await page.locator('#billingNote').count(), 0, 'estrutura de pagamento fora da UI (desligada — r20)');
  assert.equal(await page.locator('#billCheckout').count(), 0);
  assert.equal(await page.locator('.plans button:not([disabled])').count(), 0, 'botões de plano desabilitados (r20)');
  assert.ok(!/R\$/.test(txt), 'sem valores em R$');
  assert.deepEqual(errors, []);
  console.log('billing_structure: OK');
} finally { await browser.close(); server.close(); }
