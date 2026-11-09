// Ferramentas de nó sem IA (ffmpeg real): Extrair quadro, Cortar, Extrair áudio, Recortar, Girar; ferramentas de IA bloqueadas com motivo.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-nt-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const media = await import('../app/lib/media.mjs');
if (!media.available()) { console.log('ffmpeg ausente: teste ignorado'); process.exit(0); }
const PORT = 5199; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const patch = (p, b) => j(p, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const file = path.join(tmp, 'v.mp4'); const r0 = spawnSync(media.FFMPEG, ['-y', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=4', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-c:a', 'aac', '-shortest', file]); assert.equal(r0.status, 0);
const silent = path.join(tmp, 's.mp4'); assert.equal(spawnSync(media.FFMPEG, ['-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=25:duration=2', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', silent]).status, 0);
const up = async (f, name) => (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': name, 'content-type': 'video/mp4' }, body: fs.readFileSync(f) })).body;
const A = await up(file, 'v.mp4'); const S = await up(silent, 's.mp4');
const proj = (await post('/api/projects', { type: 'canvas' })).body; const vn = (await post(`/api/projects/${proj.id}/nodes`, { type: 'Vídeo' })).body;
const tool = (n, t, params) => post(`/api/projects/${proj.id}/nodes/${n.id}/tool`, { tool: t, params });
// sem mídia: bloqueado
assert.equal((await tool(vn, 'Cortar', {})).status, 400); await patch(`/api/projects/${proj.id}/nodes/${vn.id}`, { assetId: A.id });
assert.equal((await tool(vn, 'Inexistente', {})).status, 400); const ai = await tool(vn, 'Analisar', {}); assert.equal(ai.status, 501); assert.equal(ai.body.blocked, true);
// Extrair quadro (t=1 e último quadro)
let r = await tool(vn, 'Extrair quadro', { t: 1 }); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.node.type, 'Imagem'); assert.equal(r.body.asset.kind, 'image'); assert.equal(r.body.asset.width, 640); assert.equal(r.body.asset.height, 360);
const imgNode = r.body.node; assert.ok(imgNode.tools.every((t) => t.enabled)); r = await tool(vn, 'Extrair quadro', { t: 'last' }); assert.equal(r.status, 200);
// Cortar 1..3 s
r = await tool(vn, 'Cortar', { start: 1, end: 3 }); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.node.type, 'Vídeo'); assert.ok(Math.abs(r.body.asset.duration - 2) < 0.3, 'duração ' + r.body.asset.duration); assert.equal((await tool(vn, 'Cortar', { start: 3, end: 1 })).status, 400);
// Extrair áudio (com e sem faixa)
r = await tool(vn, 'Extrair áudio', {}); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.node.type, 'Áudio'); assert.equal(r.body.asset.kind, 'audio'); assert.ok(Math.abs(r.body.asset.duration - 4) < 0.4);
const sn = (await post(`/api/projects/${proj.id}/nodes`, { type: 'Vídeo' })).body; await patch(`/api/projects/${proj.id}/nodes/${sn.id}`, { assetId: S.id }); r = await tool(sn, 'Extrair áudio', {}); assert.equal(r.status, 400); assert.match(r.body.error, /sem faixa de áudio|não tem faixa|nao tem faixa/i);
// Recortar 1:1 (vídeo 640x360 -> 360x360) e imagem 9:16 (-> 202x360), Girar 90 (-> 360x640) e 180
r = await tool(vn, 'Recortar', { ratio: '1:1' }); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.asset.width, 360); assert.equal(r.body.asset.height, 360);
assert.equal((await tool(imgNode, 'Recortar', { ratio: '9:16' })).status, 400, 'o nó Imagem não tem a ferramenta Recortar (lista observada)');
// Recortar/Girar existem em Personagem/Cena (lista observada): imagem 640x360 -> 9:16 e giro
const cena = (await post(`/api/projects/${proj.id}/nodes`, { type: 'Cena' })).body; await patch(`/api/projects/${proj.id}/nodes/${cena.id}`, { assetId: imgNode.assetId || (await j(`/api/projects/${proj.id}`)).body.canvas.nodes.find((x) => x.id === imgNode.id).assetId });
r = await tool(cena, 'Recortar', { ratio: '9:16' }); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.asset.kind, 'image'); assert.ok(Math.abs(r.body.asset.width / r.body.asset.height - 9 / 16) < 0.02);
r = await tool(cena, 'Girar', { degrees: 90 }); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.asset.width, 360); assert.equal(r.body.asset.height, 640); assert.equal((await tool(cena, 'Girar', { degrees: 45 })).status, 400);
assert.equal((await tool(vn, 'Girar', { degrees: 90 })).status, 400, 'o nó Vídeo não tem Girar');
// Melhorar qualidade (vídeo, ampliação convencional 2x) e Amplificar (imagem 2x, Imagem tem a ferramenta)
r = await tool(vn, 'Melhorar qualidade', {}); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.asset.width, 1280); assert.equal(r.body.asset.height, 720); assert.ok(Math.abs(r.body.asset.duration - 4) < 0.4);
r = await tool(imgNode, 'Amplificar', {}); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.asset.kind, 'image'); assert.equal(r.body.asset.width, 1280); assert.equal(r.body.asset.height, 720);
assert.equal((await tool(imgNode, 'Isolar camadas', {})).status, 501, 'segmentação exige modelo de IA'); assert.equal((await tool(vn, 'Amplificar', {})).status, 400, 'Amplificar não existe no nó Vídeo');
// grafo: os nós novos ficam ligados ao nó de origem
const pj = (await j(`/api/projects/${proj.id}`)).body; assert.ok(pj.canvas.nodes.length >= 9); assert.ok(pj.canvas.edges.filter((e) => e.from === vn.id).length >= 5); assert.ok(pj.canvas.edges.filter((e) => e.from === cena.id).length >= 2);
console.log('OK nodetools: quadro, corte, áudio, recorte, giro; IA bloqueada; sem mídia/sem áudio/ângulo inválido'); server.close(); process.exit(0);
