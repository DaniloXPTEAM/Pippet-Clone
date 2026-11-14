// Três bolsas de créditos (vip/gift/purchase) conforme benefits/user_credit observado. Regras comprovadas: lotes com validade, débito consome o lote que vence primeiro,
// "Expired −N" ao vencer, bônus de conta +200 (2 anos), diário +80 (até 23:59:59), gratuitos/bônus = gift. Regras NÃO observadas (ordem entre bolsas) ficam documentadas, não inventadas.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CreditLedger, POUCHES } from '../src/credits.mjs';
const T0 = new Date('2026-10-21T10:00:00'); const day = (n) => new Date(T0.getTime() + n * 86400000);

// unidade
assert.deepEqual(POUCHES, ['vip', 'gift', 'purchase']);
const l = new CreditLedger(); l.grant('Bônus', 200, T0, day(730)); l.grant('Créditos gratuitos', 80, T0, new Date('2026-10-21T23:59:59'));
assert.deepEqual(l.balances(T0), { vip_credit: 0, gift_credit: 280, purchase_credit: 0 }); assert.equal(l.balance(T0), 280);
assert.throws(() => l.grant('x', 1, T0, day(1), 'ouro'), /bolsa invalida/);
l.grant('Assinatura (teste de unidade)', 100, T0, day(30), 'vip'); l.grant('Compra (teste de unidade)', 50, T0, day(60), 'purchase');
assert.deepEqual(l.balances(T0), { vip_credit: 100, gift_credit: 280, purchase_credit: 50 }); assert.equal(l.balance(T0), 430);
// débito: lote que vence primeiro (diário 80 gift -> vip 100 -> purchase 50 -> bônus 200), registrando de qual bolsa saiu
let r = l.debit('Vídeo', 150, T0); assert.equal(r.ok, true); assert.deepEqual(r.pouches, { gift: 80, vip: 70 }); assert.deepEqual(l.balances(T0), { vip_credit: 30, gift_credit: 200, purchase_credit: 50 });
assert.deepEqual(l.entries.at(-1).pouches, { gift: 80, vip: 70 }); assert.equal(l.entries.at(-1).delta, -150);
// saldo insuficiente não altera nada
const snap = JSON.stringify(l.balances(T0)); assert.deepEqual(l.debit('Enorme', 9999, T0), { ok: false, reason: 'insufficient_credits' }); assert.equal(JSON.stringify(l.balances(T0)), snap);
// expiração por bolsa: no dia seguinte o diário (gift) já tinha sido consumido; o vip de 30 dias vence depois; "Expired" carrega a bolsa
const l2 = new CreditLedger(); l2.grant('Créditos gratuitos', 80, T0, new Date('2026-10-21T23:59:59')); l2.grant('Assinatura', 40, T0, day(2), 'vip');
assert.deepEqual(l2.balances(day(1)), { vip_credit: 40, gift_credit: 0, purchase_credit: 0 }); const ex = l2.entries.find((e) => e.label === 'Expired'); assert.equal(ex.delta, -80); assert.equal(ex.pouch, 'gift');
assert.deepEqual(l2.balances(day(3)), { vip_credit: 0, gift_credit: 0, purchase_credit: 0 }); assert.equal(l2.entries.filter((e) => e.label === 'Expired').length, 2);
// lotes antigos (salvos antes das bolsas, sem campo pouch) contam como gift
const legacy = new CreditLedger(); legacy.lots.push({ label: 'antigo', remaining: 40, expiresAt: day(5) }); assert.deepEqual(legacy.balances(T0), { vip_credit: 0, gift_credit: 40, purchase_credit: 0 });

// API: estado, livro-razão, concessão diária e débito de uma geração (dados locais; nenhum crédito do Pippit é tocado)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-cp-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const PORT = 5200; await new Promise((x) => server.listen(PORT, '127.0.0.1', x)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const x = await fetch(base + p, o); return { status: x.status, body: await x.json() }; }; const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
let st = (await j('/api/state')).body; assert.deepEqual(st.balances, { vip_credit: 0, gift_credit: 200, purchase_credit: 0 }, 'conta nova: bônus +200 na bolsa gift'); assert.equal(st.balance, 200);
assert.equal((await post('/api/daily-claim')).body.claimed, true); st = (await j('/api/state')).body; assert.deepEqual(st.balances, { vip_credit: 0, gift_credit: 2200, purchase_credit: 0 });
let led = (await j('/api/ledger')).body; assert.deepEqual(led.balances, st.balances); assert.deepEqual(led.lots.map((x) => [x.label, x.pouch, x.remaining]).sort(), [['Créditos de bônus por criação de conta', 'gift', 200], ['Créditos gratuitos', 'gift', 2000]]);
assert.ok(led.entries.every((e) => e.pouch === 'gift' || e.pouches), 'histórico indica a bolsa de cada movimentação'); assert.ok(new Date(led.lots.find((x) => /bônus/.test(x.label)).expiresAt) - Date.now() > 700 * 86400000, 'bônus vale ~2 anos');
// protocolo local de geração direta (envelope observado): user_credit devolve as três bolsas
const dr = await j('/commerce/v1/benefits/user_credit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); assert.equal(dr.status, 200); assert.deepEqual(dr.body.data.credit, { vip_credit: 0, gift_credit: 2200, purchase_credit: 0 }); assert.equal(dr.body.ret, '0');
console.log('OK credits_pouches: bolsas vip/gift/purchase (unidade + API + user_credit), débito por validade, expiração por bolsa, lotes antigos como gift; ordem entre bolsas NÃO observada (documentado)'); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
