// Rodada 7 · item 4 — publicação (estrutura): TikTok, Instagram, Facebook e YouTube com contrato de OAuth,
// escopos, fila, agendamento e estados. Nenhum adaptador conectado, nenhuma chamada real: /connect segue 501 e
// /publish segue 409 até existir credencial. Teste de rede: toda saída para fora do servidor local é contada (0).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
if (skipUnavailableBrowser('publish_queue')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-pubq-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const PORT = 5203; const base = `http://127.0.0.1:${PORT}`; const outbound = [];
const realFetch = globalThis.fetch; globalThis.fetch = (u, o) => { const s = String(u?.url || u); if (!s.startsWith(base)) outbound.push('fetch ' + s); return realFetch(u, o); };
for (const [n, mod] of [['http', http], ['https', https]]) { const rq = mod.request; mod.request = function (...a) { const hh = typeof a[0] === 'string' ? a[0] : a[0]?.hostname || ''; if (!/^(127\.0\.0\.1|localhost)$/.test(String(hh))) outbound.push(n + ' ' + hh); return rq.apply(this, a); }; }

const P = await import('../src/publishing.mjs'); const media = await import('../app/lib/media.mjs');
// ---------- 1. contrato dos quatro adaptadores (só descrição, nada conectado)
assert.deepEqual(Object.keys(P.PUBLISH_ADAPTERS).sort(), ['facebook_page', 'instagram_reels', 'tiktok', 'youtube']);
for (const a of Object.values(P.PUBLISH_ADAPTERS)) {
  assert.equal(a.status, 'nao_conectado'); assert.equal(a.connected, false);
  assert.ok(a.oauth.scopes.length > 0, a.id + ' declara escopos'); assert.ok(a.oauth.authorizeUrl.startsWith('https://') && a.oauth.tokenUrl.startsWith('https://'), a.id + ' declara endpoints OAuth');
  assert.ok(a.publish.endpoint.startsWith('https://') && a.publish.method === 'POST', a.id + ' declara endpoint de publicação');
  assert.ok(a.missing.length >= 2, a.id + ' diz o que falta'); assert.ok(Object.keys(a.env).length === 3, a.id + ' nomeia as variáveis de ambiente');
  assert.ok(!JSON.stringify(a).match(/secret\s*[:=]\s*['"][^'"]+['"]/i), a.id + ' não carrega segredo');
}
assert.deepEqual(Object.values(P.PUBLISH_ADAPTERS).map((a) => a.codes), [[1], [311], [301], []]);
assert.equal(P.adapterForPlatform(1).id, 'tiktok'); assert.equal(P.adapterForPlatform(301).id, 'facebook_page'); assert.equal(P.adapterForPlatform(311).id, 'instagram_reels'); assert.equal(P.adapterForPlatform(3), null, 'código desconhecido não ganha serviço inventado');
assert.equal(P.publishAdaptersSummary().length, 4); assert.ok(P.publishAdaptersSummary().every((a) => /sem credencial/.test(a.blockedReason)));

// ---------- 2. máquina de estados
assert.deepEqual(P.PUBLISH_STATES, ['rascunho', 'agendado', 'publicando', 'publicado', 'falhou']);
assert.equal(P.canTransition('rascunho', 'agendado'), true); assert.equal(P.canTransition('agendado', 'publicando'), true); assert.equal(P.canTransition('publicando', 'publicado'), true); assert.equal(P.canTransition('publicado', 'rascunho'), false, 'publicado é terminal'); assert.equal(P.canTransition('rascunho', 'publicado'), false, 'não se publica pulando etapas');
assert.match(P.transition({ state: 'rascunho' }, 'publicado').error, /transição inválida/); assert.match(P.transition({ state: 'rascunho' }, 'zzz').error, /estado desconhecido/);
const now = Date.parse('2026-11-09T10:00:00Z');
assert.equal(P.createTask({ assetId: '1', platforms: [1] }, { now }).state, 'rascunho');
assert.equal(P.createTask({ assetId: '1', platforms: [1], scheduledAt: '2026-11-10T10:00:00Z' }, { now }).state, 'agendado');
assert.equal(P.canTransition('falhou', 'rascunho'), true);

// sem conta vinculada: nenhuma tentativa vira publicado (vai direto para falhou, com motivo)
let t = P.createTask({ assetId: '1', platforms: [1, 311] }, { now });
let r = P.attemptPublish(t, { now }); assert.equal(r.ok, false); assert.equal(r.status, 409); assert.equal(r.task.state, 'falhou'); assert.match(r.reason, /nenhuma conta vinculada/);
assert.match(r.task.reason, /TikTok/); assert.equal(r.task.attempts ?? 0, 0, 'tentativa bloqueada não conta como envio');
assert.equal(P.attemptPublish(P.createTask({ assetId: '1', platforms: [] }, { now }), { now }).ok, false);
const pub = { ...P.createTask({ assetId: '1', platforms: [1] }, { now }), state: 'publicado' };
assert.equal(P.attemptPublish(pub, { now }).ok, false); assert.match(P.attemptPublish(pub, { now }).reason, /já publicado/);
assert.match(P.attemptPublish(P.createTask({ assetId: '1', platforms: [3] }, { now }), { now }).reason, /sem adaptador oficial mapeado/);
// adaptador de TESTE conectado: prova que a máquina chega a publicado (o produto nunca tem esse adaptador)
const fakeAdapter = { id: 'fake', label: 'Fake', codes: [1], connected: true, missing: [] };
const fake = { fake: fakeAdapter };
r = P.attemptPublish(P.createTask({ assetId: '1', platforms: [1] }, { now }), { connections: { 1: { connected: true } }, adapters: fake, now });
assert.equal(r.ok, true); assert.equal(r.task.state, 'publicado'); assert.equal(r.task.attempts, 1); assert.match(r.task.reason, /simulado/);
// agendamento
const sched = P.createTask({ assetId: '1', platforms: [1], scheduledAt: '2026-11-09T11:00:00Z' }, { now });
assert.deepEqual(P.dueForPublish([sched], now).length, 0); assert.deepEqual(P.dueForPublish([sched], now + 2 * 3600_000).length, 1);
assert.equal(P.queueSummary([sched]).counts.agendado, 1); assert.match(P.queueSummary([]).note, /nunca em "publicado"/);

// ---------- 3. rotas: fila local, tentativas bloqueadas, /connect 501 e /publish 409
const { server } = await import('../app/server.mjs'); await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
const j = async (p, o = {}) => { const rr = await fetch(base + p, o); return { status: rr.status, body: await rr.json() }; };
const send = (m) => (p, b) => j(p, { method: m, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }); const post = send('POST'), del = send('DELETE');
const f = path.join(tmp, 'v.mp4'); assert.equal(spawnSync(media.FFMPEG, ['-y', '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=25:duration=1', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', f]).status, 0);
const vid = (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': 'clipe.mp4', 'content-type': 'video/mp4' }, body: fs.readFileSync(f) })).body;
let ad = (await j('/api/social/adapters')).body; assert.equal(ad.adapters.length, 4); assert.deepEqual(ad.states, P.PUBLISH_STATES); assert.deepEqual(ad.connections, {});
assert.ok(!JSON.stringify(ad).includes('clientSecret": "'), 'nenhum valor de credencial na resposta');
const conn = await post('/api/social/connect', { platform: 'tiktok' }); assert.equal(conn.status, 501); assert.deepEqual(conn.body.adapter.oauth.scopes, ['video.publish', 'video.upload']); assert.equal(conn.body.status, 'nao_conectado');
assert.equal((await post('/api/social/publish', { platforms: [1, 301] })).status, 409);

assert.equal((await post('/api/social/queue', { assetId: 'nao-existe', platforms: [1] })).status, 400);
assert.equal((await post('/api/social/queue', { draftId: '999' })).status, 404);
let q = await post('/api/social/queue', { assetId: vid.id, caption: 'legenda', platforms: [1, 311] }); assert.equal(q.status, 200, JSON.stringify(q.body));
assert.equal(q.body.task.state, 'rascunho'); assert.match(q.body.note, /nada é enviado/); const tid = q.body.task.id;
const when = new Date(Date.now() + 3600_000).toISOString();
q = await post('/api/social/queue', { assetId: vid.id, caption: 'agendada', platforms: [301], scheduledAt: when }); assert.equal(q.body.task.state, 'agendado'); assert.match(q.body.note, /Agendado na fila LOCAL/); const tid2 = q.body.task.id;
let list = (await j('/api/social/queue')).body; assert.equal(list.tasks.length, 2); assert.equal(list.counts.rascunho, 1); assert.equal(list.counts.agendado, 1); assert.equal(list.total, 2);
// tentar publicar sem conta: 409 + falhou (nunca publicando/publicado)
let at = await post(`/api/social/queue/${tid}/attempt`); assert.equal(at.status, 409); assert.equal(at.body.blocked, true); assert.equal(at.body.task.state, 'falhou'); assert.match(at.body.error, /nenhuma conta vinculada/); assert.match(at.body.task.reason, /falta aplicativo registrado/);
assert.equal((await j('/api/social/queue')).body.counts.publicado, 0, 'nada foi publicado');
assert.equal((await j('/api/social/queue')).body.counts.publicando, 0, 'nada entrou em publicando');
// repetir a tentativa continua bloqueando (estado falhou → falhou é permitido, e nunca publicado)
at = await post(`/api/social/queue/${tid}/attempt`); assert.equal(at.status, 409); assert.equal(at.body.task.state, 'falhou');
// voltar a rascunho e remover
assert.equal((await post(`/api/social/queue/${tid}/cancel`)).body.task.state, 'rascunho');
assert.equal((await del(`/api/social/queue/${tid}`)).status, 200); assert.equal((await del('/api/social/queue/nada')).status, 404);
assert.equal((await post('/api/social/queue/nada/attempt')).status, 404); assert.equal((await post('/api/social/queue/nada/cancel')).status, 404);
// persistência
const disk = JSON.parse(fs.readFileSync(path.join(tmp, 'db.json'), 'utf8')); assert.equal(disk.social.queue.length, 1); assert.equal(disk.social.queue[0].id, tid2);
// rascunho existente pode ir para a fila
const d1 = await post('/api/social/drafts', { assetId: vid.id, caption: 'do rascunho', platforms: [301] }); assert.equal(d1.status, 200);
const q3 = await post('/api/social/queue', { draftId: d1.body.draft.id }); assert.equal(q3.status, 200); assert.equal(q3.body.task.caption, 'do rascunho'); assert.equal(q3.body.task.state, 'rascunho');
assert.deepEqual(outbound, [], 'nenhuma saída para fora do servidor local (sem OAuth, sem publicação)');

// ---------- 4. tela: fila e adaptadores na página do Publicador
const browser = await launchChromium(); const errors = [];
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1200 } })).newPage(); page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + '/#/schedule'); await page.waitForSelector('#pubdrafts'); await page.click('#pubdrafts summary'); await page.waitForTimeout(400);
  await page.click('#pubqueue summary'); await page.waitForTimeout(200);
  const txt = await page.locator('#pubqueue').innerText();
  assert.match(txt, /Fila de publicação/); assert.match(txt, /TikTok/); assert.match(txt, /nao_conectado/); assert.match(txt, /video\.publish/); assert.match(txt, /Instagram/); assert.match(txt, /YouTube/);
  assert.match(txt, /nunca em "publicado"/);
  assert.ok(await page.locator('[data-try]').count() >= 1);
  await page.locator('[data-try]').first().click(); await page.waitForTimeout(700);
  assert.match(await page.locator('#toast').innerText(), /nenhuma conta vinculada[\s\S]*nada foi publicado/);
  await page.waitForTimeout(300);
  assert.match(await page.locator('#pubqueue').innerText(), /Falhou/);
  assert.deepEqual(errors, []);
  console.log('publish_queue: OK');
} finally { await browser.close(); server.close(); }
