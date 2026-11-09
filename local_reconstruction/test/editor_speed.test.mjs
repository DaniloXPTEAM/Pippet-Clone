// Painel Velocidade do editor (captura 5_6_Velocidade.png: Velocidade 1x, Duração, Tom, Câmera lenta suave) com ffmpeg REAL: duração exportada, altura do áudio (Tom),
// interpolação de quadros (Câmera lenta suave) medida por quadros únicos, validação da faixa local 0,1x–10x. "Tom" e a faixa são decisões locais (o Pippit não detalha).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-sp-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const media = await import('../app/lib/media.mjs'); assert.ok(media.available());
const { server } = await import('../app/server.mjs'); const PORT = 5203; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; }; const send = (m) => (p, b) => j(p, { method: m, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }); const post = send('POST'), put = send('PUT');
const run = (args) => spawnSync(media.FFMPEG, args, { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
const clipFile = path.join(tmp, 'c.mp4'); const r0 = run(['-y', '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=25:duration=3', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=3', '-shortest', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-c:a', 'aac', clipFile]); assert.equal(r0.status, 0, r0.stderr.toString());
const asset = (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': 'c.mp4', 'content-type': 'video/mp4' }, body: fs.readFileSync(clipFile) })).body;
const fileOf = (a) => path.join(tmp, 'files', a.stored);
const ed = (await post('/api/editor')).body;
async function exp(clip) { const r = await put(`/api/editor/${ed.id}`, { ratio: 'original', clips: [{ assetId: asset.id, in: 0, ...clip }] }); assert.equal(r.status, 200, JSON.stringify(r.body)); const e = await post(`/api/editor/${ed.id}/export`, { name: 'x' + Math.random().toString(36).slice(2, 6) }); assert.equal(e.status, 200, JSON.stringify(e.body)); return { file: fileOf(e.body.asset), info: e.body.info }; }
// frequência dominante por cruzamentos de zero (PCM mono 8 kHz)
const freq = (file) => { const o = run(['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '8000', '-f', 's16le', '-']); const b = o.stdout; const n = b.length / 2; let z = 0, prev = b.readInt16LE(0); for (let i = 1; i < n; i++) { const v = b.readInt16LE(i * 2); if ((prev < 0) !== (v < 0)) z++; prev = v; } return z / 2 / (n / 8000); };
const LF = String.fromCharCode(10);
// quadros "repetidos": diferença média entre quadros consecutivos (tblend + signalstats) quase nula; a interpolação cria quadros intermediários com diferença real
const dupFrames = (file) => { const o = run(['-v', 'info', '-i', file, '-map', '0:v:0', '-vf', 'tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-f', 'null', '-']); const v = [...o.stderr.toString().matchAll(/YAVG=([0-9.]+)/g)].map((m) => Number(m[1])).slice(1); return { n: v.length, dup: v.filter((x) => x < 0.1).length, v }; };

// validação da faixa local
assert.equal((await put(`/api/editor/${ed.id}`, { clips: [{ assetId: asset.id, speed: 0.05 }] })).status, 400); assert.equal((await put(`/api/editor/${ed.id}`, { clips: [{ assetId: asset.id, speed: 11 }] })).status, 400); assert.equal((await put(`/api/editor/${ed.id}`, { clips: [{ assetId: asset.id, in: -1 }] })).status, 400);
// 2x: duração cai pela metade; sem "Tom" a altura se mantém (440 Hz); com "Tom" a altura sobe junto (≈880 Hz)
let a = await exp({ out: 3, speed: 2 }); assert.ok(Math.abs(a.info.duration - 1.5) < 0.25, 'duração 2x: ' + a.info.duration); const f1 = freq(a.file); assert.ok(Math.abs(f1 - 440) < 40, 'sem Tom mantém a altura: ' + f1);
a = await exp({ out: 3, speed: 2, pitch: true }); assert.ok(Math.abs(a.info.duration - 1.5) < 0.25, 'duração com Tom: ' + a.info.duration); const f2 = freq(a.file); assert.ok(Math.abs(f2 - 880) < 80, 'com Tom a altura acompanha a velocidade: ' + f2);
// 0,5x: duração dobra; "Câmera lenta suave" interpola quadros (mais quadros únicos que a duplicação simples)
const off = await exp({ out: 1, speed: 0.5 }); assert.ok(Math.abs(off.info.duration - 2) < 0.3, 'duração 0,5x: ' + off.info.duration); const dOff = dupFrames(off.file);
const on = await exp({ out: 1, speed: 0.5, smoothSlow: true }); assert.ok(Math.abs(on.info.duration - 2) < 0.3); const dOn = dupFrames(on.file); 
const fOff = dOff.dup / dOff.n, fOn = dOn.dup / dOn.n; assert.ok(fOff >= 0.4, `sem interpolação boa parte dos quadros é repetida: ${dOff.dup}/${dOff.n}`); assert.ok(fOn <= fOff * 0.6, `com interpolação há bem menos quadros repetidos: ${dOn.dup}/${dOn.n} (antes ${dOff.dup}/${dOff.n})`);
// "Câmera lenta suave" não faz nada acima de 1x (só se aplica ao desacelerar)
const fast = await exp({ out: 2, speed: 2, smoothSlow: true }); assert.ok(Math.abs(fast.info.duration - 1) < 0.25);
// persistência dos campos no disco
const disk = JSON.parse(fs.readFileSync(path.join(tmp, 'db.json'), 'utf8')); const c = disk.projects.find((p) => p.id === ed.id).timeline.clips[0]; assert.equal(c.smoothSlow, true); assert.equal(c.speed, 2);
console.log(`OK editor_speed: duração por velocidade, Tom (440→${Math.round(f2)} Hz), Câmera lenta suave (quadros repetidos ${dOff.dup}→${dOn.dup}), validação 0,1x–10x, persistência`); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
