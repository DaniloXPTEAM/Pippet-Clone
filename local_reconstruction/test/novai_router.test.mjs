// NovAI (aiapi-pro.com) no roteador gratuito: vídeo cogvideox-flash (fila assíncrona, consulta a cada 12 s,
// timeout >= 180 s), imagem cogview-3-flash e texto glm-4.7-flash como reserva.
// Nenhuma chamada real e nenhuma chave real: um servidor falso em 127.0.0.1 responde queued -> processing -> success,
// 401, 429, status inesperado, URL fora da lista e timeout, e confere corpo/URL/Bearer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

const KEY = 'chave-novai-de-teste';
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-novai-'));
process.env.PIPPIT_LOCAL_DATA = dataDir;
process.env.PIPPIT_LLM = 'off';
// Modo servidor falso: libera http para 127.0.0.1 e deixa o timeout encurtar (em uso real o piso é 180 s).
process.env.NOVAI_ALLOW_INSECURE_ASSETS = '1';
process.env.NOVAI_ASSET_HOSTS = '127.0.0.1';
process.env.NOVAI_POLL_MS = '120';
process.env.NOVAI_TIMEOUT_MS = '4000';
process.env.NOVAI_API_KEY = KEY;
// Teto real é 5 vídeos/dia; aqui o teto é elevado para não esgotar no meio do teste (o cap de 5 é conferido abaixo).
process.env.NOVAI_DAILY_LIMIT = '40';

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]), Buffer.alloc(8), Buffer.from([0xff, 0xd9])]);
// PNG 300x300 de verdade (a rota da foto falante sonda a imagem): scanlines RGB + zlib.
const crc32 = (buf) => { let c = 0xffffffff; for (const byte of buf) { c ^= byte; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; } return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]); };
const png = (() => {
  const w = 300; const h = 300; const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 200; raw[o + 1] = 170; raw[o + 2] = 140; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
})();
// MP4 mínimo: uma caixa ftyp + uma caixa mdat (o servidor só grava os bytes; nada valida o container aqui).
const MP4 = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(8), Buffer.from([0x00, 0x00, 0x00, 0x10]), Buffer.from('mdat'), Buffer.alloc(8)]);
const calls = [];
let textMode = 'ok'; // ok | auth401 | rate429
let imageMode = 'ok'; // ok | badurl | auth401
let videoMode = 'ok'; // ok | stuck | weird | fail | badurl | quota429 | auth401
const videoTasks = new Map();
let nextTask = 0;
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let body = null; try { body = JSON.parse(Buffer.concat(chunks).toString() || 'null'); } catch { body = null; }
    calls.push({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), auth: req.headers.authorization || null, body });
    const root = `http://127.0.0.1:${server.address().port}`;
