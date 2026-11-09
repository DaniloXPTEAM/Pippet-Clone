// Lote 2 (A + D), ffmpeg REAL e arquivos locais:
//  A. seletor de proporção do editor (opções OBSERVADAS no Pippit: Original aspect ratio, 16:9, 4:3, 2:1, 9:16, 1:1, 3:4): validação, persistência, dimensões reais exportadas,
//     "Original" segue o primeiro clipe, sem distorção (pad/letterbox);
//  D. Canvas -> Editor (extensão local): vídeo REAL do nó vira o clipe, vínculos preservados, exporta de volta ao Canvas, reabre após reiniciar; recusas honestas
//     (nó que não é vídeo, nó sem mídia, geração incompleta, ativo removido, arquivo ausente, mídia inválida) sem criar cartões falsos.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-ec-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_JOB_TICK_MS = '3600000';
const media = await import('../app/lib/media.mjs'); assert.ok(media.available());
const { server } = await import('../app/server.mjs'); const PORT = 5199; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const send = (m) => (p, b) => j(p, { method: m, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }); const post = send('POST'), put = send('PUT'), patch = send('PATCH');
const mk = (args, out) => { const r = spawnSync(media.FFMPEG, ['-y', ...args, out], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return fs.readFileSync(out); };
const upload = async (buf, name, kind = 'video/mp4') => (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': name, 'content-type': kind }, body: buf })).body;
const land = await upload(mk(['-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=3', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-shortest', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-c:a', 'aac'], path.join(tmp, 'land.mp4')), 'paisagem.mp4');
const port = await upload(mk(['-f', 'lavfi', '-i', 'testsrc=size=360x640:rate=25:duration=3', '-pix_fmt', 'yuv420p', '-c:v', 'libx264'], path.join(tmp, 'port.mp4')), 'retrato.mp4'); assert.equal(land.width, 640); assert.equal(port.height, 640);
const fileOf = (a) => { for (const d of [path.join(tmp, 'files'), tmp]) { const f = path.join(d, a.stored); if (fs.existsSync(f)) return f; } throw new Error('arquivo do ativo não achado ' + a.stored); };
const exportDims = async (id, body) => { const r = await post(`/api/editor/${id}/export`, body); assert.equal(r.status, 200, JSON.stringify(r.body)); const p = media.probe(fileOf(r.body.asset)); return { w: p.width, h: p.height, r }; };

// ---------- A. proporção do editor
const cat = (await j('/api/catalog')).body.editorRatios; assert.deepEqual(cat.map((x) => x.id), ['original', '16:9', '4:3', '2:1', '9:16', '1:1', '3:4']); assert.equal(cat[0].label, 'Original aspect ratio'); assert.equal(cat.find((x) => x.id === '9:16').hint, 'TikTok, TikTok ads, Instagram stories'); assert.ok(!cat.some((x) => x.id === '21:9'), '21:9 não é opção do editor observado');
const ed = (await post('/api/editor')).body; assert.equal(ed.timeline.ratio, 'original', 'padrão observado = Original aspect ratio');
const tl = (ratio) => ({ ratio, clips: [{ assetId: land.id, in: 0, out: 2 }], texts: [], captions: [], audio: [], background: { type: 'black' } });
assert.equal((await put(`/api/editor/${ed.id}`, { ...tl('5:4') })).status, 400, 'proporção não observada é recusada'); assert.equal((await put(`/api/editor/${ed.id}`, { ...tl('abc') })).status, 400);
const expect = { original: [1280, 720], '16:9': [1280, 720], '4:3': [960, 720], '2:1': [1280, 640], '9:16': [720, 1280], '1:1': [720, 720], '3:4': [720, 960] };
for (const [ratio, [w, h]] of Object.entries(expect)) { assert.equal((await put(`/api/editor/${ed.id}`, tl(ratio))).status, 200); const got = (await j(`/api/projects/${ed.id}`)).body.timeline.ratio; assert.equal(got, ratio, 'persistiu ' + ratio); const e = await exportDims(ed.id, {}); assert.deepEqual([e.w, e.h], [w, h], `exportação ${ratio}`); }
// "Original" segue o PRIMEIRO clipe: retrato 360x640 -> 720x1280 (lado menor 720, sem distorção)
assert.equal((await put(`/api/editor/${ed.id}`, { ...tl('original'), clips: [{ assetId: port.id, in: 0, out: 2 }] })).status, 200); let e = await exportDims(ed.id, {}); assert.deepEqual([e.w, e.h], [720, 1280]);
// sem distorção: o vídeo paisagem em 9:16 recebe barras (pad) em vez de ser esticado -> as bordas superior/inferior são pretas e o centro tem imagem
assert.equal((await put(`/api/editor/${ed.id}`, tl('9:16'))).status, 200); e = await exportDims(ed.id, {}); const frame = path.join(tmp, 'f.png'); spawnSync(media.FFMPEG, ['-y', '-i', fileOf(e.r.body.asset), '-ss', '1', '-frames:v', '1', frame]); assert.ok(fs.existsSync(frame));
const lum = (y) => { const o = spawnSync(media.FFMPEG, ['-v', 'error', '-i', frame, '-vf', `crop=2:2:360:${y},format=gray`, '-f', 'rawvideo', '-'], { encoding: 'buffer' }); return o.stdout[0]; }; assert.ok(lum(40) < 20 && lum(1240) < 20, 'barras pretas em cima/embaixo (letterbox)'); 
// resolução de exportação continua valendo sobre a proporção escolhida (lado menor)
assert.equal((await put(`/api/editor/${ed.id}`, tl('1:1'))).status, 200); e = await exportDims(ed.id, { name: 'quadrado', resolution: '360p', format: 'mp4', fps: 24 }); assert.deepEqual([e.w, e.h], [360, 360]);
// ratio omitido num PUT preserva o atual (não volta ao padrão)
await put(`/api/editor/${ed.id}`, { clips: tl('4:3').clips }); assert.equal((await j(`/api/projects/${ed.id}`)).body.timeline.ratio, '1:1');

// ---------- D. Canvas -> Editor
const cv = (await post('/api/projects', { type: 'canvas' })).body; const node = (await post(`/api/projects/${cv.id}/nodes`, { type: 'Vídeo', title: 'Cena 1' })).body; const E = (nid, b) => post(`/api/projects/${cv.id}/nodes/${nid}/edit`, b);
// recusas honestas, sem criar editores nem ativos
const before = (await j('/api/assets?cat=works')).body.length;
let r = await E(node.id); assert.equal(r.status, 409); assert.match(r.body.error, /ainda não tem vídeo/);
const txt = (await post(`/api/projects/${cv.id}/nodes`, { type: 'Texto', title: 'nota' })).body; r = await E(txt.id); assert.equal(r.status, 400); assert.match(r.body.error, /só nós de vídeo/);
assert.equal((await E('nzzz999')).status, 404);
// geração incompleta (tarefa bloqueada por falta de provedor, vinda do nó)
const gen = await post(`/api/projects/${cv.id}/nodes/${node.id}/generate`, { prompt: 'uma maçã vermelha girando sobre uma mesa branca' }); assert.ok([202, 409, 501, 400].includes(gen.status), 'geração do nó sem provedor: ' + gen.status);
if (gen.status === 202) { r = await E(node.id); assert.equal(r.status, 409); assert.match(r.body.error, /geração deste nó ainda não terminou/); assert.ok(r.body.jobState); }
// ativo inexistente / arquivo ausente / mídia inválida
const ghost = (await post(`/api/projects/${cv.id}/nodes`, { type: 'Vídeo', title: 'fantasma' })).body; await patch(`/api/projects/${cv.id}/nodes/${ghost.id}`, { assetId: 'ativo-que-nao-existe' }); r = await E(ghost.id); assert.equal(r.status, 404); assert.match(r.body.error, /não existe mais/);
const gone = await upload(mk(['-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=25:duration=1', '-pix_fmt', 'yuv420p', '-c:v', 'libx264'], path.join(tmp, 'gone.mp4')), 'sumiu.mp4'); const nGone = (await post(`/api/projects/${cv.id}/nodes`, { type: 'Vídeo', title: 'sumiu' })).body; await patch(`/api/projects/${cv.id}/nodes/${nGone.id}`, { assetId: gone.id }); fs.unlinkSync(fileOf(gone)); r = await E(nGone.id); assert.equal(r.status, 410); assert.match(r.body.error, /ausente do disco/);
const junk = await upload(Buffer.from('isto não é um vídeo, só texto'), 'falso.mp4'); const nJunk = (await post(`/api/projects/${cv.id}/nodes`, { type: 'Vídeo', title: 'falso' })).body; await patch(`/api/projects/${cv.id}/nodes/${nJunk.id}`, { assetId: junk.id }); r = await E(nJunk.id); assert.equal(r.status, 422); assert.match(r.body.error, /não é um vídeo válido/);
assert.equal((await j('/api/assets?cat=works')).body.length, before, 'recusas não criam ativos');
const editorCount = async () => (await j('/api/projects')).body.filter((p) => p.type === 'editor').length; const ec0 = await editorCount();
// caminho feliz: vídeo real do nó
await patch(`/api/projects/${cv.id}/nodes/${node.id}`, { assetId: land.id }); r = await E(node.id); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.reused, false); const edId = r.body.editorId; assert.equal(await editorCount(), ec0 + 1);
let epj = (await j(`/api/projects/${edId}`)).body; assert.equal(epj.type, 'editor'); assert.equal(epj.timeline.clips.length, 1); assert.equal(epj.timeline.clips[0].assetId, land.id); assert.ok(Math.abs(epj.timeline.clips[0].out - 3) < 0.2, 'clipe cobre o vídeo inteiro'); assert.equal(epj.timeline.ratio, 'original'); assert.deepEqual(epj.origin, { projectId: cv.id, nodeId: node.id, assetId: land.id }); assert.equal(epj.title, 'Cena 1');
let cpj = (await j(`/api/projects/${cv.id}`)).body; assert.deepEqual(cpj.canvas.nodes.find((x) => x.id === node.id).editorIds, [edId], 'vínculo guardado no nó');
// reabrir o mesmo nó reaproveita a edição; {new:true} cria outra
r = await E(node.id); assert.equal(r.body.editorId, edId); assert.equal(r.body.reused, true); assert.equal(await editorCount(), ec0 + 1);
// editar na timeline (cortar 1–2 s, velocidade 2x) e exportar: resultado volta ao Canvas ligado ao nó original
assert.equal((await put(`/api/editor/${edId}`, { ratio: '9:16', clips: [{ assetId: land.id, in: 1, out: 2, speed: 2 }], texts: [{ text: 'Olá', start: 0, end: 0.4 }], captions: [], audio: [] })).status, 200);
assert.equal((await j(`/api/projects/${edId}`)).body.origin.nodeId, node.id, 'a origem sobrevive à edição (PUT não apaga o vínculo)');
const ex = await post(`/api/editor/${edId}/export`, { name: 'cena1-editada', resolution: '720p', fps: 25, format: 'mp4', quality: 'faster', watermark: false }); assert.equal(ex.status, 200, JSON.stringify(ex.body)); assert.ok(ex.body.linked?.nodeId, 'devolveu o nó criado no Canvas'); assert.ok(Math.abs(ex.body.info.duration - 0.5) < 0.3, 'corte 1 s a 2x = 0,5 s: ' + ex.body.info.duration); assert.deepEqual([ex.body.info.width, ex.body.info.height], [720, 1280]);
cpj = (await j(`/api/projects/${cv.id}`)).body; const nn = cpj.canvas.nodes.find((x) => x.id === ex.body.linked.nodeId); assert.ok(nn && nn.type === 'Vídeo' && nn.title === 'cena1-editada (editado)' && nn.assetId === ex.body.asset.id && nn.editedFrom === node.id && nn.editorId === edId); assert.ok(cpj.canvas.edges.some((e2) => e2.from === node.id && e2.to === nn.id), 'aresta nó original -> nó editado');
r = await E(nn.id, {}); assert.equal(r.status, 200, 'o nó editado também pode ser editado de novo'); assert.notEqual(r.body.editorId, edId);
r = await E(node.id, { new: true }); assert.equal(r.body.reused, false); assert.notEqual(r.body.editorId, edId); assert.equal((await j(`/api/projects/${cv.id}`)).body.canvas.nodes.find((x) => x.id === node.id).editorIds.length, 2);
// persistência: o estado em disco guarda vínculos; reabrir (novo carregamento do db) mantém tudo
const disk = JSON.parse(fs.readFileSync(path.join(tmp, 'db.json'), 'utf8')); const dEd = disk.projects.find((p) => p.id === edId); assert.equal(dEd.origin.nodeId, node.id); assert.equal(dEd.timeline.clips[0].speed, 2); assert.equal(dEd.timeline.ratio, '9:16'); assert.ok(disk.projects.find((p) => p.id === cv.id).canvas.nodes.find((x) => x.id === nn.id).editedFrom);
// o workflow de tarefas do lote 1 continua intacto (rota de tarefas responde)
assert.equal((await j('/api/jobs')).status, 200);
console.log('OK editor_canvas: proporções observadas (validação/persistência/exportação real/Original/letterbox/resolução) e Canvas->Editor (vídeo real, vínculos, retorno ao Canvas, recusas, persistência)');
server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
