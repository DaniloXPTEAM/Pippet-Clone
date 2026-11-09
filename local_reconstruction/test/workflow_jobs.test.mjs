// Workflow do agente com PROVEDOR DE VÍDEO (servidor de mentira com o formato da API OpenAI Vídeos, servindo mp4 REAIS gerados pelo ffmpeg):
// pedido -> storyboard -> tarefas bloqueadas (sem provedor / sem autorização de gasto: NENHUMA chamada ao provedor) -> autorizar -> sequência com referência
// -> falha de uma tarefa + "Tentar de novo" -> composição (narração local, legendas, projeto no editor, exportação) -> persistência em disco.
// Isto prova o encanamento do app; NÃO prova geração real por IA (o "provedor" é local e o conteúdo é uma imagem de teste do ffmpeg).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-wf-'));
process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_JOB_POLL_MS = '0'; process.env.PIPPIT_JOB_TICK_MS = '3600000';
const media = await import('../app/lib/media.mjs'); assert.ok(media.available(), 'ffmpeg necessário');
const clip = path.join(tmp, 'clip.mp4'); const r0 = spawnSync(media.FFMPEG, ['-y', '-f', 'lavfi', '-i', 'testsrc=size=720x1280:rate=25:duration=2', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', clip], { encoding: 'utf8' }); assert.equal(r0.status, 0, r0.stderr); const MP4 = fs.readFileSync(clip);

// provedor de mentira (formato OpenAI Vídeos)
const seen = []; let n = 0; const polls = {}; let failFirst = false;
const mock = http.createServer((req, res) => {
  const chunks = []; req.on('data', (d) => chunks.push(d)); req.on('end', () => {
    const body = Buffer.concat(chunks); const url = new URL(req.url, 'http://x'); seen.push({ m: req.method, p: url.pathname, body });
    const json = (o, c = 200) => { res.writeHead(c, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.method === 'POST' && url.pathname === '/v1/videos') { const id = `video_${++n}${failFirst ? '_FAIL' : ''}`; failFirst = false; return json({ id, status: 'queued', progress: 0 }); }
    let m = /^\/v1\/videos\/([\w-]+)$/.exec(url.pathname); if (m && req.method === 'GET') { polls[m[1]] = (polls[m[1]] || 0) + 1; if (polls[m[1]] < 2) return json({ id: m[1], status: 'in_progress', progress: 50 }); return json(m[1].endsWith('_FAIL') ? { id: m[1], status: 'failed', error: { message: 'moderação do provedor' } } : { id: m[1], status: 'completed', progress: 100 }); }
    if (/^\/v1\/videos\/[\w-]+\/content$/.test(url.pathname)) { res.writeHead(200, { 'content-type': 'video/mp4' }); return res.end(MP4); }
    json({ error: { message: 'rota inesperada' } }, 404);
  });
});
await new Promise((r) => mock.listen(5241, '127.0.0.1', r)); const V = 'http://127.0.0.1:5241/v1'; const posts = () => seen.filter((x) => x.m === 'POST' && x.p === '/v1/videos');

// LLM de mentira (formato OpenAI chat/completions): temas e storyboard COM falas, para exercitar legendas e narração na composição
const llm = http.createServer((req, res) => { const ch = []; req.on('data', (d) => ch.push(d)); req.on('end', () => { const url = new URL(req.url, 'http://x'); const json = (o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (url.pathname === '/v1/models') return json({ data: [{ id: 'mock-chat' }] }); const b = JSON.parse(Buffer.concat(ch).toString() || '{}'); const u = b.messages?.at(-1)?.content || '';
  const content = /3 temas/.test(u) ? JSON.stringify({ temas: ['Uma maçã viaja pelo mundo', 'A maçã que não queria cair', 'O segredo do pomar'] }) : JSON.stringify({ estilo: 'Cinema quente', segmentos: [{ titulo: 'Pomar', descricao: 'a maçã balança no galho', fala: 'Era uma vez uma maçã' }, { titulo: 'Viagem', descricao: 'a maçã rola pela estrada', fala: 'Ela viajou pelo mundo' }] });
  json({ choices: [{ message: { content } }] }); }); });
await new Promise((r) => llm.listen(5242, '127.0.0.1', r));
const { server } = await import('../app/server.mjs'); const PORT = 5196; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const tick = () => post('/api/jobs/tick'); const jobs = async () => (await j('/api/jobs')).body.slice().reverse(); // ordem de criação
const msgs = async (pid, cid) => (await j(`/api/projects/${pid}`)).body.chats.find((c) => c.id === cid).messages;

assert.equal((await post('/api/llm/config', { baseUrl: 'http://127.0.0.1:5242/v1', model: 'mock-chat' })).status, 200);
// 1) pedido -> tema -> storyboard (LLM de mentira com falas) -> confirmação
const proj = (await post('/api/projects', { type: 'canvas' })).body; const chat = (await post(`/api/projects/${proj.id}/chats`)).body; const M = `/api/projects/${proj.id}/chats/${chat.id}/messages`;
let m = (await post(M, { text: 'Crie um vídeo de 20 segundos sobre uma maçã vermelha que viaja pelo mundo' })).body; m = (await post(M, { answer: m.chat.messages.at(-1).form.options[0] })).body; assert.equal(m.chat.messages.at(-1).form.type, 'confirm_production');
m = (await post(M, { confirmation: { mode: 'sequencial', creditOk: true } })).body; let last = m.chat.messages.at(-1); if (last.form?.type === 'credit_confirm') { m = (await post(M, { confirmation: { mode: 'sequencial', creditOk: true } })).body; last = m.chat.messages.at(-1); }
// 2) sem provedor: tarefas preparadas e bloqueadas; nada enviado
let J = await jobs(); assert.equal(J.length, 2); assert.ok(J.every((x) => x.state === 'blocked' && /sem provedor de video/.test(x.error))); assert.equal(J[1].after, J[0].id, 'sequencial: o 2º espera o 1º'); assert.equal(seen.length, 0);
assert.ok(!(await j('/api/assets?cat=works')).body.some((a) => a.kind === 'video'));
// 3) provedor configurado, SEM autorização de gasto: continua bloqueado e o provedor não é chamado
assert.equal((await post('/api/providers/video', { adapter: 'openai-videos', baseUrl: 'ftp://x', model: 'm' })).status, 400, 'baseUrl inválida recusada');
assert.equal((await post('/api/providers/video', { adapter: 'openai-videos', baseUrl: V, model: 'sora-teste', apiKey: 'SEGREDO-123' })).status, 200);
J = await jobs(); assert.ok(J.every((x) => x.state === 'blocked' && /autorização de gasto/.test(x.error))); assert.equal(seen.length, 0, 'sem allowSpend nenhuma chamada ao provedor');
assert.ok(!JSON.stringify((await j('/api/providers')).body).includes('SEGREDO-123') && !JSON.stringify((await j('/api/state')).body).includes('SEGREDO-123'), 'chave nunca aparece nas respostas'); assert.equal((await j('/api/providers')).body.providers.video.hasKey, true);
// 4) autorizar gasto (apenas ao provedor de mentira local): 1ª tarefa falha (moderação) -> workflow incompleto -> Tentar de novo -> conclui
failFirst = true; assert.equal((await post('/api/providers/video', { allowSpend: true })).status, 200);
for (let i = 0; i < 6; i++) await tick(); J = await jobs(); assert.equal(J[0].state, 'failed'); assert.match(J[0].error, /moderação do provedor/); assert.equal(J[1].state, 'failed'); assert.match(J[1].error, /anterior \(failed\)/);
let ms = await msgs(proj.id, chat.id); assert.match(ms.at(-1).text, /não concluíram.*moderação do provedor/); assert.ok(!(await j('/api/assets?cat=works')).body.some((a) => a.name === 'final.mp4'), 'sem vídeo final quando a geração falhou');
assert.equal((await post(`/api/jobs/${J[0].id}/retry`)).status, 200); assert.equal((await post(`/api/jobs/${J[1].id}/retry`)).status, 200);
for (let i = 0; i < 12; i++) { await tick(); await new Promise((r) => setTimeout(r, 150)); if ((await jobs()).every((x) => x.state === 'succeeded')) break; }
J = await jobs(); assert.deepEqual(J.map((x) => x.state), ['succeeded', 'succeeded']); assert.equal(J[1].usedReference, true, '2º segmento usa o último quadro do 1º como referência'); assert.ok(posts().at(-1).body.toString('latin1').includes('input_reference'));
// 5) composição automática: clipes reais -> editor -> exportação
for (let i = 0; i < 40; i++) { ms = await msgs(proj.id, chat.id); if (/Vídeo final composto/.test(ms.at(-1).text)) break; await new Promise((r) => setTimeout(r, 250)); }
last = ms.at(-1); assert.match(last.text, /Vídeo final composto a partir de 2 vídeo\(s\) gerados pelo provedor/); assert.ok(last.editorId); assert.ok(last.artifacts?.[0]?.assetId);
const works = (await j('/api/assets?cat=works')).body; const fin = works.find((a) => a.name === 'final.mp4'); assert.ok(fin, 'final.mp4 exportado'); assert.ok(Math.abs(fin.duration - 4) < 0.6, 'duração ≈ soma dos clipes (2 × 2 s): ' + fin.duration);
const ed = (await j(`/api/projects/${last.editorId}`)).body; assert.equal(ed.type, 'editor'); assert.equal(ed.timeline.clips.length, 2); assert.deepEqual(ed.timeline.captions.map((c) => c.text), ['Era uma vez uma maçã', 'Ela viajou pelo mundo'], 'legendas = falas do storyboard'); assert.ok(ed.timeline.captions[1].start >= 1.5, 'legenda 2 começa depois do clipe 1'); if (media.ttsAvailable()) assert.equal(ed.timeline.audio.length, 2, 'narração local por segmento'); assert.match(last.text, /narração|sem narração/); assert.ok(ed.timeline.clips.every((c) => c.out > 1.5));
assert.ok((await j('/api/notifications')).body.items.some((x) => x.title === 'Workflow concluído'));
// 6) persistência em disco
const disk = JSON.parse(fs.readFileSync(path.join(tmp, 'db.json'), 'utf8')); assert.equal(disk.jobs.length, 2); assert.ok(disk.jobs.every((x) => x.state === 'succeeded' && x.assetId)); assert.ok(disk.assets.some((a) => a.name === 'final.mp4')); assert.ok(disk.projects.some((p) => p.id === last.editorId)); assert.ok(!JSON.stringify(disk.jobs).includes('SEGREDO'), 'chave não vai para as tarefas');
// 7) tarefas na UI de dados: cancelar tarefa nova
await post('/api/providers/video', { allowSpend: false }); const extra = (await post(`/api/projects/${proj.id}/chats`)).body; assert.ok(extra.id);
console.log('OK workflow_jobs: bloqueios (sem provedor/sem autorização), chave mascarada, sequência com referência, falha+retry, composição (editor+exportação), persistência — provedor local de mentira, NÃO é geração real');
mock.closeAllConnections?.(); mock.close(); llm.closeAllConnections?.(); llm.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
