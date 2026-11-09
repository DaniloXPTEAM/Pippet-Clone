// Adaptadores de provedores (OpenAI Vídeos, Replicate, fala OpenAI) e gerenciador de tarefas, contra servidores de mentira com o MESMO formato das APIs.
// Isto NÃO prova funcionamento contra os serviços reais (sem chave, sem gasto): prova formato de requisição, polling, estados, bloqueios e persistência.
import assert from 'node:assert/strict';
import http from 'node:http';
import { ADAPTERS, adapterFor, resolveProviders, isConfigured, publicProviders, validateConfig } from '../src/providers.mjs';
import { JobManager } from '../app/lib/jobs.mjs';

const MP4 = Buffer.from('FAKE-MP4-BYTES'); const seen = []; let polls = {}; let failNext = false;
const mock = http.createServer((req, res) => {
  const chunks = []; req.on('data', (d) => chunks.push(d)); req.on('end', () => {
    const body = Buffer.concat(chunks); const url = new URL(req.url, 'http://x'); seen.push({ m: req.method, p: url.pathname, auth: req.headers.authorization, ct: req.headers['content-type'] || '', body });
    const json = (o, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.method === 'POST' && url.pathname === '/v1/videos') { if (failNext) { failNext = false; return json({ error: { message: 'cota excedida' } }, 429); } return json({ id: `video_${seen.length}`, status: 'queued', progress: 0, seconds: '8', size: '720x1280' }); }
    let m = /^\/v1\/videos\/([\w-]+)$/.exec(url.pathname); if (m && req.method === 'GET') { polls[m[1]] = (polls[m[1]] || 0) + 1; return json(polls[m[1]] < 2 ? { id: m[1], status: 'in_progress', progress: 40 } : { id: m[1], status: m[1].endsWith('FAIL') ? 'failed' : 'completed', progress: 100, error: m[1].endsWith('FAIL') ? { message: 'moderação' } : null }); }
    if ((m = /^\/v1\/videos\/([\w-]+)\/content$/.exec(url.pathname))) { res.writeHead(200, { 'content-type': 'video/mp4' }); return res.end(MP4); }
    if (req.method === 'POST' && url.pathname === '/r/models/acme/vid/predictions') return json({ id: 'pred1', status: 'starting' });
    if (req.method === 'GET' && url.pathname === '/r/predictions/pred1') { polls.pred1 = (polls.pred1 || 0) + 1; return json(polls.pred1 < 2 ? { id: 'pred1', status: 'processing' } : { id: 'pred1', status: 'succeeded', output: ['http://127.0.0.1:5221/out/a.mp4'] }); }
    if (url.pathname === '/out/a.mp4') { res.writeHead(200); return res.end(MP4); }
    if (req.method === 'POST' && url.pathname === '/r/predictions/pred1/cancel') return json({ id: 'pred1', status: 'canceled' });
    if (req.method === 'POST' && url.pathname === '/v1/audio/speech') { res.writeHead(200, { 'content-type': 'audio/mpeg' }); return res.end(Buffer.from('ID3-FAKE')); }
    json({ error: { message: 'rota inesperada ' + url.pathname } }, 404);
  });
});
await new Promise((r) => mock.listen(5221, '127.0.0.1', r)); const V = 'http://127.0.0.1:5221/v1';
const f = globalThis.fetch;

// registro/validação
assert.deepEqual(Object.keys(ADAPTERS), ['video', 'audio', 'image', 'talkingphoto']); assert.ok(adapterFor('video', 'openai-videos') && !adapterFor('video', 'nada'));
assert.equal(validateConfig('video', { adapter: 'x' }), 'adaptador inválido para video'); assert.match(validateConfig('video', { adapter: 'openai-videos', baseUrl: 'ftp://x', model: 'm' }), /baseUrl/); assert.match(validateConfig('video', { adapter: 'openai-videos', baseUrl: V }), /modelo/); assert.equal(validateConfig('video', { adapter: 'replicate', baseUrl: V, model: 'm' }), null); assert.equal(validateConfig('audio', { adapter: 'sapi-local' }), null);
const st = { providers: { video: { adapter: 'openai-videos', baseUrl: V, model: 'sora-teste', apiKey: 'SEGREDO' } }, imageProvider: { baseUrl: V, model: 'img' } };
assert.equal(resolveProviders(st).image.adapter, 'openai-images', 'migra imageProvider'); assert.ok(isConfigured(st.providers.video, 'video')); assert.ok(!isConfigured({ adapter: 'openai-videos' }, 'video')); assert.ok(isConfigured({ adapter: 'sapi-local' }, 'audio'));
assert.ok(!JSON.stringify(publicProviders(st)).includes('SEGREDO')); assert.equal(publicProviders(st).video.hasKey, true);

