// Corte rápido por silêncio (ffmpeg real, sem IA), legendas automáticas (whisper.cpp do ffmpeg: montagem do comando, parse de SRT, 501 sem modelo).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-sil-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const media = await import('../app/lib/media.mjs');
if (!media.available()) { console.log('ffmpeg ausente: teste ignorado'); process.exit(0); }
// funções puras
assert.deepEqual(media.speechRanges([{ start: 1, end: 2 }, { start: 3, end: 4 }], 0, 5, { pad: 0 }), [[0, 1], [2, 3], [4, 5]]);
assert.deepEqual(media.speechRanges([{ start: 1, end: 2 }], 0, 3, { pad: 0.1 }), [[0, 1.1], [1.9, 3]]);
assert.deepEqual(media.speechRanges([{ start: 0, end: 5 }], 0, 5, { pad: 0 }), [], 'só silêncio');
assert.deepEqual(media.speechRanges([{ start: 1, end: 2 }], 1.5, 3, { pad: 0 }), [[2, 3]], 'respeita in/out do clipe');
const args = media.whisperArgs('C:\\v.mp4', 'C:\\o.srt', { model: 'C:\\m\\ggml-base.bin', language: 'pt' }); assert.ok(args.join(' ').includes("whisper=model='C\\:/m/ggml-base.bin':language=pt:queue=10:destination='C\\:/o.srt':format=srt"), args.join(' '));
assert.deepEqual(media.parseSrt('1\n00:00:01,500 --> 00:00:03,250\nOlá mundo\n\n2\n00:01:00,000 --> 00:01:02,000\nSegunda\nlinha\n'), [{ start: 1.5, end: 3.25, text: 'Olá mundo' }, { start: 60, end: 62, text: 'Segunda linha' }]);
// ffmpeg real: 6 s com 1 s de tom e 1 s de silêncio alternados
const src = path.join(tmp, 'a.mp4'); assert.equal(spawnSync(media.FFMPEG, ['-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=25:duration=6', '-f', 'lavfi', '-i', 'aevalsrc=sin(2*PI*440*t)*lt(mod(t\\,2)\\,1):s=44100:d=6', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-c:a', 'aac', '-shortest', src]).status, 0);
const sil = media.detectSilences(src, { noiseDb: -30, minSilence: 0.5 }); assert.ok(sil.length >= 2, JSON.stringify(sil)); assert.ok(Math.abs(sil[0].start - 1) < 0.2 && Math.abs(sil[0].end - 2) < 0.2, JSON.stringify(sil[0]));
const PORT = 5213; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const put = (p, b) => j(p, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const A = (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': 'a.mp4', 'content-type': 'video/mp4' }, body: fs.readFileSync(src) })).body;
const ed = (await post('/api/editor')).body; assert.equal((await post(`/api/editor/${ed.id}/silence-cut`)).status, 400, 'timeline vazia');
await put(`/api/editor/${ed.id}`, { ratio: '9:16', title: 't', clips: [{ assetId: A.id, in: 0, out: 6 }] });
const r = await post(`/api/editor/${ed.id}/silence-cut`, { noiseDb: -30, minSilence: 0.5, pad: 0 }); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.analysedClips, 1);
assert.ok(r.body.clips >= 2 && r.body.clips <= 3, 'trechos com som: ' + r.body.clips); assert.ok(r.body.removedSeconds >= 1.5 && r.body.removedSeconds <= 3.5, 'removidos ' + r.body.removedSeconds);
assert.ok(r.body.timeline.clips.every((c) => c.assetId === A.id && c.out > c.in)); const pj = (await j(`/api/projects/${ed.id}`)).body; assert.equal(pj.timeline.clips.length, r.body.clips, 'persistido');
const ex = await post(`/api/editor/${ed.id}/export`); assert.equal(ex.status, 200, JSON.stringify(ex.body)); assert.ok(ex.body.info.duration < 5, 'exportado sem os silêncios: ' + ex.body.info.duration); assert.equal(ex.body.info.hasAudio, true);
// legendas: sem modelo → 501 com instruções; modelo inexistente rejeitado na configuração; quick-cut por texto continua 501
const c1 = await post(`/api/editor/${ed.id}/captions-auto`); assert.equal(c1.status, 501); assert.match(c1.body.error, /modelo Whisper|filtro whisper/);
assert.equal((await post('/api/llm/config', { whisperModel: path.join(tmp, 'nao-existe.bin') })).status, 400);
const fake = path.join(tmp, 'fake.bin'); fs.writeFileSync(fake, 'x'); assert.equal((await post('/api/llm/config', { whisperModel: fake })).status, 200); assert.equal((await j('/api/llm/status')).body.whisperModel, fake);
if (media.whisperAvailable()) { const c2 = await post(`/api/editor/${ed.id}/captions-auto`); assert.equal(c2.status, 500, 'modelo inválido falha com erro do ffmpeg, sem quebrar'); }
assert.equal((await post(`/api/editor/${ed.id}/quick-cut`)).status, 501);
console.log('OK silence: corte por silêncio (detecção, trechos, persistência, export), legendas whisper (comando, SRT, 501 sem modelo)'); server.close(); process.exit(0);
