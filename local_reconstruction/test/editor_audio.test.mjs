// Editor: áudio do próprio clipe (mudo, volume dB, fade in, redução de ruído) e plano de fundo (cor / desfoque), medidos com ffmpeg real.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-ea-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const media = await import('../app/lib/media.mjs');
if (!media.available()) { console.log('ffmpeg ausente: teste ignorado'); process.exit(0); }
const PORT = 5201; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const put = (p, b) => j(p, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
// Fonte de teste: usa o codificador que a máquina realmente tem (libx264 ou mpeg4), nunca só libx264.
const src = path.join(tmp, 'a.mp4');
const made = spawnSync(media.FFMPEG, ['-y', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=4', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', ...media.videoEncodeArgs({ crf: 23 }), '-c:a', 'aac', '-shortest', src], { encoding: 'utf8' });
assert.equal(made.status, 0, 'ffmpeg não gerou a fonte: ' + String(made.stderr || '').split('\n').slice(-6).join(' | '));
const encoder = media.encoderInfo();
if (encoder.codec !== 'libx264') console.log('[editor_audio] libx264 indisponível nesta máquina; usando ' + encoder.codec + '. ffmpeg: ' + String(encoder.error || '').split('\n').slice(-2).join(' | '));
const A = (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': 'a.mp4', 'content-type': 'video/mp4' }, body: fs.readFileSync(src) })).body;
const meanVol = (file, secs) => { const r = spawnSync(media.FFMPEG, ['-i', file, ...(secs ? ['-t', String(secs)] : []), '-af', 'volumedetect', '-vn', '-f', 'null', '-'], { encoding: 'utf8' }); const m = /mean_volume: (-?[\d.]+) dB/.exec(r.stderr); return m ? Number(m[1]) : -Infinity; };
const pixel = (file, x, y) => { const r = spawnSync(media.FFMPEG, ['-i', file, '-vf', `crop=2:2:${x}:${y}`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { encoding: 'buffer' }); return [...r.stdout.subarray(0, 3)]; };
const ed = async (clip, extra = {}) => { const e = (await post('/api/editor')).body; await put(`/api/editor/${e.id}`, { ratio: '9:16', title: 't', clips: [{ assetId: A.id, in: 0, out: 2, ...clip }], ...extra }); const r = await post(`/api/editor/${e.id}/export`); assert.equal(r.status, 200, JSON.stringify(r.body)); return path.join(tmp, 'files', r.body.asset.stored); };
const f0 = await ed({}); const p0 = media.probe(f0); assert.equal(p0.hasAudio, true, 'áudio do clipe é mantido'); assert.ok(Math.abs(p0.duration - 2) < 0.3); const v0 = meanVol(f0); assert.ok(v0 > -40 && v0 < 0, 'tom audível ' + v0);
const fm = await ed({ mute: true }); assert.equal(media.probe(fm).hasAudio, false, 'mudo remove o áudio');
const fl = await ed({ volumeDb: -20 }); const vl = meanVol(fl); assert.ok(Math.abs((v0 - vl) - 20) < 3, `-20 dB: ${v0} -> ${vl}`);
const ff = await ed({ fadeIn: 1.5 }); assert.ok(meanVol(ff, 0.3) < meanVol(f0, 0.3) - 10, 'fade in: início mais baixo');
const fd = await ed({ denoise: true }); assert.equal(media.probe(fd).hasAudio, true);
const fs2 = await ed({ speed: 2 }); const ps = media.probe(fs2); assert.ok(Math.abs(ps.duration - 1) < 0.3, 'velocidade 2x: ' + ps.duration); assert.equal(ps.hasAudio, true);
// plano de fundo: preto (padrão), cor, desfoque — pixel do canto superior esquerdo (faixa fora do vídeo 16:9 em 9:16)
const pb = pixel(f0, 2, 2); assert.ok(pb.every((v) => v < 10), 'padrão preto ' + pb);
const pc = pixel(await ed({}, { background: { type: 'color', color: 'ff0000' } }), 2, 2); assert.ok(pc[0] > 200 && pc[1] < 60 && pc[2] < 60, 'cor vermelha ' + pc);
const pu = pixel(await ed({}, { background: { type: 'blur' } }), 2, 2); assert.ok(pu.some((v) => v > 20), 'desfoque usa o próprio vídeo ' + pu);
assert.equal((await j('/api/projects')).body.length >= 8, true);
console.log('OK editor_audio: áudio do clipe (mudo/dB/fade/denoise/velocidade) e plano de fundo (preto/cor/desfoque) · codec=' + media.encoderInfo().codec + (media.encoderInfo().error ? ' (fallback registrado)' : '')); server.close(); process.exit(0);
