// Legendas automáticas e corte por transcrição pela Cloudflare Workers AI (@cf/openai/whisper).
// Nenhuma chamada real: um servidor falso em 127.0.0.1 faz o papel da Cloudflare e o ffmpeg real gera os áudios.
// Cobre: 200 (texto+words), áudio longo dividido em trechos de 25 s com tempos deslocados, 401, 429, resposta
// sem texto, resposta sem tempos por palavra, rápida confirmação de queue, corte por transcrição e credencial ausente.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ACCOUNT = 'conta-cloudflare-teste';
const TOKEN = 'token-cloudflare-teste';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-transcribe-'));
process.env.PIPPIT_LOCAL_DATA = tmp;
process.env.PIPPIT_LLM = 'off';
process.env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT;
process.env.CLOUDFLARE_API_TOKEN = TOKEN;

const FFMPEG = process.env.PIPPIT_FFMPEG || 'ffmpeg';
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const calls = [];
let mode = 'ok'; // ok | auth401 | quota429 | notext | nowords | slow
const audioBytes = (body) => { try { const d = JSON.parse(body); if (d && Array.isArray(d.audio)) return d.audio.length; } catch {} return 0; };
const fake = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const raw = Buffer.concat(chunks);
    calls.push({ path: url.pathname, auth: req.headers.authorization || null, contentType: req.headers['content-type'] || null, bytes: raw.length });
    if (!url.pathname.startsWith(`/client/v4/accounts/${ACCOUNT}/ai/run/`)) return json(res, 404, { success: false, errors: [{ message: 'wrong path' }] });
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return json(res, 401, { success: false, errors: [{ message: 'Invalid API Token' }] });
    if (mode === 'slow') return; // nunca responde
    if (mode === 'auth401') return json(res, 401, { success: false, errors: [{ message: 'Authentication error' }] });
    if (mode === 'quota429') return json(res, 429, { success: false, errors: [{ message: 'rate limited' }] });
    if (mode === 'notext') return json(res, 200, { success: true, result: {} });
    // Cada trecho é transcrito isoladamente: as palavras começam em 0 (o servidor soma o deslocamento).
    if (mode === 'nowords') return json(res, 200, { success: true, result: { text: 'uma frase por trecho.' } });
    return json(res, 200, { success: true, result: {
      text: 'ola mundo do teste de transcricao',
      words: [
        { word: 'ola', start: 0.2, end: 0.6 }, { word: 'mundo', start: 0.7, end: 1.2 },
        { word: 'do', start: 1.3, end: 1.4 }, { word: 'teste', start: 1.5, end: 2.0 },
        { word: 'de', start: 6.5, end: 6.7 }, { word: 'transcricao', start: 6.8, end: 7.6 },
      ] } });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = `http://127.0.0.1:${fake.address().port}`;
process.env.CLOUDFLARE_AI_BASE_URL = `${root}/client/v4/accounts/{account}/ai/run`;

const { planChunks, toSrt, keepRangesFromWords, cuesFromWords, normalizeTranscription } = await import('../app/lib/transcribe.mjs');
const { server: app } = await import('../app/server.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body, method = 'POST') => { const res = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() }; };
const noSecret = (v) => { const s = JSON.stringify(v); assert.doesNotMatch(s, new RegExp(TOKEN)); assert.doesNotMatch(s, new RegExp(ACCOUNT)); };
const ff = (args) => { const r = spawnSync(FFMPEG, args, { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`ffmpeg falhou: ${(r.stderr || '').slice(-300)}`); };
const makeAudio = (name, seconds) => {
  const file = path.join(tmp, name);
  ff(['-y', '-f', 'lavfi', '-i', `sine=frequency=440:duration=${seconds}`, '-ac', '1', '-ar', '44100', file]);
  return file;
};
const upload = async (file, name) => {
  const res = await fetch(`${base}/api/assets`, { method: 'POST', headers: { 'x-file-name': encodeURIComponent(name), 'x-cat': 'upload', 'content-type': 'audio/wav' }, body: fs.readFileSync(file) });
  const body = await res.json(); assert.equal(res.status, 200, JSON.stringify(body).slice(0, 200)); return body.asset || body;
};
const newEditorWith = async (clips) => {
  const p = (await api('/api/editor', {})).body;
  const r = await api(`/api/editor/${p.id}`, { ratio: '9:16', clips, texts: [], captions: [] }, 'PUT');
  assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 200));
  return p.id;
};

