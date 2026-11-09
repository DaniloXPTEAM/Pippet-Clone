// A skill escolhida pelo usuário (do usuário ou nativa) chega ao planejamento do agente: instruções do SKILL.md entram nos prompts de temas e storyboard do LLM;
// skill apenas sugerida automaticamente NÃO é injetada; sem LLM não muda nada; o texto do pedido não é poluído. LLM de mentira local registra os prompts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-sk-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const prompts = []; const llm = http.createServer((req, res) => { const ch = []; req.on('data', (d) => ch.push(d)); req.on('end', () => { const json = (o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); }; if (req.url === '/v1/models') return json({ data: [{ id: 'mock-chat' }] });
  const u = JSON.parse(Buffer.concat(ch).toString()).messages.at(-1).content; prompts.push(u); json({ choices: [{ message: { content: JSON.stringify(/3 temas/.test(u) ? { temas: ['Tema A', 'Tema B', 'Tema C'] } : { estilo: 'x', segmentos: [{ titulo: 'Um', descricao: 'descrição um', fala: 'fala um' }] }) } }] }); }); });
await new Promise((r) => llm.listen(5244, '127.0.0.1', r));
const { server } = await import('../app/server.mjs'); const PORT = 5198; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
assert.equal((await post('/api/llm/config', { baseUrl: 'http://127.0.0.1:5244/v1', model: 'mock-chat' })).status, 200);
const sk = await post('/api/skills/custom', { name: 'Tom de cordel', description: 'rimas nordestinas', content: 'Escreva as falas em rimas de cordel e termine com um verso de despedida.' }); assert.equal(sk.status, 200, JSON.stringify(sk.body));
async function run(text, skillId) { const proj = (await post('/api/projects', { type: 'canvas' })).body; const chat = (await post(`/api/projects/${proj.id}/chats`)).body; const M = `/api/projects/${proj.id}/chats/${chat.id}/messages`; prompts.length = 0;
  let m = (await post(M, { text, ...(skillId ? { skillId } : {}) })).body; if (m.chat.messages.at(-1).form?.type === 'skill_inputs') m = (await post(M, { text: 'continuar assim mesmo' })).body; /* skills oficiais pedem entradas antes de planejar */ const s1 = prompts.slice(); const m2 = (await post(M, { answer: m.chat.messages.at(-1).form.options[0] })).body; return { m, s1, s2: prompts.slice(s1.length), m2, msgs: m.chat.messages }; }
// 1) skill do usuário escolhida: instruções entram nos dois prompts; o texto do usuário fica limpo
const a = await run('Crie um vídeo de 10 segundos sobre um gato curioso', sk.body.id); assert.ok(a.s1[0].includes('Tom de cordel') && a.s1[0].includes('rimas de cordel'), 'temas recebem a skill'); assert.ok(a.s2.some((p) => p.includes('rimas de cordel') && /storyboard|segmentos/i.test(p)), 'storyboard recebe a skill');
assert.equal(a.msgs[0].text, 'Crie um vídeo de 10 segundos sobre um gato curioso', 'pedido do usuário sem instruções coladas'); assert.ok(a.m.chat.messages.at(-1).steps.some((s) => s.label === 'Habilidades carregadas' && s.skillName === 'Tom de cordel' && s.chosenByUser));
// 2) sem escolha explícita: a skill sugerida automaticamente NÃO é injetada (nada de falso "seguiu a skill")
const b = await run('Crie um vídeo de 10 segundos sobre um gato curioso'); assert.ok(!b.s1[0].includes('Habilidade escolhida') && !b.s2.some((p) => p.includes('Habilidade escolhida')));
// 3) skill nativa escolhida: só a descrição pública (instruções internas desconhecidas) e identificada como tal na etapa
const c = await run('Crie um vídeo de 10 segundos sobre um gato curioso', 'anuncios-de-drama'); assert.ok(c.s1[0].includes('Anúncios de drama') && /mini-drama/.test(c.s1[0]));
// 4) id inexistente não quebra o fluxo
const d = await run('Crie um vídeo de 10 segundos sobre um cachorro corajoso', 'nao-existe'); assert.ok(d.m.chat.messages.at(-1).form.options.length >= 3); assert.ok(!d.s1[0].includes('Habilidade escolhida'));
console.log('OK agent_skill: skill escolhida (usuário/nativa) alimenta temas e storyboard do LLM; sugestão automática não é injetada; pedido limpo; id inválido tolerado'); llm.closeAllConnections?.(); llm.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