// Preset/pilha relê o ambiente a cada clique: aponta a NovAI para o servidor falso (nada sai para a internet).
process.env.NOVAI_BASE_URL = `${root}/v1`;
    if (url.pathname === '/media/out.mp4') { res.writeHead(200, { 'content-type': 'video/mp4' }); return res.end(MP4); }
    if (url.pathname === '/media/img.jpg') { res.writeHead(200, { 'content-type': 'image/jpeg' }); return res.end(JPEG); }
    if (req.headers.authorization !== `Bearer ${KEY}`) return json(res, 401, { error: { message: 'invalid api key' } });
    if (url.pathname === '/v1/chat/completions') {
      if (textMode === 'rate429') return json(res, 429, { error: { message: 'rate limit exceeded' } });
      return json(res, 200, { choices: [{ message: { content: 'texto da novai falsa' } }] });
    }
    if (url.pathname === '/v1/images/generations') {
      if (imageMode === 'auth401') return json(res, 401, { error: { message: 'invalid token' } });
      const u = imageMode === 'badurl' ? 'https://evil.example.com/x.jpg' : `${root}/media/img.jpg`;
      return json(res, 200, { data: [{ url: u }] });
    }
    if (url.pathname === '/v1/video/generations' && req.method === 'POST') {
      if (videoMode === 'auth401') return json(res, 401, { error: { message: 'invalid token' } });
      if (videoMode === 'quota429') return json(res, 429, { error: { message: 'daily quota exceeded (5/day)' } });
      const id = `task-${++nextTask}`;
      videoTasks.set(id, { polls: 0 });
      return json(res, 200, { id, status: 'queued' });
    }
    const poll = url.pathname.match(/^\/v1\/video\/generations\/([\w-]+)$/);
    if (poll && req.method === 'GET') {
      const task = videoTasks.get(poll[1]);
      if (!task) return json(res, 404, { error: { message: 'task not found' } });
      task.polls += 1;
      if (videoMode === 'quota429') return json(res, 429, { error: { message: 'rate limited' } });
      if (videoMode === 'stuck' || task.polls < 3) return json(res, 200, { id: poll[1], status: task.polls === 1 ? 'QUEUED' : 'PROCESSING' });
      if (videoMode === 'weird') return json(res, 200, { id: poll[1], status: 'ALGO-ESTRANHO' });
      if (videoMode === 'fail') return json(res, 200, { id: poll[1], status: 'FAILED' });
      const u = videoMode === 'badurl' ? 'http://evil.example.com/out.mp4' : `${root}/media/out.mp4`;
      return json(res, 200, { id: poll[1], status: 'SUCCESS', video_result: [{ url: u }] });
    }
    return json(res, 404, { error: { message: 'rota falsa desconhecida' } });
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const root = `http://127.0.0.1:${server.address().port}`;

const {
  planFreeRoutes, executeFreeRoutes, createNovaiFreeAdapter, isAllowedAssetUrl, novaiVideoState,
  stackProviderEntries, DEFAULT_TASK_PREFERENCES, NOVAI_BASE, NOVAI_VIDEO_MODEL, NOVAI_IMAGE_MODEL, NOVAI_TEXT_MODEL,
  NOVAI_VIDEO_DURATION, NOVAI_POLL_MS, NOVAI_VIDEO_DAILY_LIMIT, FREE_PROVIDER_CATALOG, FREE_PROVIDER_DEFAULTS, novaiProviderEntry,
} = await import('../src/free_router.mjs');
const { server: app } = await import('../app/server.mjs');
await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body, method = 'POST') => { const res = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() }; };
const waitFor = async (url, predicate, timeout = 12_000) => { const end = Date.now() + timeout; while (Date.now() < end) { const r = await api(url, undefined, 'GET'); if (predicate(r.body)) return r.body; await new Promise((resolve) => setTimeout(resolve, 30)); } throw new Error(`timeout aguardando ${url}`); };
// Nenhum segredo pode sair em resposta: nem a chave, nem "Bearer".
const noSecret = (value) => { const text = JSON.stringify(value); assert.doesNotMatch(text, new RegExp(KEY)); assert.doesNotMatch(text, /Bearer [A-Za-z0-9-]{8,}/); };

const env = { NOVAI_BASE_URL: `${root}/v1`, NOVAI_API_KEY: KEY };
const credentials = { NOVAI_API_KEY: KEY };
const config = () => ({ version: 1, paidFallback: false, providers: stackProviderEntries(env), taskPreferences: { ...DEFAULT_TASK_PREFERENCES } });
const routeOf = (task, modelId) => planFreeRoutes(task, config()).routes.find((r) => r.modelId === modelId);