try {
  // 0) Funções puras: trechos de 25 s, SRT e corte por pausa.
  assert.deepEqual(planChunks(58_000), [{ startMs: 0, endMs: 25_000 }, { startMs: 25_000, endMs: 50_000 }, { startMs: 50_000, endMs: 58_000 }]);
  assert.deepEqual(planChunks(0), []);
  const srt = toSrt([{ start: 0, end: 1.5, text: 'oi' }]);
  assert.match(srt, /^1\n00:00:00,000 --> 00:00:01,500\noi\n$/);
  assert.equal(normalizeTranscription({ result: { text: 'x', words: [{ word: 'x', start: '0', end: '0.5' }] } }).words.length, 1);
  assert.deepEqual(keepRangesFromWords([{ word: 'a', start: 0, end: 1 }, { word: 'b', start: 6, end: 7 }], { totalSeconds: 10, padMs: 0, minGapMs: 600 }), [[0, 1], [6, 7]]);
  assert.deepEqual(keepRangesFromWords([{ word: 'a', start: 0, end: 1 }, { word: 'b', start: 1.4, end: 2 }], { totalSeconds: 10, padMs: 100, minGapMs: 600 }), [[0, 2.1]]);
  const cues = cuesFromWords([{ word: 'a', start: 0, end: 0.4 }, { word: 'b', start: 0.5, end: 0.9 }, { word: 'c', start: 5, end: 5.4 }]);
  assert.equal(cues.length, 2);

  // 1) Pilha aplicada: a transcrição é roteada para a Cloudflare.
  const preset = await api('/api/free-router/preset/stack', {});
  assert.equal(preset.status, 200);
  const status = (await api('/api/free-router/config', undefined, 'GET')).body;
  assert.ok(status.config.providers.find((p) => p.id === 'cloudflare').hasKey, 'chave só do ambiente');

  const short = await upload(makeAudio('curto.wav', 8), 'curto.wav');
  const editor = await newEditorWith([{ assetId: short.id, in: 0, out: 8 }]);

  // 2) Legendas automáticas: 200, trecho único, SRT salvo nos Ativos, nada de token na resposta.
  calls.length = 0;
  const caps = await api(`/api/editor/${editor}/captions-auto`, { language: 'pt' });
  assert.equal(caps.status, 200, JSON.stringify(caps.body).slice(0, 300));
  assert.equal(caps.body.backend, 'router');
  assert.equal(caps.body.chunks, 1);
  assert.equal(caps.body.provider.providerId, 'cloudflare');
  assert.equal(caps.body.provider.modelId, '@cf/openai/whisper');
  assert.ok(caps.body.captions >= 2, `legendas geradas: ${caps.body.captions}`);
  assert.match(caps.body.srt, /^1\n00:00:/);
  assert.ok(caps.body.srtAssetId, 'SRT salvo em Ativos');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, `/client/v4/accounts/${ACCOUNT}/ai/run/@cf/openai/whisper`);
  assert.equal(calls[0].auth, `Bearer ${TOKEN}`);
  assert.ok(calls[0].bytes > 1000, 'o corpo é o áudio (bytes), não JSON com base64');
  noSecret(caps.body);
  assert.ok(caps.body.timeline.captions.length >= 2, 'legendas ficam na timeline');
  const assets = (await api('/api/assets', undefined, 'GET')).body;
  assert.ok(assets.find((a) => a.id === caps.body.srtAssetId && /\.srt$/.test(a.stored)), 'ativo SRT com extensão .srt');

  // 3) Áudio longo: 58 s -> 3 trechos, tempos absolutos deslocados (o 3º trecho começa em 50 s).
  const long = await upload(makeAudio('longo.wav', 58), 'longo.wav');
  const editorLong = await newEditorWith([{ assetId: long.id, in: 0, out: 58 }]);
  calls.length = 0;
  const longCaps = await api(`/api/editor/${editorLong}/captions-auto`, {});
  assert.equal(longCaps.status, 200, JSON.stringify(longCaps.body).slice(0, 300));
  assert.equal(longCaps.body.chunks, 3, '58 s divididos em 3 trechos de até 25 s');
  assert.equal(calls.length, 3);
  const lastStart = Math.max(...longCaps.body.timeline.captions.map((c) => c.start));
  assert.ok(lastStart >= 50, `legenda do 3º trecho deslocada (max start ${lastStart})`);
  assert.ok(longCaps.body.timeline.captions.every((c) => c.end > c.start));

  // 4) 401 do provedor: falha de autenticação com motivo, e o provedor sai de rotação.
  mode = 'auth401';
  const denied = await api(`/api/editor/${editor}/captions-auto`, {});
  assert.ok([401, 502].includes(denied.status), `status ${denied.status}`);
  assert.match(denied.body.error, /autenticação|401/i);
  noSecret(denied.body);
  const avail = (await api('/api/free-router/config', undefined, 'GET')).body.availability;
  assert.ok(avail.some((a) => a.providerId === 'cloudflare' && a.kind === 'auth'), 'auth marca indisponibilidade');
  mode = 'ok';

  // 5) 429: cota — a resposta diferencia cota de erro genérico.
  mode = 'quota429';
  const quota = await api(`/api/editor/${editor}/captions-auto`, {});
  assert.equal(quota.status, 429);
  assert.match(quota.body.error, /cota|429/i);
  mode = 'ok';

  // Reaplicar a pilha libera o bloqueio de cota/erro temporário (ação explícita, como na UI).
  const resetRouter = async () => { assert.equal((await api('/api/free-router/preset/stack', {})).status, 200); };
  await resetRouter();

  // 6) Resposta sem texto: 502 com motivo claro (nada de legenda inventada).
  mode = 'notext';
  const empty = await api(`/api/editor/${editor}/captions-auto`, {});
  assert.equal(empty.status, 502);
  assert.match(empty.body.error, /não retornou result\.text|não retornou texto/);
  mode = 'ok';

  // 7) Sem tempos por palavra: legendas funcionam (por frase), corte por transcrição recusa em vez de adivinhar.
  mode = 'nowords';
  const noWords = await api(`/api/editor/${editor}/captions-auto`, {});
  assert.equal(noWords.status, 200, JSON.stringify(noWords.body).slice(0, 200));
  assert.ok(noWords.body.captions >= 1);
  const cutNoWords = await api(`/api/editor/${editor}/quick-cut`, {});
  assert.equal(cutNoWords.status, 422);
  assert.match(cutNoWords.body.error, /tempos por palavra/);
  mode = 'ok';

  // 8) Corte por transcrição: a pausa de 4,5 s entre as palavras vira dois clipes.
  const editorCut = await newEditorWith([{ assetId: short.id, in: 0, out: 8 }]);
  calls.length = 0;
  const cut = await api(`/api/editor/${editorCut}/quick-cut`, { minGapMs: 600, padMs: 0 });
  assert.equal(cut.status, 200, JSON.stringify(cut.body).slice(0, 300));
  assert.equal(cut.body.analysedClips, 1);
  assert.ok(cut.body.clips >= 2, `clipes após o corte: ${cut.body.clips}`);
  assert.ok(cut.body.removedSeconds > 3, `removido: ${cut.body.removedSeconds}s`);
  assert.equal(cut.body.words, 6);
  assert.ok(cut.body.timeline.clips.every((c) => c.out > c.in));
  noSecret(cut.body);

  // 9) Sem credencial: 501 com o nome da variável — e nada é chamado.
  calls.length = 0;
  const savedToken = process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;
  const noKey = await api(`/api/editor/${editorCut}/captions-auto`, {});
  assert.equal(noKey.status, 501);
  assert.equal(noKey.body.blocked, true);
  assert.match(noKey.body.error, /CLOUDFLARE_API_TOKEN/);
  assert.equal(calls.length, 0, 'sem credencial o provedor não é chamado');
  const noKeyCut = await api(`/api/editor/${editorCut}/quick-cut`, {});
  assert.equal(noKeyCut.status, 501);
  assert.match(noKeyCut.body.error, /CLOUDFLARE_API_TOKEN|Remover silêncios/);
  process.env.CLOUDFLARE_API_TOKEN = savedToken;

  await resetRouter();

  // 10) Timeout do provedor (nunca responde): o limite da rota corta a espera (aqui, 800 ms em vez de 60 s).
  const cfg = (await api('/api/free-router/config', undefined, 'GET')).body.config;
  const fast = { ...cfg, providers: cfg.providers.map((p) => (p.id === 'cloudflare' ? { ...p, timeoutMs: 800 } : p)) };
  assert.equal((await api('/api/free-router/config', { config: fast })).status, 200);
  mode = 'slow';
  const t0 = Date.now();
  const slow = await api(`/api/editor/${editorCut}/captions-auto`, {});
  const took = Date.now() - t0;
  assert.equal(slow.status, 504, `status do timeout: ${slow.status}`);
  assert.match(slow.body.error, /timeout|excedeu/i);
  assert.ok(took < 15_000, `o timeout não pode esperar minutos (levou ${took} ms)`);
  mode = 'ok';
  assert.equal((await api('/api/free-router/config', { config: cfg })).status, 200);

  console.log('cloudflare_transcribe: ok (legendas e corte por transcrição via @cf/openai/whisper com servidor falso: 200, trechos de 25 s com tempos deslocados, 401, 429, resposta sem texto, sem tempos por palavra, credencial ausente e timeout)');
} finally {
  await new Promise((r) => app.close(r));
  await new Promise((r) => fake.close(r));
  fs.rmSync(tmp, { recursive: true, force: true });
}
