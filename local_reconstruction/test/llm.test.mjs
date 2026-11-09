// Cliente de LLM (API compatível com OpenAI) contra um servidor de mentira: parsing de JSON, planejadores, erros e timeout. O teste com o LLM real (Ollama) é opcional (llm_live.test.mjs).
import assert from 'node:assert/strict';
import http from 'node:http';
import { LLM, parseJson, llmThemeOptions, llmStoryboard, llmCreateSkill, llmRefinePrompt, llmSmartIdeas } from '../src/llm.mjs';

assert.deepEqual(parseJson('<think>raciocinando { }</think>\n```json\n{"a":[1,2,{"b":"x}y"}]}\n``` fim'), { a: [1, 2, { b: 'x}y' }] });
assert.deepEqual(parseJson('texto [1,2] resto'), [1, 2]); assert.throws(() => parseJson('sem json'), /sem JSON/); assert.throws(() => parseJson('{"a": '), /incompleto/);

const seen = []; let mode = 'ok';
const server = http.createServer((req, res) => {
  let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
    if (req.url === '/v1/models') { res.writeHead(404); return res.end('{}'); }
    if (req.url === '/api/tags') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ models: [{ name: 'm1' }, { name: 'm2' }] })); }
    const body = JSON.parse(b); seen.push({ auth: req.headers.authorization, body });
    if (mode === 'slow') return; // nunca responde
    if (mode === 'http500') { res.writeHead(500, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: { message: 'falhou' } })); }
    const user = body.messages.at(-1).content; let out;
    if (/Proponha 3 temas/.test(user)) out = { temas: ['A', 'B', 'C', 'D'] };
    else if (/storyboard/.test(user)) { const n = Number(/exatamente (\d+)/.exec(user)[1]); out = { estilo: 'cinema', segmentos: Array.from({ length: mode === 'short' ? n - 1 : n }, (_, i) => ({ titulo: `T${i}`, descricao: `D${i}`, fala: i ? '' : 'Olá' })) }; }
    else if (/Crie uma skill/.test(user)) out = { nome: 'Skill X', descricao: 'd', instrucoes: 'faça A\nfaça B' };
    else if (/prompt refinado/.test(user)) out = { prompt: 'Uma maçã vermelha girando sobre uma mesa branca, câmera lenta, luz suave.' };
    else if (/ideias novas/.test(user)) out = { ideias: [{ titulo: 'I1', prompt: 'Uma xícara de café fumegando numa manhã chuvosa' }, { titulo: 'curto', prompt: 'x' }] };
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: '<think>ok</think>' + JSON.stringify(out) } }] }));
  });
});
await new Promise((r) => server.listen(5210, '127.0.0.1', r)); const base = 'http://127.0.0.1:5210/v1';
const llm = new LLM({ baseUrl: base, model: 'mock', apiKey: 'segredo' });
assert.equal(llm.label, 'mock @ 127.0.0.1:5210'); assert.throws(() => new LLM({ baseUrl: base }), /modelo/);
assert.deepEqual(await llm.models(), ['m1', 'm2']); // fallback /api/tags
assert.deepEqual(await llmThemeOptions(llm, 'um vídeo sobre uma maçã'), ['A', 'B', 'C']);
assert.equal(seen[0].auth, 'Bearer segredo'); assert.match(seen[0].body.messages[0].content, /^\/no_think /); assert.equal(seen[0].body.response_format.type, 'json_object'); assert.equal(seen[0].body.stream, false);
const sb = await llmStoryboard(llm, { theme: 'T', request: 'r', segs: [{ seconds: 15 }, { seconds: 10 }] }); assert.equal(sb.estilo, 'cinema'); assert.equal(sb.segmentos.length, 2); assert.equal(sb.segmentos[0].fala, 'Olá');
mode = 'short'; await assert.rejects(llmStoryboard(llm, { theme: 'T', request: 'r', segs: [{ seconds: 5 }, { seconds: 5 }] }), /esperado 2/); mode = 'ok';
assert.deepEqual(await llmCreateSkill(llm, 'skill para anúncios'), { name: 'Skill X', description: 'd', instructions: 'faça A\nfaça B' });
assert.match(await llmRefinePrompt(llm, 'maçã'), /maçã vermelha/); const ideas = await llmSmartIdeas(llm, ['pedido 1']); assert.equal(ideas.length, 1); assert.equal(ideas[0].title, 'I1');
mode = 'http500'; await assert.rejects(llm.chat([{ role: 'user', content: 'x' }]), /HTTP 500.*falhou/);
mode = 'slow'; await assert.rejects(new LLM({ baseUrl: base, model: 'mock', timeoutMs: 300 }).chat([{ role: 'user', content: 'x' }]), /excedeu/);
await assert.rejects(new LLM({ baseUrl: 'http://127.0.0.1:1/v1', model: 'm' }).chat([{ role: 'user', content: 'x' }]));
console.log('OK llm: parseJson, planejadores (temas/storyboard/skill/prompt/ideias), erros HTTP/timeout/conexão'); server.close(); process.exit(0);