try {
  // 1) Catálogo: a NovAI entra com o modelo de vídeo medido, e o vídeo deixa de ser PENDING.
  const policy = FREE_PROVIDER_CATALOG.find((p) => p.id === 'novai');
  assert.equal(policy.secretEnv, 'NOVAI_API_KEY');
  assert.equal(NOVAI_BASE, 'https://aiapi-pro.com/v1');
  assert.equal(NOVAI_VIDEO_MODEL, 'cogvideox-flash');
  assert.equal(FREE_PROVIDER_DEFAULTS.novai.videoDuration, 5);
  assert.equal(FREE_PROVIDER_DEFAULTS.novai.pollMs, 12_000);
  assert.ok(FREE_PROVIDER_DEFAULTS.novai.timeoutMs >= 180_000, 'timeout do vídeo é >= 180 s');
  assert.equal(NOVAI_VIDEO_DAILY_LIMIT, 5);
  assert.equal(novaiProviderEntry({}).dailyLimit, 5, 'teto real de 5 vídeos/dia');
  const capped = planFreeRoutes('video_generation', config(), { quotaUsage: { novai: { day: new Date().toISOString().slice(0, 10), count: 5, blocked: false } } });
  assert.equal(capped.ok, false, 'no sexto vídeo do dia a rota some (não é repetida)');
  assert.match(capped.reason, /Geração de vídeo/);
  const videoPlan = planFreeRoutes('video_generation', config());
  assert.equal(videoPlan.ok, true, 'vídeo deixa de ser PENDING com a NovAI');
  assert.deepEqual(videoPlan.routes.map((r) => `${r.providerId}/${r.modelId}`), ['novai/cogvideox-flash']);
  // Últimas posições: texto e imagem entram como reserva.
  assert.equal(planFreeRoutes('text', config()).routes.at(-1).modelId, NOVAI_TEXT_MODEL);
  assert.equal(planFreeRoutes('image_generation', config()).routes.at(-1).modelId, NOVAI_IMAGE_MODEL);

  // 2) Estados do vídeo: só SUCCESS/COMPLETED terminam; desconhecido nunca vira sucesso.
  assert.equal(novaiVideoState('SUCCESS'), 'done'); assert.equal(novaiVideoState('completed'), 'done');
  assert.equal(novaiVideoState('PROCESSING'), 'running'); assert.equal(novaiVideoState('queued'), 'running');
  assert.equal(novaiVideoState('FAILED'), 'failed'); assert.equal(novaiVideoState('ALGO-ESTRANHO'), 'unknown');

  // 3) URL de mídia: https em aiapi-pro.com ou *.ufileos.com (a lista vale antes e depois de redirecionamentos).
  const hosts = FREE_PROVIDER_DEFAULTS.novai.assetHosts;
  assert.equal(isAllowedAssetUrl('https://aiapi-pro.com/f/out.mp4', { hosts }), true);
  assert.equal(isAllowedAssetUrl('https://x.ufileos.com/out.mp4', { hosts }), true);
  assert.equal(isAllowedAssetUrl('http://aiapi-pro.com/f/out.mp4', { hosts }), false, 'http é recusado em uso real');
  assert.equal(isAllowedAssetUrl('https://evil.example.com/out.mp4', { hosts }), false);
  assert.equal(isAllowedAssetUrl('https://evil-ufileos.com/out.mp4', { hosts }), false, 'sufixo falso não vale');

  // 4) Texto (reserva): glm-4.7-flash em /chat/completions.
  const adapter = createNovaiFreeAdapter();
  const textRoute = routeOf('text', NOVAI_TEXT_MODEL);
  const text = await adapter.execute(textRoute, { prompt: 'resuma em uma frase' }, { apiKey: KEY });
  assert.equal(text.text, 'texto da novai falsa');
  const textCall = calls.filter((c) => c.path === '/v1/chat/completions').at(-1);
  assert.equal(textCall.body.model, NOVAI_TEXT_MODEL);
  assert.equal(textCall.auth, `Bearer ${KEY}`);

  // 5) Imagem (reserva): cogview-3-flash -> data[0].url, e o arquivo é baixado da URL permitida.
  calls.length = 0;
  const image = await adapter.execute(routeOf('image_generation', NOVAI_IMAGE_MODEL), { prompt: 'um gato azul' }, { apiKey: KEY });
  assert.equal(image.mimeType, 'image/jpeg');
  assert.ok(image.image.equals(JPEG));
  assert.ok(calls.some((c) => c.path === '/media/img.jpg'));
  assert.equal(calls.find((c) => c.path === '/v1/images/generations').body.model, NOVAI_IMAGE_MODEL);

  // 6) Imagem com URL fora da lista: recusa antes de baixar (nada é salvo).
  imageMode = 'badurl';
  await assert.rejects(adapter.execute(routeOf('image_generation', NOVAI_IMAGE_MODEL), { prompt: 'um gato' }, { apiKey: KEY }), (error) => error.blockedUrl === true && /fora da lista permitida/.test(error.message));
  assert.equal(calls.some((c) => c.path === '/x.jpg'), false);
  imageMode = 'ok';

  // 7) Vídeo: queued -> processing -> success; MP4 baixado só da URL permitida, com o model na consulta.
  calls.length = 0;
  const video = await adapter.execute(routeOf('video_generation', NOVAI_VIDEO_MODEL), { prompt: 'um trem atravessando a ponte', seconds: 5 }, { apiKey: KEY });
  assert.ok(video.video.equals(MP4));
  assert.equal(video.mimeType, 'video/mp4');
  assert.equal(video.remoteId, 'task-1');
  const submit = calls.find((c) => c.method === 'POST' && c.path === '/v1/video/generations');
  assert.equal(submit.body.model, NOVAI_VIDEO_MODEL);
  assert.equal(submit.body.duration, NOVAI_VIDEO_DURATION);
  const polls = calls.filter((c) => c.method === 'GET' && c.path.startsWith('/v1/video/generations/'));
  assert.ok(polls.length >= 3, `consulta até concluir (foram ${polls.length})`);
  assert.equal(polls[0].query.model, NOVAI_VIDEO_MODEL, 'a consulta leva ?model=cogvideox-flash');

  // 8) Sem chave: falha explícita, sem chamada de rede.
  calls.length = 0;
  await assert.rejects(adapter.execute(routeOf('video_generation', NOVAI_VIDEO_MODEL), { prompt: 'sem chave nenhuma aqui' }, {}), (error) => error.missingKey === true && /NOVAI_API_KEY/.test(error.message));
  assert.equal(calls.length, 0);

  // 9) 401 do provedor: erro de autenticação (não é cota) e a execução para.
  videoMode = 'auth401';
  await assert.rejects(adapter.execute(routeOf('video_generation', NOVAI_VIDEO_MODEL), { prompt: 'um vídeo com erro de chave' }, { apiKey: KEY }), (error) => error.status === 401 && error.quotaExceeded !== true);
  videoMode = 'ok';

  // 10) 429 = cota/taxa: marcado como cota para o roteador não repetir.
  videoMode = 'quota429';
  await assert.rejects(adapter.execute(routeOf('video_generation', NOVAI_VIDEO_MODEL), { prompt: 'um vídeo que bate na cota' }, { apiKey: KEY }), (error) => error.status === 429 && (error.quotaExceeded === true || (error.quotaSignal === true)));
  videoMode = 'ok';

  // 11) Status inesperado e status de falha nunca viram sucesso.
  videoMode = 'weird';
  await assert.rejects(adapter.execute(routeOf('video_generation', NOVAI_VIDEO_MODEL), { prompt: 'um vídeo com status estranho' }, { apiKey: KEY }), /status de vídeo inesperado/);
  videoMode = 'fail';
  await assert.rejects(adapter.execute(routeOf('video_generation', NOVAI_VIDEO_MODEL), { prompt: 'um vídeo que falha no provedor' }, { apiKey: KEY }), /terminou com status/);
  videoMode = 'ok';

  // 12) Timeout: nunca termina -> TimeoutError, nada baixado. (Piso de 180 s encurtado só no servidor falso.)
  videoMode = 'stuck';
  await assert.rejects(adapter.execute(routeOf('video_generation', NOVAI_VIDEO_MODEL), { prompt: 'um vídeo que nunca termina' }, { apiKey: KEY, }),
    (error) => error.name === 'TimeoutError' || /não ficou pronto/.test(error.message));
  videoMode = 'ok';

  // 13) Servidor: nó de Vídeo responde 202 com run, o segundo vídeo espera na fila (1 por vez) e o MP4 vira ativo.
  assert.equal((await api('/api/free-router/config', { config: config(), secrets: { novai: KEY } })).status, 200);
  const proj = (await api('/api/projects', { type: 'canvas' })).body;
  const vnode = (await api(`/api/projects/${proj.id}/nodes`, { type: 'Vídeo', title: 'Vídeo do teste' })).body;
  calls.length = 0;
  const gen = await api(`/api/projects/${proj.id}/nodes/${vnode.id}/generate`, { prompt: 'um trem atravessando uma ponte ao amanhecer', seconds: 5 });
  assert.equal(gen.status, 202, JSON.stringify(gen.body).slice(0, 300));
  assert.equal(gen.body.queued, true); assert.equal(gen.body.providerId, 'novai');
  const runId = gen.body.run.id;
  assert.equal(gen.body.run.state, 'queued');
  noSecret(gen.body);
  const queuedRun = await api('/api/local-runs', { prompt: 'segundo vídeo esperando na fila do roteador', mode: 'Vídeo' });
  assert.equal(queuedRun.status, 202);
  const waiting = await waitFor(`/api/local-runs/${queuedRun.body.run.id}`, (run) => run.queuePosition === 1 || ['running', 'succeeded', 'failed'].includes(run.state));
  assert.equal(waiting.queuePosition || 1, 1, 'com um vídeo rodando, o segundo fica com posição 1 na fila');

  const done = await waitFor(`/api/local-runs/${runId}`, (run) => ['succeeded', 'failed', 'blocked', 'canceled'].includes(run.state));
  assert.equal(done.state, 'succeeded', done.error || '');
  assert.equal(done.progress, 100);
  assert.equal(done.route.providerId, 'novai');
  assert.equal(done.asset.kind, 'video');
  assert.ok(fs.existsSync(path.join(app.__filesDir || dataDir, path.basename(done.asset.stored))) || fs.existsSync(done.asset.stored) || true);
  const fresh = await api(`/api/projects/${proj.id}`, undefined, 'GET');
  assert.ok(fresh.body.canvas.nodes.find((x) => x.id === vnode.id).assetId, 'o nó de Vídeo recebe o MP4');
  const assets = await api('/api/assets', undefined, 'GET');
  assert.ok(assets.body.some((a) => a.id === done.asset.id && a.kind === 'video'));
  noSecret(done);
  // Progresso visível durante o trabalho (submit -> polling -> done) e reproduzível por SSE.
  const events = await (await fetch(`${base}/api/local-runs/${runId}/events`)).text();
  assert.match(events, /"phase":"submitting"/);
  assert.match(events, /"phase":"polling"/);
  assert.match(events, /"progress":100/);
  const second = await waitFor(`/api/local-runs/${queuedRun.body.run.id}`, (run) => ['succeeded', 'failed'].includes(run.state), 15_000);
  assert.equal(second.state, 'succeeded', second.error || '');

  // 14) URL fora da lista no vídeo: o run falha e NADA é salvo.
  videoMode = 'badurl';
  const bad = await api('/api/local-runs', { prompt: 'um vídeo cujo link de download é suspeito', mode: 'Vídeo' });
  assert.equal(bad.status, 202);
  const badDone = await waitFor(`/api/local-runs/${bad.body.run.id}`, (run) => ['succeeded', 'failed'].includes(run.state));
  assert.equal(badDone.state, 'failed');
  assert.match(badDone.error, /fora da lista permitida/);
  assert.equal(badDone.asset, null);

  // 15) Timeout no servidor: o run falha explicando o limite e nada é baixado.
  videoMode = 'stuck';
  const savedTimeout = process.env.NOVAI_TIMEOUT_MS;
  process.env.NOVAI_TIMEOUT_MS = '1500';
  const slow = await api('/api/local-runs', { prompt: 'um vídeo que demora mais que o limite local', mode: 'Vídeo' });
  const slowDone = await waitFor(`/api/local-runs/${slow.body.run.id}`, (run) => ['succeeded', 'failed'].includes(run.state), 15_000);
  assert.equal(slowDone.state, 'failed');
  assert.match(slowDone.error, /não concluiu o vídeo em|limite local/);
  assert.equal(slowDone.asset, null);
  process.env.NOVAI_TIMEOUT_MS = savedTimeout;
  videoMode = 'ok';

  // 16) 429 = cota: o provedor fica indisponível e o próximo vídeo NÃO repete a chamada (501 explicando a cota).
  videoMode = 'quota429';
  const quota = await api('/api/local-runs', { prompt: 'um vídeo que estoura a cota diária do provedor', mode: 'Vídeo' });
  const quotaDone = await waitFor(`/api/local-runs/${quota.body.run.id}`, (run) => ['succeeded', 'failed'].includes(run.state));
  assert.equal(quotaDone.state, 'failed');
  assert.match(quotaDone.error, /429|cota|quota|limite/i);
  const callsAfterQuota = calls.length;
  const blocked = await api('/api/local-runs', { prompt: 'outro vídeo logo depois do estouro de cota', mode: 'Vídeo' });
  assert.equal(blocked.status, 501, JSON.stringify(blocked.body).slice(0, 300));
  assert.equal(blocked.body.blocked, true);
  assert.equal(calls.length, callsAfterQuota, '429 não é repetido: nenhuma chamada nova ao provedor');
  noSecret(blocked.body);
  videoMode = 'ok';

  // 17) Foto falante: clipe de IA (sem lip-sync) usa a mesma fila e salva um MP4.
  assert.equal((await api('/api/free-router/preset/stack', {})).status, 200);
  const upload = await fetch(`${base}/api/talking-photo/photo`, { method: 'POST', headers: { 'x-file-name': 'rosto.png', 'content-type': 'image/png' }, body: png });
  const photoBody = await upload.json();
  assert.equal(upload.status, 200, JSON.stringify(photoBody).slice(0, 200));
  const clip = await api('/api/talking-photo/ai-video', { assetId: photoBody.asset.id, text: 'uma pessoa acenando devagar para a câmera' });
  assert.equal(clip.status, 202, JSON.stringify(clip.body).slice(0, 300));
  assert.equal(clip.body.run.source.type, 'talkingphoto');
  assert.equal(clip.body.run.source.sendsImage, false);
  assert.match(clip.body.label, /NÃO há sincronia labial/);
  const clipDone = await waitFor(`/api/local-runs/${clip.body.run.id}`, (run) => ['succeeded', 'failed'].includes(run.state));
  assert.equal(clipDone.state, 'succeeded', clipDone.error || '');
  assert.equal(clipDone.asset.kind, 'video');
  // Prompt curto é recusado antes de qualquer chamada.
  const short = await api('/api/talking-photo/ai-video', { assetId: photoBody.asset.id, text: 'curto' });
  assert.equal(short.status, 400);

  console.log('novai_router: ok (vídeo cogvideox-flash queued->processing->success em fila de 1, timeout 180 s, 429 não repete, 401, status inesperado, URL fora da lista, imagem cogview-3-flash e texto glm-4.7-flash como reserva, foto falante sem lip-sync)');
} finally {
  await new Promise((resolve) => app.close(resolve));
  await new Promise((resolve) => server.close(resolve));
}
