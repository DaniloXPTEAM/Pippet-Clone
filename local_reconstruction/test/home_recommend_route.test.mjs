// Adendo r19 (13/11/2026) — feed "Featured works" da Home: rota de listagem + a API observada
// `POST /api/biz/v1/home/recommend_video` (detalhe /home?work_id=N). O conteúdo do feed é de exemplo
// nosso (títulos/autores não capturados); os campos exatos da resposta real seguem UNOBSERVED.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-home-recommend-'));
process.env.PIPPIT_LOCAL_DATA = dataDir; process.env.PIPPIT_LLM = 'off';
const { server: app } = await import('../app/server.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body) => { const res = await fetch(base + url, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() }; };

try {
  const list = await api('/api/home/featured-works');
  assert.equal(list.status, 200);
  assert.equal(list.body.heading, 'Featured works');
  assert.deepEqual(list.body.cardFields, ['title', 'author']);
  assert.ok(Array.isArray(list.body.works) && list.body.works.length >= 6, 'feed com itens de exemplo');
  assert.ok(list.body.works.every((w) => w.title && w.author && Number.isInteger(w.id)), 'cards de título + autor');
  assert.match(list.body.contentNote, /exemplo/);

  const d1 = await api('/api/biz/v1/home/recommend_video', { work_id: 1 });
  assert.equal(d1.status, 200);
  assert.equal(d1.body.ret, '0');
  assert.equal(d1.body.errmsg, '');
  assert.equal(d1.body.data.work_id, 1);
  assert.equal(d1.body.data.title, 'Sunset Drive');
  assert.equal(d1.body.data.author, 'Ana P.');
  assert.match(d1.body.data.work_intro, /compositor/);
  assert.equal(d1.body.data.share.enabled, true, 'Share presente no detalhe');
  assert.equal(d1.body.data.close.enabled, true, 'Close presente no detalhe');
  assert.ok(Array.isArray(d1.body.unobserved) && d1.body.unobserved.some((u) => /campos exatos/.test(u)), 'campos da resposta real = UNOBSERVED');

  const d2 = await api('/api/biz/v1/home/recommend_video', { work_id: 999 });
  assert.equal(d2.status, 200);
  assert.equal(d2.body.data.work_id, 999);
  assert.equal(d2.body.data.title, null, 'sem inventar conteúdo para id desconhecido');

  console.log('home_recommend_route.test.mjs: ok (feed título+autor, recommend_video espelho, Close/Share/Author/Work intro, UNOBSERVED marcado)');
} finally { app.close(); fs.rmSync(dataDir, { recursive: true, force: true }); }
