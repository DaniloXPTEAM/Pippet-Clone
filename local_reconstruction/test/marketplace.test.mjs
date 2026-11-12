// Linha #14 — marketplace/loja: conexão, importação de produto e envio de vídeo contra SERVIDOR FALSO.
// A credencial vem SÓ do ambiente; a API nunca devolve a chave; campos não devolvidos pela loja = UNOBSERVED.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-mkt-'));
process.env.PIPPIT_LOCAL_DATA = tmp;
process.env.PIPPIT_LLM = 'off';
process.env.MARKETPLACE_API_KEY = 'loja-key-test';

const FFMPEG = process.env.PIPPIT_FFMPEG || 'ffmpeg';
const MP4_FILE = path.join(tmp, 'clipe.mp4');
execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=320x240:d=1', '-pix_fmt', 'yuv420p', '-r', '24', MP4_FILE]);

// ---------- servidor falso da loja ----------
const shop = { hits: [], mode: 'ok' };
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const u = new URL(req.url, 'http://127.0.0.1'); const raw = Buffer.concat(chunks);
    shop.hits.push({ method: req.method, path: u.pathname, auth: req.headers.authorization || null, body: raw.toString('utf8'), bytes: raw.length, contentType: req.headers['content-type'] || '' });
    const json = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (shop.mode === 'off') return json(500, { error: 'loja fora do ar' });
    if (req.headers.authorization !== 'Bearer loja-key-test') return json(401, { error: 'credencial inválida' });
    if (u.pathname === '/shop/verify') return json(200, { ok: true, shop: { id: 'loja-1', name: 'Loja Falsa' } });
    if (u.pathname === '/shop/products') return json(200, { products: [{ id: 'p-1', title: 'Camiseta', price: 49.9 }, { id: 'p-2', title: 'Caneca' }] });
    if (u.pathname === '/shop/products/p-1') return json(200, { id: 'p-1', title: 'Camiseta', price: 49.9 });
    if (u.pathname === '/shop/products/p-2') return json(200, { id: 'p-2', title: 'Caneca' }); // sem preço/descrição/imagem → UNOBSERVED
    if (u.pathname === '/shop/products/nao-existe') return json(404, { error: 'produto inexistente' });
    if (u.pathname === '/shop/products/p-1/video' && req.method === 'POST') return json(200, { ok: true, remoteId: 'vid-77' });
    return json(404, { error: `rota falsa ${req.method} ${u.pathname}` });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
process.env.MARKETPLACE_BASE_URL = `http://127.0.0.1:${fake.address().port}`;

const { server: app } = await import('../app/server.mjs');
const MKT = await import('../src/marketplace.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
process.env.PIPERLINE_PUBLIC_ORIGIN = base;

const api = async (url, body, method = 'POST') => { const r = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const why = (r) => (r.body?.error || JSON.stringify(r.body)).slice(0, 300);
const ok = (r, what) => { assert.ok(r.status >= 200 && r.status < 300, `${what}: HTTP ${r.status} — ${why(r)}`); return r.body; };

try {
  // ---------- contrato e estado ----------
  const st = ok(await api('/api/marketplace/status', undefined, 'GET'), 'status');
  assert.equal(st.connected, false); assert.equal(st.configured, true);
  assert.equal(st.contract.adapter, 'generic-rest');
  assert.deepEqual(Object.keys(st.contract.paths).sort(), ['product', 'products', 'verify', 'video']);
  assert.ok(!JSON.stringify(st).includes('loja-key-test'), 'a chave nunca aparece em resposta');

  // ---------- conexão ----------
  const c = ok(await api('/api/marketplace/connect', {}), 'conectar');
  assert.deepEqual(c.shop, { id: 'loja-1', name: 'Loja Falsa' });
  assert.ok(shop.hits.every((h) => h.auth === 'Bearer loja-key-test'), 'a chave do AMBIENTE vai no Authorization');

  // ---------- produtos: listagem + importação (campos ausentes = UNOBSERVED, nunca inventados) ----------
  const prods = ok(await api('/api/marketplace/products', undefined, 'GET'), 'listar produtos');
  assert.equal(prods.products.length, 2);
  assert.deepEqual(prods.products[1], { id: 'p-2', title: 'Caneca', price: 'UNOBSERVED', description: 'UNOBSERVED', image: 'UNOBSERVED' });
  const imp = ok(await api('/api/marketplace/products/import', { productId: 'p-2' }), 'importar produto');
  assert.equal(imp.product.id, 'p-2'); assert.equal(imp.product.price, 'UNOBSERVED');
  assert.equal(imp.imported, 1);
  const st2 = ok(await api('/api/marketplace/status', undefined, 'GET'), 'status pós-import');
  assert.equal(st2.connected, true); assert.equal(st2.products.length, 1);
  assert.equal(st2.shop.name, 'Loja Falsa');
  const imp404 = await api('/api/marketplace/products/import', { productId: 'nao-existe' });
  assert.equal(imp404.status, 502); assert.match(imp404.body.error, /produto inexistente/);

  // ---------- envio de vídeo ao produto ----------
  const up = await fetch(`${base}/api/assets`, { method: 'POST', headers: { 'x-file-name': encodeURIComponent('clipe.mp4'), 'content-type': 'video/mp4', 'x-cat': 'upload' }, body: fs.readFileSync(MP4_FILE) });
  assert.equal(up.status, 200); const asset = await up.json();
  const vid = ok(await api('/api/marketplace/video', { productId: 'p-1', assetId: asset.id, caption: 'Vídeo do produto' }), 'enviar vídeo');
  assert.equal(vid.remoteId, 'vid-77');
  const vh = shop.hits.find((h) => h.path === '/shop/products/p-1/video');
  assert.ok(vh && vh.method === 'POST' && vh.contentType.startsWith('multipart/form-data'), 'vídeo por multipart');
  assert.ok(vh.body.includes('Vídeo do produto') && vh.body.includes('video.mp4'), 'legenda + bytes do vídeo no envio');

  // ---------- erros honestos ----------
  shop.mode = 'off';
  const off = await api('/api/marketplace/products', undefined, 'GET');
  assert.equal(off.status, 502); assert.match(off.body.error, /fora do ar/);
  shop.mode = 'ok';
  const semAsset = await api('/api/marketplace/video', { productId: 'p-1', assetId: 'nao' });
  assert.equal(semAsset.status, 404);

  // módulo: sem credencial no ambiente → bloqueado com o nome da variável
  const savedKey = process.env.MARKETPLACE_API_KEY; delete process.env.MARKETPLACE_API_KEY;
  const semCred = await MKT.connect({});
  assert.equal(semCred.ok, false); assert.equal(semCred.blocked, true); assert.match(semCred.error, /MARKETPLACE_API_KEY/);
  process.env.MARKETPLACE_API_KEY = savedKey;

  console.log('ok (test/marketplace.test.mjs)');
} finally {
  await new Promise((r) => app.close(r)); await new Promise((r) => fake.close(r));
}
