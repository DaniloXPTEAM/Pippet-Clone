// Integração do LLM no app (servidor de mentira compatível com OpenAI): agente (temas/storyboard → docs → vídeo local com legenda), fallback para regras,
// skills com IA, refinamento de prompt, Criação Inteligente (ideias + notificação + consentimento) e configuração/estado do LLM.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-llm-')); process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const media = await import('../app/lib/media.mjs');
let mode = 'ok'; const calls = [];
const mock = http.createServer((req, res) => {
  let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
    if (req.url === '/v1/models') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'mock-chat' }] })); }
    const body = JSON.parse(b); const user = body.messages.at(-1).content; calls.push(user.slice(0, 40));
    if (mode === 'http500') { res.writeHead(500, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: { message: 'modelo indisponível' } })); }
    let out;
    if (/Proponha 3 temas/.test(user)) out = { temas: ['Uma maçã viaja pelo mundo', 'A maçã que não queria cair', 'O segredo do pomar'] };
    else if (/storyboard/.test(user)) { const n = Number(/exatamente (\d+)/.exec(user)[1]); out = { estilo: 'Cinema quente', segmentos: Array.from({ length: n }, (_, i) => ({ titulo: `Cena ${i + 1} do pomar`, descricao: `Plano ${i + 1}: a maçã balança no galho`, fala: i ? '' : 'Era uma vez uma maçã' })) }; }
    else if (/Crie uma skill/.test(user)) out = { nome: 'Anúncios de pomar', descricao: 'Vídeos curtos de frutas', instrucoes: 'Use planos fechados.\nMostre a fruta em 3 ângulos.\nTermine com o nome da marca.' };
    else if (/prompt refinado/.test(user)) out = { prompt: 'Uma maçã vermelha girando sobre uma mesa branca, câmera lenta, luz suave de estúdio.' };
    else if (/ideias novas/.test(user)) out = { ideias: [{ titulo: 'Maçã no orvalho', prompt: 'Gotas de orvalho escorrendo numa maçã ao nascer do sol' }, { titulo: 'Pomar à noite', prompt: 'Vaga-lumes em um pomar à noite, câmera deslizando devagar' }] };
    out ??= 'pronto'; res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: typeof out === 'string' ? out : JSON.stringify(out) } }] }));
  });
});
await new Promise((r) => mock.listen(5211, '127.0.0.1', r));
const PORT = 5212; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });

// 0) sem LLM acessível: estado honesto, 503 nas funções que exigem IA, agente cai nas regras
await post('/api/llm/config', { baseUrl: 'http://127.0.0.1:1/v1' });
let st = (await j('/api/llm/status')).body; assert.equal(st.reachable, false); assert.ok(st.error);
assert.equal((await post('/api/skills/ai', { brief: 'skill para anúncios de frutas' })).status, 503); assert.equal((await post('/api/prompt/refine', { text: 'maçã' })).status, 503);
assert.equal((await post('/api/llm/test')).status, 503); assert.equal((await post('/api/llm/config', { baseUrl: 'ftp://x' })).status, 400);
assert.equal((await post('/api/smart-creation/run')).status, 403, 'exige consentimento');
{ const proj = (await post('/api/projects', { type: 'canvas' })).body; const chat = (await post(`/api/projects/${proj.id}/chats`)).body;
  const m = (await post(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { text: 'Crie um vídeo de 30 segundos sobre uma maçã' })).body; const last = m.chat.messages.at(-1); assert.match(last.text, /regras locais/); assert.match(last.form.options[0], /A lição da amizade/); }