// adaptador OpenAI Vídeos
const cfg = st.providers.video; const A = ADAPTERS.video['openai-videos'];
let s1 = await A.submit(cfg, { prompt: 'uma maçã', seconds: 7, ratio: '9:16', reference: { bytes: Buffer.from('PNG'), mime: 'image/png' }, fetchImpl: f }); const post1 = seen.at(-1); assert.equal(post1.p, '/v1/videos'); assert.equal(post1.auth, 'Bearer SEGREDO'); assert.match(post1.ct, /multipart\/form-data/);
const txt = post1.body.toString('latin1'); assert.match(txt, /name="model"\r\n\r\nsora-teste/); assert.match(txt, /name="seconds"\r\n\r\n8/); assert.match(txt, /name="size"\r\n\r\n720x1280/); assert.match(txt, /name="input_reference"; filename="ref.png"/); assert.equal(s1.seconds, 8);
await assert.rejects(A.submit(cfg, { prompt: 'x', seconds: 4, ratio: '21:9', fetchImpl: f }), /proporção 21:9 não suportada/); failNext = true; await assert.rejects(A.submit(cfg, { prompt: 'x', seconds: 4, ratio: '9:16', fetchImpl: f }), /HTTP 429.*cota excedida/);
const jid = s1.jobId; assert.deepEqual(await A.poll(cfg, { jobId: jid, fetchImpl: f }), { state: 'running', progress: 40, error: null }); assert.equal((await A.poll(cfg, { jobId: jid, fetchImpl: f })).state, 'succeeded'); const dl = await A.download(cfg, { jobId: jid, fetchImpl: f }); assert.ok(dl.bytes.equals(MP4)); assert.equal(dl.ext, 'mp4');
assert.deepEqual(await A.poll(cfg, { jobId: 'xFAIL', fetchImpl: f }), { state: 'running', progress: 40, error: null }); assert.deepEqual(await A.poll(cfg, { jobId: 'xFAIL', fetchImpl: f }), { state: 'failed', progress: 100, error: 'moderação' });
// Replicate (modelo owner/name, mapa de entradas, saída por URL, cancelamento)
const R = ADAPTERS.video.replicate; const rc = { baseUrl: 'http://127.0.0.1:5221/r', model: 'acme/vid', apiKey: 'K', inputMap: { seconds: 'length' }, extraInput: { fps: 24 } };
const rs = await R.submit(rc, { prompt: 'gato', seconds: 5, ratio: '16:9', reference: { bytes: Buffer.from('PNG'), mime: 'image/png' }, fetchImpl: f }); const rp = JSON.parse(seen.at(-1).body.toString()); assert.deepEqual(Object.keys(rp.input).sort(), ['aspect_ratio', 'fps', 'image', 'length', 'prompt']); assert.equal(rp.input.length, 5); assert.match(rp.input.image, /^data:image\/png;base64,/); assert.equal(rs.jobId, 'pred1');
assert.equal((await R.poll(rc, { jobId: 'pred1', fetchImpl: f })).state, 'running'); const rd = await R.poll(rc, { jobId: 'pred1', fetchImpl: f }); assert.equal(rd.state, 'succeeded'); assert.ok((await R.download(rc, { result: rd.result, fetchImpl: f })).bytes.equals(MP4)); await R.cancel(rc, { jobId: 'pred1', fetchImpl: f }); assert.equal(seen.at(-1).p, '/r/predictions/pred1/cancel');
// fala OpenAI-compatível
const sp = await ADAPTERS.audio['openai-speech'].synth({ baseUrl: V, model: 'tts-teste', apiKey: 'K', voice: 'nova' }, { text: 'Olá', fetchImpl: f }); assert.equal(sp.ext, 'mp3'); assert.deepEqual(JSON.parse(seen.at(-1).body.toString()), { model: 'tts-teste', input: 'Olá', voice: 'nova', response_format: 'mp3' });

