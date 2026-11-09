// Provedor de FOTO FALANTE (lip-sync por IA): contrato comum, orçamento, bloqueio de gasto NO SERVIDOR, consentimento por tarefa, ciclo de vida, cancelamento honesto,
// persistência/recuperação e integração (Canvas/Ativos). O "provedor" é um SERVIDOR DE MENTIRA em loopback com o formato da API de predições (Replicate):
// isto NÃO é geração real de lip-sync e NÃO prova funcionamento contra nenhum serviço real. Qualquer chamada a host que não seja loopback FALHA o teste.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const realFetch = globalThis.fetch; const external = [];
globalThis.fetch = async (u, o) => { const h = new URL(typeof u === 'string' ? u : u.url).hostname; if (h !== '127.0.0.1') { external.push(String(u)); throw new Error('chamada externa bloqueada no teste: ' + u); } return realFetch(u, o); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-tpp-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_JOB_POLL_MS = '0'; process.env.PIPPIT_JOB_TICK_MS = '60000';
const { ADAPTERS, adapterFor, publicProviders, validateConfig, KINDS } = await import('../src/providers.mjs');
const { JobManager } = await import('../app/lib/jobs.mjs'); const TPH = await import('../app/lib/talkingphoto.mjs');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// ---------- provedor de mentira (loopback) ----------
let MP4 = Buffer.from('FAKE-MP4-NAO-E-LIPSYNC'); const seen = []; const st = { polls: {}, submitMode: 'ok', cancelMode: 'ok', nextId: 0 };
const mock = http.createServer((req, res) => {
  const chunks = []; req.on('data', (d) => chunks.push(d)); req.on('end', () => {
    const body = Buffer.concat(chunks); const url = new URL(req.url, 'http://x'); seen.push({ m: req.method, p: url.pathname, auth: req.headers.authorization, body }); const json = (o, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.method === 'POST' && url.pathname === '/r/models/acme/lipsync/predictions') { if (st.submitMode === 'http429') return json({ detail: 'cota excedida' }, 429); if (st.submitMode === 'drop') return req.socket.destroy(); return json({ id: `lp${++st.nextId}`, status: 'starting' }); }
    let m = /^\/r\/predictions\/(\w+)$/.exec(url.pathname); if (m && req.method === 'GET') { st.polls[m[1]] = (st.polls[m[1]] || 0) + 1; if (st.failIds?.has(m[1])) return json({ id: m[1], status: 'failed', error: 'moderação' }); return json(st.polls[m[1]] < 2 ? { id: m[1], status: 'processing' } : { id: m[1], status: 'succeeded', output: `http://127.0.0.1:5252/out/${m[1]}.mp4` }); }
    if (/^\/out\/\w+\.mp4$/.test(url.pathname)) { res.writeHead(200, { 'content-type': 'video/mp4' }); return res.end(MP4); }
    if ((m = /^\/r\/predictions\/(\w+)\/cancel$/.exec(url.pathname)) && req.method === 'POST') return st.cancelMode === 'ok' ? json({ id: m[1], status: 'canceled' }) : json({ detail: 'não foi possível' }, 500);
    json({ error: 'rota inesperada ' + url.pathname }, 404);
  });
});
await new Promise((r) => mock.listen(5252, '127.0.0.1', r)); const posts = () => seen.filter((x) => x.m === 'POST' && /predictions$/.test(x.p)).length;

// ---------- registro, validação e contrato comum ----------
assert.ok(KINDS.includes('talkingphoto')); const A = adapterFor('talkingphoto', 'replicate-lipsync'); assert.ok(A && A.requiresTaskConsent === true);
const base = { adapter: 'replicate-lipsync', baseUrl: 'http://127.0.0.1:5252/r', model: 'acme/lipsync', apiKey: 'SEGREDO', allowSpend: true };
assert.equal(validateConfig('talkingphoto', base), null); assert.match(validateConfig('talkingphoto', { ...base, costPerSecond: 0.05 }), /moeda/); assert.match(validateConfig('talkingphoto', { ...base, costPerSecond: -1, currency: 'USD' }), /inválido/); assert.match(validateConfig('talkingphoto', { ...base, maxAudioSeconds: 999 }), /1 e 300/); assert.match(validateConfig('talkingphoto', { ...base, paramMap: [] }), /paramMap/);
assert.ok(!JSON.stringify(publicProviders({ providers: { talkingphoto: { ...base, costPerSecond: 0.05, currency: 'USD' } } })).includes('SEGREDO')); assert.equal(publicProviders({ providers: { talkingphoto: { ...base, costPerSecond: 0.05, currency: 'USD' } } }).talkingphoto.costPerSecond, 0.05);
// o que o adaptador REALMENTE aceita: gesto/texto/voz só com mapeamento; params só com paramMap
assert.deepEqual(A.describe(base, { image: true, audio: true, gesture: 'g', text: 't', params: { resolution: '512' } }), { accepted: ['image', 'audio'], ignored: ['text', 'gesture', 'param:resolution'] });
const mapped = { ...base, inputMap: { gesture: 'prompt', text: 'script' }, paramMap: { resolution: 'size' }, extraInput: { enhance: true } };
assert.deepEqual(A.describe(mapped, { image: true, audio: true, gesture: 'g', text: 't', params: { resolution: '512' } }), { accepted: ['image', 'audio', 'text', 'gesture', 'param:resolution'], ignored: [] });
assert.deepEqual(A.estimate(base, { seconds: 10 }), { known: false, amount: null, currency: null, basis: 'o usuário não informou custo por segundo e moeda deste modelo' }); const est = A.estimate({ ...base, costPerSecond: 0.05, currency: 'usd' }, { seconds: 12.34 }); assert.equal(est.known, true); assert.equal(est.currency, 'USD'); assert.equal(est.amount, 0.617); assert.deepEqual(A.limits(base), { maxAudioSeconds: 60 });
const IMG = Buffer.from('PNG-FAKE-IMAGE'); const AUD = Buffer.from('MP3-FAKE-AUDIO');
const r1 = await A.submit(mapped, { image: { bytes: IMG, mime: 'image/png', name: 'f.png' }, audio: { bytes: AUD, mime: 'audio/mpeg', name: 'a.mp3' }, text: 'olá', voice: 'v', gesture: 'acene', params: { resolution: '512', seed: 9 }, fetchImpl: globalThis.fetch });
const sub = JSON.parse(seen.at(-1).body.toString()); assert.equal(seen.at(-1).auth, 'Bearer SEGREDO'); assert.equal(sub.input.image, `data:image/png;base64,${IMG.toString('base64')}`); assert.equal(sub.input.audio, `data:audio/mpeg;base64,${AUD.toString('base64')}`); assert.equal(sub.input.prompt, 'acene'); assert.equal(sub.input.script, 'olá'); assert.equal(sub.input.size, '512'); assert.equal(sub.input.enhance, true); assert.equal(sub.input.seed, undefined, 'param sem mapeamento NÃO é enviado'); assert.equal(sub.input.voice, undefined, 'voz sem mapeamento NÃO é enviada');
assert.deepEqual(r1.ignored, ['voice', 'param:seed']); assert.equal(r1.jobId, 'lp1');
await assert.rejects(A.submit(base, { image: { bytes: IMG }, audio: null, fetchImpl: globalThis.fetch }), /áudio de entrada ausente/);
st.submitMode = 'http429'; await assert.rejects(A.submit(base, { image: { bytes: IMG }, audio: { bytes: AUD }, fetchImpl: globalThis.fetch }), (e) => e.http === 429 && /cota excedida/.test(e.message)); st.submitMode = 'drop'; await assert.rejects(A.submit(base, { image: { bytes: IMG }, audio: { bytes: AUD }, fetchImpl: globalThis.fetch }), (e) => e.network === true); st.submitMode = 'ok';

// ---------- orçamento ----------
const mkInputs = (extra = {}, secs = 8) => ({ imageAssetId: 'img1', audioAssetId: 'aud1', imageSha: sha(IMG), imageSize: IMG.length, audioSha: sha(AUD), audioSize: AUD.length, width: 400, height: 400, audioSeconds: secs, ...extra });
const info = (i) => ({ image: { sha: i.imageSha, size: i.imageSize, width: i.width, height: i.height }, audio: { sha: i.audioSha, size: i.audioSize }, audioSeconds: i.audioSeconds });
const settingsOf = (cfg) => ({ providers: { talkingphoto: cfg } });
let qt = TPH.buildQuote({}, mkInputs(), info(mkInputs())); assert.equal(qt.ok, false); assert.match(qt.reason, /sem provedor/);
qt = TPH.buildQuote(settingsOf(base), mkInputs({ gesture: 'acene' }), info(mkInputs({ gesture: 'acene' }))); assert.equal(qt.ok, true); assert.equal(qt.cost.known, false); assert.equal(qt.needsUnknownCostAck, true); assert.ok(qt.warnings.some((w) => /DESCONHECIDO/.test(w))); assert.ok(qt.warnings.some((w) => /NÃO recebe: gesture/.test(w))); assert.ok(qt.warnings.some((w) => /não é verificada localmente/.test(w))); assert.equal(qt.provider.model, 'acme/lipsync'); assert.equal(qt.provider.host, '127.0.0.1:5252'); assert.equal(qt.seconds, 8);
const known = { ...base, costPerSecond: 0.05, currency: 'USD' }; const q2 = TPH.buildQuote(settingsOf(known), mkInputs(), info(mkInputs())); assert.equal(q2.cost.amount, 0.4); assert.equal(q2.needsUnknownCostAck, false); assert.notEqual(q2.digest, qt.digest);
assert.notEqual(TPH.buildQuote(settingsOf({ ...known, model: 'acme/outro' }), mkInputs(), info(mkInputs())).digest, q2.digest, 'trocar o modelo muda o orçamento'); assert.equal(TPH.buildQuote(settingsOf({ ...known, maxCostPerTask: 0.1 }), mkInputs(), info(mkInputs())).overLimit, true);
assert.match(TPH.buildQuote(settingsOf(base), mkInputs({}, 90), info(mkInputs({}, 90))).reason, /excede o limite/); assert.match(TPH.buildQuote(settingsOf(base), mkInputs({ width: 200 }), info(mkInputs({ width: 200 }))).reason, /256/);

// ---------- gerenciador: bloqueio de gasto no servidor, consentimento, ciclo de vida ----------
const mkEnv = (cfg, over = {}) => {
  const db = over.db || { settings: settingsOf(cfg), jobs: [] }; const assets = over.assets || new Map([['img1', { bytes: IMG, mime: 'image/png', name: 'f.png' }], ['aud1', { bytes: AUD, mime: 'audio/mpeg', name: 'a.mp3' }]]); const saved = []; const done = []; let n = over.n || 0;
  const deps = { db: () => db, save() {}, newId: () => `j${++n}`, readAsset: (id) => assets.get(id) || null, saveAsset: (name, bytes, kind) => { const id = `out${saved.length + 1}`; saved.push({ id, name, kind, bytes }); return { id }; }, onDone: (j) => done.push(`${j.id}:${j.state}`), pollMs: 0, fetchImpl: globalThis.fetch,
    consentProblem: (job, c) => TPH.consentProblem(job, TPH.buildQuote(db.settings, job.inputs, info(job.inputs)), c), ...over.deps };
  return { db, assets, saved, done, jm: new JobManager(deps), deps };
};
const mkJob = (jm, inputs = mkInputs()) => jm.create({ kind: 'talkingphoto', state: 'blocked', title: 'foto-teste', inputs, authorization: null, params: { seconds: inputs.audioSeconds } });
const auth = (job, cfg, over = {}) => { const q = TPH.buildQuote(settingsOf(cfg), job.inputs, info(job.inputs)); job.authorization = { confirm: true, quoteDigest: q.digest, acknowledgeUnknownCost: false, ...over }; return q; };

{ // nada é enviado sem consentimento, mesmo com provedor configurado e allowSpend
  const E = mkEnv(known); const j = mkJob(E.jm); const p0 = posts(); await E.jm.tick(); await E.jm.tick(); assert.equal(j.state, 'blocked'); assert.match(j.error, /consentimento/); assert.equal(posts(), p0, 'sem consentimento: ZERO envios');
  auth(j, known); E.db.settings = settingsOf({ ...known, allowSpend: false }); await E.jm.tick(); assert.equal(j.state, 'blocked'); assert.match(j.error, /autorização de gasto/); assert.equal(posts(), p0, 'consentimento sem allowSpend: ZERO envios');
  E.db.settings = settingsOf({ ...known, model: 'acme/outro' }); await E.jm.tick(); assert.match(j.error, /não vale mais/); assert.equal(posts(), p0);
  E.db.settings = settingsOf(known); j.authorization.quoteDigest = 'deadbeef'; await E.jm.tick(); assert.match(j.error, /não vale mais/); assert.equal(posts(), p0, 'digest inventado não autoriza');
  j.authorization = { confirm: 'sim' }; await E.jm.tick(); assert.match(j.error, /consentimento/); assert.equal(posts(), p0, 'consentimento tem de ser booleano true');
}
{ // custo desconhecido exige confirmação explícita; limite por tarefa bloqueia
  const E = mkEnv(base); const j = mkJob(E.jm); const p0 = posts(); auth(j, base); await E.jm.tick(); assert.equal(j.state, 'blocked'); assert.match(j.error, /custo desconhecido/); assert.equal(posts(), p0);
  auth(j, base, { acknowledgeUnknownCost: true }); await E.jm.tick(); assert.equal(j.state, 'running'); assert.equal(posts(), p0 + 1);
  const lim = { ...known, maxCostPerTask: 0.1 }; const E2 = mkEnv(lim); const j2 = mkJob(E2.jm); auth(j2, lim); await E2.jm.tick(); assert.equal(j2.state, 'blocked'); assert.match(j2.error, /acima do limite/); assert.equal(posts(), p0 + 1);
}
{ // fail-closed: sem função de consentimento ou com erro, bloqueia
  const E = mkEnv(known, { deps: { consentProblem: undefined } }); const j = mkJob(E.jm); j.authorization = { confirm: true, quoteDigest: 'x' }; const p0 = posts(); await E.jm.tick(); assert.equal(j.state, 'blocked'); assert.match(j.error, /indisponível/);
  const E2 = mkEnv(known, { deps: { consentProblem: () => { throw new Error('boom'); } } }); const j2 = mkJob(E2.jm); await E2.jm.tick(); assert.equal(j2.state, 'blocked'); assert.match(j2.error, /bloqueado.*boom|boom/); assert.equal(posts(), p0);
}
{ // ciclo de vida completo + persistência do resultado
  const E = mkEnv(known); const j = mkJob(E.jm); auth(j, known); const p0 = posts(); await E.jm.tick(); assert.equal(j.state, 'running'); assert.equal(posts(), p0 + 1); assert.deepEqual(j.sent, { accepted: ['image', 'audio'], ignored: [] }); assert.equal(j.sendIntent, null);
  await E.jm.tick(); assert.equal(j.state, 'running'); await E.jm.tick(); assert.equal(j.state, 'succeeded'); assert.equal(j.progress, 100); assert.equal(E.saved.length, 1); assert.equal(E.saved[0].kind, 'video'); assert.ok(E.saved[0].bytes.equals(MP4)); assert.equal(j.assetId, E.saved[0].id); assert.deepEqual(E.done, [`${j.id}:succeeded`]);
  // persistência/recuperação: um NOVO gerenciador sobre o mesmo db continua a consulta SEM reenviar
  const E2 = mkEnv(known); const j2 = mkJob(E2.jm); auth(j2, known); await E2.jm.tick(); assert.equal(j2.state, 'running'); const p1 = posts(); const copy = JSON.parse(JSON.stringify(E2.db)); const E3 = mkEnv(known, { db: copy }); await E3.jm.tick(); await E3.jm.tick(); const j3 = E3.jm.get(j2.id); assert.equal(j3.state, 'succeeded'); assert.equal(posts(), p1, 'recuperação NÃO reenvia'); assert.equal(E3.saved.length, 1);
  // queda no meio do envio: intenção gravada e sem id => NÃO reenvia sozinho
  const E4 = mkEnv(known); const j4 = mkJob(E4.jm); auth(j4, known); j4.state = 'queued'; j4.sendIntent = new Date().toISOString(); const p2 = posts(); await E4.jm.tick(); assert.equal(j4.state, 'failed'); assert.equal(j4.ambiguousSend, true); assert.match(j4.error, /pode ter sido recebida/); assert.equal(posts(), p2, 'ambíguo: ZERO reenvios'); assert.deepEqual(E4.done, [`${j4.id}:failed`]);
  // retry exige novo consentimento
  E4.jm.retry(j4.id); assert.equal(j4.authorization, null); assert.equal(j4.ambiguousSend, false); await E4.jm.tick(); assert.equal(j4.state, 'blocked'); assert.equal(posts(), p2);
}
{ // erros do provedor
  const E = mkEnv(known); const j = mkJob(E.jm); auth(j, known); st.submitMode = 'http429'; await E.jm.tick(); assert.equal(j.state, 'failed'); assert.match(j.error, /HTTP 429.*cota excedida/); assert.equal(j.ambiguousSend, undefined); assert.equal(j.sendIntent, null);
  const j2 = mkJob(E.jm); auth(j2, known); st.submitMode = 'drop'; await E.jm.tick(); assert.equal(j2.state, 'failed'); assert.equal(j2.ambiguousSend, true); assert.match(j2.error, /pode ter recebido.*cobrado/); st.submitMode = 'ok';
  const j3 = mkJob(E.jm); auth(j3, known); st.failIds = new Set([`lp${st.nextId + 1}`]); await E.jm.tick(); assert.equal(j3.state, 'running'); await E.jm.tick(); assert.equal(j3.state, 'failed'); assert.match(j3.error, /moderação/); assert.equal(E.saved.length, 0); st.failIds = null;
  const E5 = mkEnv(known); const j5 = mkJob(E5.jm); auth(j5, known); E5.assets.set('img1', { bytes: Buffer.from('OUTRA-IMAGEM'), mime: 'image/png', name: 'f.png' }); const p0 = posts(); await E5.jm.tick(); assert.equal(j5.state, 'blocked'); assert.match(j5.error, /entradas mudaram/); assert.equal(j5.authorization, null); assert.equal(posts(), p0, 'bytes diferentes dos autorizados: ZERO envios');
  const E6 = mkEnv(known); const j6 = mkJob(E6.jm); auth(j6, known); E6.assets.delete('aud1'); await E6.jm.tick(); assert.equal(j6.state, 'failed'); assert.match(j6.error, /não encontradas/);
}
{ // cancelamento HONESTO
  const E = mkEnv(known); const jb = mkJob(E.jm); await E.jm.cancel(jb.id); assert.equal(jb.state, 'canceled'); assert.equal(jb.remoteCancel, 'not_submitted');
  const j = mkJob(E.jm); auth(j, known); await E.jm.tick(); assert.equal(j.state, 'running'); const c0 = seen.filter((x) => /cancel$/.test(x.p)).length; await E.jm.cancel(j.id); assert.equal(j.remoteCancel, 'requested'); assert.equal(seen.filter((x) => /cancel$/.test(x.p)).length, c0 + 1);
  const j2 = mkJob(E.jm); auth(j2, known); await E.jm.tick(); st.cancelMode = 'fail'; await E.jm.cancel(j2.id); assert.equal(j2.state, 'canceled'); assert.equal(j2.remoteCancel, 'failed'); assert.match(j2.remoteCancelNote, /HTTP 500/); st.cancelMode = 'ok';
  ADAPTERS.talkingphoto['sem-cancelamento'] = { ...ADAPTERS.talkingphoto['replicate-lipsync'], cancel: undefined }; const nc = { ...known, adapter: 'sem-cancelamento' }; const E2 = mkEnv(nc); const j3 = mkJob(E2.jm); auth(j3, nc); await E2.jm.tick(); assert.equal(j3.state, 'running'); await E2.jm.cancel(j3.id); assert.equal(j3.remoteCancel, 'unsupported'); delete ADAPTERS.talkingphoto['sem-cancelamento'];
  const j4 = mkJob(E.jm); j4.state = 'queued'; j4.sendIntent = new Date().toISOString(); await E.jm.cancel(j4.id); assert.equal(j4.remoteCancel, 'unknown');
}
assert.deepEqual(external, [], 'NENHUMA chamada externa durante o gerenciador');

// ---------- integração: servidor real + Canvas + Ativos (provedor de mentira em loopback) ----------
const media = await import('../app/lib/media.mjs');
if (!media.available()) { console.log('ffmpeg indisponível: integração com servidor não testada'); mock.close(); console.log('talkingphoto_provider OK (sem integração)'); process.exit(0); }
const { server } = await import('../app/server.mjs'); const PORT = 5253; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const U = `http://127.0.0.1:${PORT}`;
const api = async (m, p, b) => { const r = await realFetch(U + p, { method: m, headers: { 'content-type': 'application/json' }, body: b === undefined ? undefined : JSON.stringify(b) }); return { status: r.status, body: await r.json() }; };
const ff = (args) => { const r = spawnSync(media.FFMPEG, ['-y', '-v', 'error', ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); };
const png = path.join(tmp, 'p.png'), mp3 = path.join(tmp, 'a.mp3'), long = path.join(tmp, 'l.mp3'); ff(['-f', 'lavfi', '-i', 'color=c=blue:s=400x400', '-frames:v', '1', png]); ff(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', mp3]); ff(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=70', long]);
const vid = path.join(tmp, 'o.mp4'); ff(['-f', 'lavfi', '-i', 'color=c=red:s=320x240:d=1', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=1', '-shortest', '-pix_fmt', 'yuv420p', vid]); MP4 = fs.readFileSync(vid); // vídeo REAL (cor sólida) só para exercitar o editor; NÃO é lip-sync
const up = async (u, p, name) => (await realFetch(U + u, { method: 'POST', headers: { 'x-file-name': encodeURIComponent(name), 'content-type': 'application/octet-stream' }, body: fs.readFileSync(p) })).json();
const photo = (await up('/api/talking-photo/photo', png, 'p.png')).asset; const audio = (await up('/api/talking-photo/audio', mp3, 'a.mp3')).asset; assert.ok(photo?.id && audio?.id);
const posts0 = posts(); const bal0 = (await api('GET', '/api/state')).body.balance;
// sem provedor: orçamento e geração são recusados e NADA é enviado
let r = await api('POST', '/api/talking-photo/quote', { assetId: photo.id, audioAssetId: audio.id }); assert.equal(r.status, 409); assert.match(r.body.error, /sem provedor/); r = await api('POST', '/api/talking-photo/generate', { assetId: photo.id, audioAssetId: audio.id }); assert.equal(r.status, 409);
// configura o provedor SEM allowSpend e com custo conhecido
r = await api('POST', '/api/providers/talkingphoto', { ...base, allowSpend: false, costPerSecond: 0.05, currency: 'USD', inputMap: { gesture: 'prompt' } }); assert.equal(r.status, 200);
assert.equal((await api('POST', '/api/providers/talkingphoto', { ...base, costPerSecond: 0.05, currency: '' })).status, 400, 'custo sem moeda é rejeitado');
r = await api('POST', '/api/talking-photo/quote', { assetId: photo.id, audioAssetId: audio.id, gesture: 'acene' }); assert.equal(r.status, 200); assert.equal(r.body.externalCalls, 0); assert.equal(r.body.quote.cost.amount, 0.15); assert.equal(r.body.quote.provider.model, 'acme/lipsync'); assert.deepEqual(r.body.quote.accepted, ['image', 'audio', 'gesture']); assert.ok(!JSON.stringify(r.body).includes('SEGREDO'));
const proj = (await api('POST', '/api/projects', { type: 'canvas', title: 'Projeto TP' })).body; const nodes0 = (await api('GET', `/api/projects/${proj.id}`)).body.canvas.nodes.length;
r = await api('POST', '/api/talking-photo/generate', { assetId: photo.id, audioAssetId: audio.id, gesture: 'acene', projectId: proj.id, title: 'Lip-sync teste' }); assert.equal(r.status, 202); const jobId = r.body.job.id; assert.equal(r.body.job.state, 'blocked'); assert.match(r.body.job.error, /consentimento/); assert.equal(r.body.job.authorized, false); assert.equal(posts(), posts0, 'gerar NÃO envia');
assert.equal((await api('GET', `/api/projects/${proj.id}`)).body.canvas.nodes.length, nodes0 + 1, 'nó de vídeo criado no Canvas');
const digest = r.body.quote.digest;
// validações do consentimento (servidor)
assert.equal((await api('POST', `/api/talking-photo/jobs/${jobId}/authorize`, { quoteDigest: digest })).status, 400, 'sem confirm'); assert.equal((await api('POST', `/api/talking-photo/jobs/${jobId}/authorize`, { confirm: 'true', quoteDigest: digest })).status, 400, 'confirm tem de ser true booleano');
assert.equal((await api('POST', `/api/talking-photo/jobs/${jobId}/authorize`, { confirm: true, quoteDigest: 'inventado' })).status, 409, 'digest errado');
r = await api('POST', `/api/talking-photo/jobs/${jobId}/authorize`, { confirm: true, quoteDigest: digest }); assert.equal(r.status, 200); assert.equal(r.body.state, 'blocked'); assert.match(r.body.error, /autorização de gasto/); assert.equal(posts(), posts0, 'consentimento SEM allowSpend: nada enviado');
// ativa allowSpend do provedor: a tarefa já autorizada é enviada na próxima verificação
await api('POST', '/api/providers/talkingphoto', { allowSpend: true }); await realFetch(U + '/api/jobs/tick', { method: 'POST' }); let jv = (await api('GET', '/api/jobs')).body.find((x) => x.id === jobId); assert.equal(jv.state, 'running'); assert.equal(posts(), posts0 + 1); assert.deepEqual(jv.sent, { accepted: ['image', 'audio', 'gesture'], ignored: [] });
const sentBody = JSON.parse(seen.filter((x) => /predictions$/.test(x.p)).at(-1).body.toString()); assert.equal(sentBody.input.prompt, 'acene'); assert.match(sentBody.input.image, /^data:image\/png;base64,/); assert.match(sentBody.input.audio, /^data:audio\/mpeg;base64,/);
for (let i = 0; i < 6 && jv.state === 'running'; i++) { await realFetch(U + '/api/jobs/tick', { method: 'POST' }); jv = (await api('GET', '/api/jobs')).body.find((x) => x.id === jobId); } assert.equal(jv.state, 'succeeded'); assert.ok(jv.assetId);
const pj = (await api('GET', `/api/projects/${proj.id}`)).body; const node = pj.canvas.nodes.at(-1); assert.equal(node.assetId, jv.assetId, 'nó do Canvas recebeu o vídeo'); assert.equal(node.hasMedia, true);
const ed = await api('POST', `/api/projects/${proj.id}/nodes/${node.id}/edit`, {}); assert.equal(ed.status, 200, JSON.stringify(ed.body)); const edp = (await api('GET', `/api/projects/${ed.body.editorId}`)).body; assert.equal(edp.timeline.clips[0].assetId, jv.assetId, 'o editor recebeu o vídeo do provedor'); assert.equal(edp.origin.nodeId, node.id);
const asset = (await api('GET', '/api/assets?kind=video')).body.find((a) => a.id === jv.assetId); assert.ok(asset); assert.equal(asset.kind, 'video'); assert.match(asset.name, /Lip-sync teste/);
const file = await realFetch(`${U}/files/${asset.stored}`); assert.equal(file.status, 200); assert.ok(Buffer.from(await file.arrayBuffer()).equals(MP4), 'resultado persistido');
assert.equal((await api('GET', '/api/state')).body.balance, bal0, 'nenhum crédito do Pippit debitado');
// custo desconhecido via servidor: exige confirmação explícita
await api('POST', '/api/providers/talkingphoto', { ...base, costPerSecond: '', currency: '' }); const g2 = (await api('POST', '/api/talking-photo/generate', { assetId: photo.id, audioAssetId: audio.id })).body; assert.equal(g2.quote.needsUnknownCostAck, true); const pp = posts();
assert.equal((await api('POST', `/api/talking-photo/jobs/${g2.job.id}/authorize`, { confirm: true, quoteDigest: g2.quote.digest })).status, 400); assert.equal(posts(), pp);
r = await api('POST', `/api/talking-photo/jobs/${g2.job.id}/authorize`, { confirm: true, quoteDigest: g2.quote.digest, acknowledgeUnknownCost: true }); assert.equal(r.status, 200); assert.equal(r.body.state, 'running'); assert.equal(posts(), pp + 1);
// cancelamento remoto e revogação
r = await api('POST', `/api/jobs/${g2.job.id}/cancel`); assert.equal(r.body.state, 'canceled'); assert.equal(r.body.remoteCancel, 'requested');
const g3 = (await api('POST', '/api/talking-photo/generate', { assetId: photo.id, audioAssetId: audio.id })).body; await api('POST', `/api/talking-photo/jobs/${g3.job.id}/authorize`, { confirm: true, quoteDigest: g3.quote.digest, acknowledgeUnknownCost: true }); const pq = posts();
// ao revogar uma tarefa já enviada o servidor recusa
assert.equal((await api('DELETE', `/api/talking-photo/jobs/${g3.job.id}/authorize`)).status, 409); await api('POST', `/api/jobs/${g3.job.id}/cancel`);
const g4 = (await api('POST', '/api/talking-photo/generate', { assetId: photo.id, audioAssetId: audio.id })).body; const pr = posts(); r = await api('DELETE', `/api/talking-photo/jobs/${g4.job.id}/authorize`); assert.equal(r.status, 200); assert.equal(r.body.state, 'blocked'); assert.equal(posts(), pr); r = await api('POST', `/api/jobs/${g4.job.id}/cancel`); assert.equal(r.body.remoteCancel, 'not_submitted');
// áudio acima do limite do provedor é recusado no orçamento
const longAsset = (await up('/api/talking-photo/audio', long, 'l.mp3')); assert.match(longAsset.error, /menos de 30 s/, 'a rota de áudio mantém o limite de 30 s da página original');
// compatibilidade: provedores e tarefas de vídeo continuam funcionando
assert.ok((await api('GET', '/api/providers')).body.providers.video && (await api('GET', '/api/providers')).body.providers.talkingphoto.configured);
assert.deepEqual(external, [], 'NENHUMA chamada externa em todo o teste');
server.closeAllConnections?.(); mock.closeAllConnections?.(); mock.close(); fs.rmSync(tmp, { recursive: true, force: true }); console.log('talkingphoto_provider OK'); setTimeout(() => process.exit(0), 200);