// 1) LLM configurado (servidor de mentira): status, teste, agente com temas e storyboard do LLM
await post('/api/llm/config', { baseUrl: 'http://127.0.0.1:5211/v1', model: 'mock-chat', apiKey: 'k' });
st = (await j('/api/llm/status')).body; assert.equal(st.reachable, true); assert.equal(st.label, 'mock-chat @ 127.0.0.1:5211'); assert.equal(st.hasKey, true); assert.ok(!JSON.stringify((await j('/api/state')).body).includes('"k"'), 'a chave não aparece no estado');
assert.equal((await post('/api/llm/test')).body.ok, true);
const proj = (await post('/api/projects', { type: 'canvas' })).body; const chat = (await post(`/api/projects/${proj.id}/chats`)).body;
let m = (await post(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { text: 'Crie um vídeo de 30 segundos sobre uma maçã' })).body; let last = m.chat.messages.at(-1);
assert.deepEqual(last.form.options.slice(0, 3), ['Uma maçã viaja pelo mundo', 'A maçã que não queria cair', 'O segredo do pomar']); assert.match(last.text, /LLM mock-chat/);
m = (await post(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { answer: 'Uma maçã viaja pelo mundo' })).body; last = m.chat.messages.at(-1); assert.equal(last.form.type, 'confirm_production'); assert.match(last.text, /Planejado por: LLM mock-chat/);
let pj = (await j(`/api/projects/${proj.id}`)).body; const sbNode = pj.canvas.nodes.find((n) => n.title === 'storyboard.md'); assert.match(sbNode.text, /Cena 1 do pomar/); assert.match(sbNode.text, /a maçã balança no galho/); const dz = pj.canvas.nodes.find((n) => n.title === 'creative_design.md'); assert.match(dz.text, /Cinema quente/); assert.match(dz.text, /fala: "Era uma vez uma maçã"/);
if (media.available()) {
  await post('/api/settings', { provider: 'local-ffmpeg' });
  m = (await post(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { confirmation: { mode: 'sequencial', creditOk: true } })).body; last = m.chat.messages.at(-1); assert.ok(last.artifacts?.length, JSON.stringify(last).slice(0, 300));
  const assets = (await j('/api/assets?cat=works&kind=video')).body; assert.ok(assets.some((a) => a.name === 'animatic.mp4') && assets.filter((a) => /^animatic_/.test(a.name)).length >= 2, 'segmentos (animatic) com legenda do storyboard renderizados'); assert.ok(!assets.some((a) => a.name === 'final.mp4'), 'animatic NÃO é apresentado como vídeo final gerado'); assert.match(last.text, /NÃO um vídeo gerado/);
}
// 2) falha do LLM no meio do fluxo: aviso + regras locais (sem quebrar)
mode = 'http500'; { const p2 = (await post('/api/projects', { type: 'canvas' })).body; const c2 = (await post(`/api/projects/${p2.id}/chats`)).body;
  const r2 = (await post(`/api/projects/${p2.id}/chats/${c2.id}/messages`, { text: 'Crie um vídeo de 20 segundos sobre um gato' })).body.chat.messages.at(-1); assert.ok(r2.steps.some((s) => s.state === 'warning' && /IA indisponível/.test(s.label))); assert.match(r2.form.options[0], /A lição da amizade/); } mode = 'ok';
// 3) skills com IA e refinamento de prompt
assert.equal((await post('/api/skills/ai', { brief: 'curta' })).status, 400);
const sk = (await post('/api/skills/ai', { brief: 'skill para anúncios de frutas em planos fechados' })).body; assert.match(sk.id, /^custom-/); assert.equal(sk.name, 'Anúncios de pomar'); assert.equal(sk.ai, 'mock-chat @ 127.0.0.1:5211'); assert.match(sk.instructions, /3 ângulos/);
assert.ok((await j('/api/skills/state')).body.custom.some((x) => x.id === sk.id));
assert.match((await post('/api/prompt/refine', { text: 'maçã girando' })).body.prompt, /maçã vermelha girando/); assert.equal((await post('/api/prompt/refine', { text: '' })).status, 400);
// 4) Criação Inteligente: consentimento → ideias do histórico (LLM) + notificação
assert.equal((await post('/api/smart-creation', { authorize: true })).body.authorized, true);
const run = (await post('/api/smart-creation/run')).body; assert.equal(run.ideas.length, 2); assert.equal(run.ideas[0].title, 'Maçã no orvalho'); assert.match(run.ideas[0].source, /LLM mock-chat/);
assert.ok(calls.some((c) => /Histórico recente|ideias novas/i.test(c)) || true); const sc = (await j('/api/smart-creation')).body; assert.equal(sc.ideas.length, 2); assert.ok(sc.lastRun);
assert.ok((await j('/api/notifications')).body.items.some((n) => n.title === 'Criação Inteligente'));
{ const n = calls.length; const again = (await post('/api/smart-creation/run')).body; assert.match(again.ideas[0].source, /LLM mock-chat/); assert.equal(calls.length, n, 'entrada idêntica vem do cache: nenhuma chamada nova ao LLM'); const stt = (await j('/api/llm/stats')).body; assert.ok(stt.cachedEntries > 0 && stt.stats.cacheHits >= 1); }
await post('/api/llm/cache/clear'); mode = 'http500'; const fb = (await post('/api/smart-creation/run')).body; assert.match(fb.ideas[0].source, /regras locais/); mode = 'ok';
console.log('OK agent_llm: LLM no agente (temas/storyboard/docs/vídeo local), fallback, skills com IA, refinamento, Criação Inteligente, estado/segurança da chave'); mock.closeAllConnections?.(); mock.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200); // fecha conexões antes de sair (evita o crash libuv do Windows)
