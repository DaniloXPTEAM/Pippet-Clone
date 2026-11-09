// Skills oficiais do Pippit com dados REAIS do servidor (REA 6.7.0: official_skills.json) + definições locais (skilldefs.mjs): catálogo enriquecido, conferência de entradas
// ("pergunta antes de produzir"), planejamento próprio por skill no LLM, saídas especiais (folha 3 vistas, só análise, criar skill, avatar) e documentos. Nada é gerado.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-so-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const media = await import('../app/lib/media.mjs'); const prompts = [];
const llm = http.createServer((req, res) => { const ch = []; req.on('data', (d) => ch.push(d)); req.on('end', () => { const json = (o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); }; if (req.url === '/v1/models') return json({ data: [{ id: 'mock-chat' }] });
  const u = JSON.parse(Buffer.concat(ch).toString()).messages.at(-1).content; prompts.push(u); json({ choices: [{ message: { content: JSON.stringify(/3 temas/.test(u) ? { temas: ['Tema A', 'Tema B', 'Tema C'] } : { estilo: 'x', segmentos: [{ titulo: 'Um', descricao: 'cena um', fala: 'fala um' }] }) } }] }); }); });
await new Promise((r) => llm.listen(5245, '127.0.0.1', r));
const { server } = await import('../app/server.mjs'); const PORT = 5205; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; }; const post = (p, b) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
assert.equal((await post('/api/llm/config', { baseUrl: 'http://127.0.0.1:5245/v1', model: 'mock-chat' })).status, 200);
const pngFile = path.join(tmp, 'p.png'); assert.equal(spawnSync(media.FFMPEG, ['-y', '-f', 'lavfi', '-i', 'color=c=red:s=256x256:d=1', '-frames:v', '1', pngFile]).status, 0);
const img = (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': 'produto.png', 'content-type': 'image/png' }, body: fs.readFileSync(pngFile) })).body;

// ---- catálogo enriquecido com dados observados do servidor
const cat = (await j('/api/catalog')).body; const S = Object.fromEntries(cat.skills.map((s) => [s.id, s])); assert.equal(cat.skills.length, 13);
assert.ok(cat.skills.every((s) => s.officialSkillName && Number.isInteger(s.contentVersion)), 'todas as 13 trazem skill_name e versão do servidor');
assert.equal(S['anuncios-de-drama'].officialSkillName, 'storyline-advertisement'); assert.equal(S['anuncios-de-drama'].tag, 'Marketing Publicidade'); assert.deepEqual(S['replicacao-viral'].tags, ['Drama curto', 'Marketing Publicidade', 'Cinema e televisão profissionais']);
assert.match(S['anuncios-de-drama'].guideWords, /Pick a genre/); assert.deepEqual(S['anuncios-de-drama'].defaultModels, { video: 'Seedance_2.5', imagem: 'gpt_image_2' }); assert.ok(S['replicacao-viral'].tools.includes('pippit_video_tool_imitation_plan_sandbox')); assert.equal(S['video-de-marketing'].tools, null);
assert.equal(S['geracao-em-lote'].guideKind, 'prefill'); assert.match(S['url-do-video'].guideWords, /\[Paste URL\]/); assert.equal(S['foto-falante-de-ia'].guideWords, '');
assert.equal(Object.keys(cat.skillDefs).length, 13); assert.ok(cat.skillDefs['anuncios-de-drama'].params.some((x) => x.id === 'genero' && x.required)); assert.equal(cat.skillDefs['video-de-marketing'].approval, 'storyboard-e-prompts');

async function chatOf(skillId) { const proj = (await post('/api/projects', { type: 'canvas' })).body; const chat = (await post(`/api/projects/${proj.id}/chats`)).body; const M = `/api/projects/${proj.id}/chats/${chat.id}/messages`; const get = async () => (await j(`/api/projects/${proj.id}`)).body; return { proj, M, get, send: async (b) => (await post(M, b)).body.chat.messages.at(-1), skillId }; }
const docs = async (c) => { const p = await c.get(); return Object.fromEntries(p.canvas.nodes.filter((n) => n.title).map((n) => [n.title, n])); };

// ---- Drama Ads: pergunta antes de produzir; "continuar assim mesmo" segue; entradas completas seguem direto
let c = await chatOf('anuncios-de-drama'); let m = await c.send({ text: 'Quero um anúncio', skillId: 'anuncios-de-drama' }); assert.equal(m.form.type, 'skill_inputs'); assert.deepEqual(m.form.missing.map((x) => x.id), ['produto', 'imagem_produto', 'genero', 'proporcao']); assert.ok(m.steps.some((s) => s.label === 'Entradas da skill conferidas' && s.state === 'warning'));
assert.ok(!prompts.some((x) => /3 temas/.test(x)), 'nenhuma chamada ao LLM antes de ter as entradas');
m = await c.send({ text: 'continuar assim mesmo' }); assert.equal(m.form.type, 'question', 'segue para a escolha de tema'); assert.ok(prompts.at(-1).includes('gancho nos 2 primeiros segundos'), 'a instrução de planejamento da skill entra no prompt do LLM');
c = await chatOf(); prompts.length = 0; m = await c.send({ text: 'Anúncio do tênis AirX: leve, confortável e durável. Gênero: vingança. Formato 9:16', skillId: 'anuncios-de-drama', attachments: [img.id] }); assert.equal(m.form.type, 'question', 'entradas completas: não pergunta de novo'); assert.ok(m.steps.some((s) => s.label === 'Entradas da skill conferidas' && s.state === 'completed'));
m = await c.send({ answer: m.form.options[0] }); assert.equal(m.form.type, 'confirm_production'); const d1 = await docs(c); assert.match(d1['creative_design.md'].text, /## Habilidade\n- Anúncios de drama\n- Aprovação: storyboard\n- Etapas: Conferir entradas/); assert.ok(prompts.some((x) => /gancho nos 2 primeiros segundos/.test(x) && /storyboard|segmentos/i.test(x)));
// resposta parcial pede só o que ainda falta
c = await chatOf(); m = await c.send({ text: 'Vídeo para o produto Cadeira Zen com ótimo conforto e suporte lombar', skillId: 'creator-commerce' }); assert.deepEqual(m.form.missing.map((x) => x.id), ['foto']); m = await c.send({ text: 'Segue a foto', attachments: [img.id] }); assert.equal(m.form.type, 'question');
// aprovação com prompts exatos (Marketing Video)
c = await chatOf(); m = await c.send({ text: 'Produto: fone sem fio X1, bateria de 40 h, cancelamento de ruído, preço acessível, para viajantes', skillId: 'video-de-marketing', attachments: [img.id] }); m = await c.send({ answer: m.form.options[0] }); assert.match(m.text, /revise o storyboard e os prompts exatos em generation_prompts\.md/);
// sem escolha explícita (skill sugerida automaticamente): sem conferência de entradas
c = await chatOf(); m = await c.send({ text: 'Crie um vídeo de 10 segundos sobre um gato' }); assert.equal(m.form.type, 'question'); assert.ok(!m.steps.some((s) => s.label === 'Entradas da skill conferidas'));

// ---- saídas especiais
c = await chatOf(); m = await c.send({ text: 'Personagem: uma guerreira anã de cabelo ruivo trançado, armadura de couro, braço direito mecânico', skillId: 'renderizacao-3-visualizacoes' }); assert.ok(!m.form, 'sem pergunta de tema/vídeo'); assert.match(m.text, /NADA foi gerado/);
const d3 = await docs(c); assert.match(d3['character_sheet.md'].text, /16:9[\s\S]*rosto[\s\S]*frontal, lateral e costas/); const node = d3['folha_3_vistas']; assert.equal(node.type, 'Imagem'); assert.match(node.panel.prompt, /guerreira anã/); assert.equal((await j('/api/jobs')).body.length, 0, 'nenhuma tarefa de geração criada');
c = await chatOf(); m = await c.send({ text: 'Refazer este vídeo https://exemplo.com/v/123 mesmo estilo, mas só análise do gancho', skillId: 'replicacao-viral' }); assert.match(m.text, /Modo só análise/); assert.ok((await docs(c))['analise_referencia.md']); assert.equal((await j('/api/jobs')).body.length, 0);
c = await chatOf(); m = await c.send({ text: 'Quero criar uma skill de anúncios', skillId: 'criar-habilidades' }); assert.equal(m.link, '#/skills'); assert.match(m.text, /Criar com IA/);
c = await chatOf(); m = await c.send({ text: 'Faça um vídeo de avatar', skillId: 'video-de-avatar' }); assert.equal(m.link, '#/avatars'); assert.match(m.text, /Nada foi gerado/);
// persistência da definição escolhida no estado do chat
const chat = (await c.get()).chats[0]; assert.equal(chat.state.skill, 'video-de-avatar'); assert.equal(chat.state.skillChosen, true);
console.log('OK skills_official: catálogo com dados do servidor (13), entradas por skill (pergunta/continua/parcial), planejamento próprio no LLM, aprovação de prompts, folha 3 vistas, só análise, criar skill e avatar; nada gerado');
llm.closeAllConnections?.(); llm.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
