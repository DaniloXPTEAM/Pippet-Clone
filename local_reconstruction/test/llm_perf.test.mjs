// Caminho nativo do Ollama (/api/chat com think:false, format, keep_alive, options), cache por entrada, deduplicação, estatísticas por etapa e warmup,
// contra um servidor de mentira com o MESMO formato de resposta do Ollama (campos *_duration em nanossegundos).
import assert from 'node:assert/strict';
import http from 'node:http';
import { LLM } from '../src/llm.mjs';

const seen = []; let delayMs = 0;
const mock = http.createServer((req, res) => {
  const chunks = []; req.on('data', (d) => chunks.push(d)); req.on('end', () => {
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null; seen.push({ m: req.method, p: req.url, body });
    const json = (o, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.url === '/api/chat') return setTimeout(() => json({ model: body.model, message: { role: 'assistant', content: '{"ok":true}' }, done: true, load_duration: 2e9, prompt_eval_count: 160, prompt_eval_duration: 0.35e9, eval_count: 40, eval_duration: 10e9 }), delayMs);
    if (req.url === '/api/generate') return json({ model: body.model, response: '', done: true });
    if (req.url === '/v1/chat/completions') return json({ choices: [{ message: { content: '{"via":"openai"}' } }] });
    json({ error: 'rota inesperada' }, 404);
  });
});
await new Promise((r) => mock.listen(5231, '127.0.0.1', r));
const mem = new Map(); const cache = { get: (k) => mem.get(k), set: (k, v) => mem.set(k, v) };
const msgs = [{ role: 'system', content: 'Responda JSON.' }, { role: 'user', content: 'oi' }];

// detecção do caminho: porta 11434 = Ollama (nativo); outras = OpenAI-compatível; explícito vence
assert.equal(new LLM({ baseUrl: 'http://127.0.0.1:11434/v1', model: 'm' }).native, true); assert.equal(new LLM({ baseUrl: 'http://127.0.0.1:5231/v1', model: 'm' }).native, false); assert.equal(new LLM({ baseUrl: 'http://127.0.0.1:5231/v1', model: 'm', native: true }).native, true);

// caminho nativo: corpo da requisição, estatísticas por etapa
const L = new LLM({ baseUrl: 'http://127.0.0.1:5231/v1', model: 'qwen3-local', native: true, keepAlive: '45m', options: { num_gpu: 0, num_thread: 8 }, cache });
assert.equal(await L.chat(msgs, { json: true, maxTokens: 123, temperature: 0.2 }), '{"ok":true}'); const req = seen.at(-1);
assert.equal(req.p, '/api/chat'); assert.equal(req.body.think, false); assert.equal(req.body.format, 'json'); assert.equal(req.body.keep_alive, '45m'); assert.equal(req.body.stream, false);
assert.deepEqual(req.body.options, { num_predict: 123, temperature: 0.2, num_gpu: 0, num_thread: 8 }); assert.equal(req.body.messages[0].content, 'Responda JSON.', 'sem prefixo /no_think no caminho nativo (think:false)');
assert.deepEqual({ ...L.stats.last, ms: 0 }, { path: 'ollama-native', ms: 0, loadMs: 2000, promptTokens: 160, promptMs: 350, genTokens: 40, genMs: 10000 }); assert.equal(L.stats.calls, 1);
// cache: mesma entrada não chama o modelo de novo; fresh ignora; entrada diferente chama
assert.equal(await L.chat(msgs, { json: true, maxTokens: 123, temperature: 0.2 }), '{"ok":true}'); assert.equal(seen.filter((x) => x.p === '/api/chat').length, 1); assert.equal(L.stats.cacheHits, 1);
await L.chat(msgs, { json: true, maxTokens: 123, temperature: 0.2, fresh: true }); assert.equal(seen.filter((x) => x.p === '/api/chat').length, 2, 'fresh ignora o cache');
await L.chat([...msgs, { role: 'user', content: 'outra' }], { json: true }); assert.equal(seen.filter((x) => x.p === '/api/chat').length, 3);
// opções de modelo fazem parte da chave (mudar num_thread invalida o cache)
const L2 = new LLM({ baseUrl: 'http://127.0.0.1:5231/v1', model: 'qwen3-local', native: true, options: { num_thread: 4 }, cache }); await L2.chat(msgs, { json: true, maxTokens: 123, temperature: 0.2 }); assert.equal(seen.filter((x) => x.p === '/api/chat').length, 4);
// deduplicação de chamadas idênticas simultâneas
delayMs = 150; const n0 = seen.filter((x) => x.p === '/api/chat').length; const L3 = new LLM({ baseUrl: 'http://127.0.0.1:5231/v1', model: 'qwen3-local', native: true });
const [a, b, c] = await Promise.all([1, 2, 3].map(() => L3.chat(msgs, { json: true }))); assert.equal(a, b); assert.equal(b, c); assert.equal(seen.filter((x) => x.p === '/api/chat').length - n0, 1); assert.equal(L3.stats.deduped, 2); delayMs = 0;
// warmup carrega o modelo sem gerar texto
assert.equal(await L.warmup(), true); const w = seen.at(-1); assert.equal(w.p, '/api/generate'); assert.deepEqual(w.body, { model: 'qwen3-local', keep_alive: '45m' });
// json() usa format:json e parseia
assert.deepEqual(await L.json(msgs, { maxTokens: 50 }), { ok: true });
// caminho OpenAI-compatível preservado (com /no_think e sem cache quando não há cache)
const O = new LLM({ baseUrl: 'http://127.0.0.1:5231/v1', model: 'x', native: false }); assert.deepEqual(await O.json(msgs), { via: 'openai' }); assert.equal(seen.at(-1).p, '/v1/chat/completions'); assert.equal(await O.warmup(), false);
assert.match(seen.at(-1).body.messages[0].content, /^\/no_think /); assert.equal(seen.at(-1).body.response_format.type, 'json_object');
// erro HTTP conta como erro e não entra no cache
mem.clear(); const E = new LLM({ baseUrl: 'http://127.0.0.1:5231/v1', model: 'x', native: true, cache, fetchImpl: async () => new Response(JSON.stringify({ error: 'modelo não encontrado' }), { status: 404 }) });
await assert.rejects(E.chat(msgs), /HTTP 404.*modelo não encontrado/); assert.equal(E.stats.errors, 1); assert.equal(mem.size, 0);
console.log('OK llm_perf: caminho nativo (think:false/format/keep_alive/options), estatísticas por etapa, cache, fresh, deduplicação, warmup, caminho OpenAI preservado'); mock.close(); process.exit(0);