// JobManager: bloqueios, autorização de gasto, sequência com referência, cancelar, tentar de novo, persistência
const db = { settings: {}, jobs: [], assets: [] }; let saves = 0; let idn = 0; const done = []; const assets = new Map();
const jm = new JobManager({ db: () => db, save: () => saves++, newId: () => `j${++idn}`, media: { lastFrame: true }, readAsset: (id) => (assets.has(id) ? { bytes: assets.get(id), mime: 'video/mp4', name: id } : null), lastFrameOf: (assetId) => Buffer.from('LASTFRAME:' + assetId), saveAsset: (name, bytes) => { const a = { id: `a${assets.size + 1}`, name }; assets.set(a.id, bytes); return a; }, onDone: (j) => done.push(j.id + ':' + j.state), fetchImpl: f, pollMs: 0 });
const j1 = jm.create({ title: 'seg1', prompt: 'cena 1', params: { seconds: 8, ratio: '9:16' } }); const j2 = jm.create({ title: 'seg2', prompt: 'cena 2', params: { seconds: 8, ratio: '9:16' }, after: j1.id });
await jm.tick(); assert.equal(j1.state, 'blocked'); assert.match(j1.error, /sem provedor de video configurado/);
db.settings.providers = { video: { adapter: 'openai-videos', baseUrl: V, model: 'sora-teste', apiKey: 'K' } }; await jm.tick(); assert.equal(j1.state, 'blocked'); assert.match(j1.error, /autorização de gasto/); assert.equal(seen.filter((x) => x.p === '/v1/videos' && x.m === 'POST').length, 2, 'nenhuma chamada nova sem allowSpend');
db.settings.providers.video.allowSpend = true; polls = {}; await jm.tick(); assert.equal(j1.state, 'running'); assert.ok(j1.providerJobId); assert.equal(j2.state, 'queued', 'j2 espera j1'); assert.equal(j1.usedReference, false);
await jm.tick(); assert.equal(j1.state, 'running'); await jm.tick(); assert.equal(j1.state, 'succeeded'); assert.equal(j1.assetId, 'a1'); assert.ok(assets.get('a1').equals(MP4)); assert.deepEqual(done, [`${j1.id}:succeeded`]);
await jm.tick(); assert.equal(j2.state, 'running'); assert.equal(j2.usedReference, true, 'sequência usa o último quadro como referência'); assert.match(seen.filter((x) => x.p === '/v1/videos' && x.m === 'POST').at(-1).body.toString('latin1'), /input_reference/);
await jm.cancel(j2.id); assert.equal(j2.state, 'canceled'); assert.ok(done.includes(`${j2.id}:canceled`)); jm.retry(j2.id); assert.equal(j2.state, 'queued'); assert.equal(jm.retry('nao-existe'), undefined); await jm.cancel(j2.id);
// falha do provedor no envio vira failed com o motivo e dispara onDone; dependente de falha também falha
failNext = true; const j3 = jm.create({ title: 'seg3', prompt: 'c3', params: { seconds: 4, ratio: '9:16' } }); const j4 = jm.create({ title: 'seg4', prompt: 'c4', params: {}, after: j3.id }); await jm.tick(); assert.equal(j3.state, 'failed'); assert.match(j3.error, /cota excedida/); await jm.tick(); assert.equal(j4.state, 'failed'); assert.match(j4.error, /anterior \(failed\)/);
assert.ok(saves > 3 && JSON.parse(JSON.stringify(db.jobs)).length === 4, 'estado serializável/persistido');
console.log('OK providers: OpenAI Vídeos, Replicate, fala, bloqueios (sem provedor/sem autorização de gasto), sequência com referência, cancelar/retry, falhas'); mock.closeAllConnections?.(); mock.close(); setTimeout(() => process.exit(0), 150);
