// Roteador gratuito contra servidores falsos: 404 "Function not found" e 410 trocam só o modelo;
// 401 (ACCESS_TOKEN_TYPE_UNSUPPORTED), 429 e timeout tiram o provedor de rotação e o próximo assume.
// Nenhuma rede externa: todo tráfego vai para 127.0.0.1.
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  createFreeRouterAdapters, executeFreeRoutes, classifyFreeRouterError, markUnavailable, availabilityOf,
  clearAvailability, availabilitySnapshot, defaultModelCandidates, FREE_PROVIDER_DEFAULTS, GEMINI_AUTH_MODES,
  isValidGeminiKeyShape,
} from '../src/free_router.mjs';

const calls = [];
let geminiStatus = 401; let geminiBody = { error: { code: 401, message: 'ACCESS_TOKEN_TYPE_UNSUPPORTED' } };
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const url = new URL(req.url, 'http://127.0.0.1'); const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    calls.push({ path: url.pathname, query: url.search, auth: req.headers.authorization || null, googleKey: req.headers['x-goog-api-key'] || null, model: body.model || null, body });
    if (url.pathname === '/nim/v1/chat/completions') {
      if (body.model === 'google/gemma-4-31b-it') return json(res, 404, { detail: 'Function not found: google/gemma-4-31b-it' });
      if (body.model === 'minimaxai/minimax-m3.1-flash') return json(res, 200, { choices: [{ message: { content: 'reserva NIM ok' } }] });
      return json(res, 410, { detail: 'model gone' });
    }
    if (url.pathname.startsWith('/gemini/v1beta/models/')) {
      if (geminiStatus !== 200) return json(res, geminiStatus, geminiBody);
      return json(res, 200, { candidates: [{ content: { parts: [{ text: 'gemini nativo ok' }] } }] });
    }
    if (url.pathname === '/gemini-openai/v1beta/openai/chat/completions') return json(res, 200, { choices: [{ message: { content: 'gemini openai-compat ok' } }] });
    if (url.pathname === '/ollama/api/chat') return json(res, 200, { message: { role: 'assistant', content: 'ollama nativo ok' } });
    if (url.pathname === '/ollama-v1/v1/chat/completions') return json(res, 200, { choices: [{ message: { content: 'ollama v1 ok' } }] });
    if (url.pathname === '/cloud/api/chat') { if (req.headers.authorization !== 'Bearer cloud-key') return json(res, 401, { error: 'unauthorized' }); return json(res, 200, { message: { content: 'ollama cloud ok' } }); }
    if (url.pathname === '/quota/v1/chat/completions') return json(res, 429, { error: 'quota exceeded' });
    if (url.pathname === '/slow/v1/chat/completions') return; // nunca responde: o timeout do roteador decide
    if (url.pathname === '/broken/v1/chat/completions') return json(res, 500, { error: 'boom' });
    return json(res, 404, { error: 'not found' });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = `http://127.0.0.1:${fake.address().port}`;
const route = (over = {}) => ({ ok: true, task: 'text', providerId: 'nvidia-nim', providerName: 'NVIDIA NIM', adapter: 'openai-compatible', locality: 'cloud', modelId: 'google/gemma-4-31b-it', baseUrl: `${root}/nim/v1`, freeTierConfirmed: true, secretEnv: 'NVIDIA_API_KEY', ...over });

try {
  // 1. 404 "Function not found" no modelo padrão: troca para a reserva, sem repetir o modelo morto.
  clearAvailability(); calls.length = 0;
  const nimRoutes = [route(), route({ modelId: 'minimaxai/minimax-m3.1-flash' })];
  const first = await executeFreeRoutes(nimRoutes, { prompt: 'oi' }, { credentials: { NVIDIA_API_KEY: 'nim-key' } });
  assert.equal(first.text, 'reserva NIM ok');
  assert.deepEqual(calls.map((c) => c.model), ['google/gemma-4-31b-it', 'minimaxai/minimax-m3.1-flash']);
  const modelMark = availabilityOf('nvidia-nim', 'google/gemma-4-31b-it');
  assert.equal(modelMark.kind, 'model_unavailable');
  assert.match(modelMark.reason, /404 Function not found/);
  assert.equal(availabilityOf('nvidia-nim'), null, 'o provedor inteiro segue disponível: só o modelo morreu');
  // 2. O cache evita repetir o modelo morto na chamada seguinte.
  calls.length = 0;
  const second = await executeFreeRoutes(nimRoutes, { prompt: 'de novo' }, { credentials: { NVIDIA_API_KEY: 'nim-key' } });
  assert.equal(second.text, 'reserva NIM ok');
  assert.deepEqual(calls.map((c) => c.model), ['minimaxai/minimax-m3.1-flash'], 'modelo marcado não é chamado de novo');

  // 3. 410 é a mesma família: modelo indisponível, sem repetição.
  clearAvailability(); calls.length = 0;
  const gone = await executeFreeRoutes([route({ modelId: 'model-que-sumiu' }), route({ modelId: 'minimaxai/minimax-m3.1-flash' })], { prompt: 'x' }, { credentials: { NVIDIA_API_KEY: 'nim-key' } });
  assert.equal(gone.text, 'reserva NIM ok');
  assert.equal(availabilityOf('nvidia-nim', 'model-que-sumiu').kind, 'model_unavailable');
  assert.match(availabilityOf('nvidia-nim', 'model-que-sumiu').reason, /410/);

  // 4. Gemini 401 ACCESS_TOKEN_TYPE_UNSUPPORTED: marca "tipo de chave não aceito" e o próximo provedor assume.
  clearAvailability(); calls.length = 0;
  const chain = [route({ providerId: 'gemini', providerName: 'Gemini API', adapter: 'gemini', baseUrl: `${root}/gemini/v1beta`, modelId: 'gemini-2.5-flash', secretEnv: 'GEMINI_API_KEY' }), route({ providerId: 'ollama', providerName: 'Ollama', adapter: 'ollama', locality: 'local', baseUrl: `${root}/ollama`, modelId: 'llama3.2:1b', secretEnv: null, freeTierConfirmed: true })];
  const fallback = await executeFreeRoutes(chain, { prompt: 'oi' }, { credentials: { GEMINI_API_KEY: 'AQ.chave-de-autorizacao' } });
  assert.equal(fallback.text, 'ollama nativo ok');
  assert.equal(fallback.route.providerId, 'ollama');
  const geminiMark = availabilityOf('gemini');
  assert.equal(geminiMark.kind, 'auth');
  assert.match(geminiMark.reason, /tipo de chave não aceito/);
  assert.deepEqual(calls.map((c) => c.path), ['/gemini/v1beta/models/gemini-2.5-flash:generateContent', '/ollama/api/chat']);

  // 5. A chave "AQ." não é recusada por prefixo: com 200 o Gemini conclui normalmente.
  clearAvailability(); geminiStatus = 200; calls.length = 0;
  const okKey = await executeFreeRoutes([chain[0]], { prompt: 'oi' }, { credentials: { GEMINI_API_KEY: 'AQ.chave-de-autorizacao' } });
  assert.equal(okKey.text, 'gemini nativo ok');
  assert.equal(calls[0].googleKey, 'AQ.chave-de-autorizacao');
  assert.ok(isValidGeminiKeyShape('AQ.chave-de-autorizacao'));

  // 6. Modos de autenticação configuráveis: ?key= e Bearer; modo inválido falha de forma explícita.
  clearAvailability(); calls.length = 0;
  await executeFreeRoutes([chain[0]], { prompt: 'oi' }, { credentials: { GEMINI_API_KEY: 'AQ.chave' } , adapters: createFreeRouterAdapters() });
  assert.equal(calls[0].googleKey, 'AQ.chave');
  calls.length = 0;
  await executeFreeRoutes([{ ...chain[0], authMode: 'query' }], { prompt: 'oi' }, { credentials: { GEMINI_API_KEY: 'AQ.chave' } });
  assert.match(calls[0].query, /[?&]key=AQ\.chave/);
  calls.length = 0;
  await executeFreeRoutes([{ ...chain[0], authMode: 'bearer' }], { prompt: 'oi' }, { credentials: { GEMINI_API_KEY: 'AQ.chave' } });
  assert.equal(calls[0].auth, 'Bearer AQ.chave');
  await assert.rejects(() => executeFreeRoutes([{ ...chain[0], authMode: 'senha' }], { prompt: 'oi' }, { credentials: { GEMINI_API_KEY: 'AQ.chave' } }), /classify|senha|chave/i);
  assert.deepEqual([...GEMINI_AUTH_MODES], ['x-goog-api-key', 'query', 'bearer']);

  // 7. Rota OpenAI-compatível do Gemini, quando pedida.
  clearAvailability(); calls.length = 0;
  const compat = await executeFreeRoutes([{ ...chain[0], baseUrl: `${root}/gemini-openai/v1beta`, geminiApi: 'openai' }], { prompt: 'oi' }, { credentials: { GEMINI_API_KEY: 'AQ.chave' } });
  assert.equal(compat.text, 'gemini openai-compat ok');
  assert.equal(calls[0].path, '/gemini-openai/v1beta/openai/chat/completions');
  assert.equal(calls[0].auth, 'Bearer AQ.chave');

  // 8. Ollama: local sem chave (/api/chat e /v1/chat/completions) e cloud com OLLAMA_API_KEY; 401 = desabilitado.
  clearAvailability(); calls.length = 0;
  const oNative = await executeFreeRoutes([route({ providerId: 'ollama', providerName: 'Ollama', adapter: 'ollama', locality: 'local', baseUrl: `${root}/ollama`, modelId: 'llama3.2:1b', secretEnv: null, freeTierConfirmed: true })], { prompt: 'oi' }, {});
  assert.equal(oNative.text, 'ollama nativo ok'); assert.equal(oNative.api, '/api/chat');
  calls.length = 0;
  const oV1 = await executeFreeRoutes([route({ providerId: 'ollama', providerName: 'Ollama', adapter: 'ollama', locality: 'local', baseUrl: `${root}/ollama-v1/v1`, modelId: 'llama3.2:1b', secretEnv: null, freeTierConfirmed: true })], { prompt: 'oi' }, {});
  assert.equal(oV1.text, 'ollama v1 ok'); assert.equal(calls[0].path, '/ollama-v1/v1/chat/completions');
  const cloudWithKey = await executeFreeRoutes([route({ providerId: 'ollama', providerName: 'Ollama Cloud', adapter: 'ollama', locality: 'cloud', baseUrl: `${root}/cloud`, modelId: 'gpt-oss:120b', secretEnv: 'OLLAMA_API_KEY', freeTierConfirmed: true })], { prompt: 'oi' }, { credentials: { OLLAMA_API_KEY: 'cloud-key' } });
  assert.equal(cloudWithKey.text, 'ollama cloud ok', 'chave Cloud vai como Bearer quando existe');
  clearAvailability(); calls.length = 0;
  await assert.rejects(() => executeFreeRoutes([route({ providerId: 'ollama', providerName: 'Ollama Cloud', adapter: 'ollama', locality: 'cloud', baseUrl: 'https://ollama.com', modelId: 'gpt-oss:120b', secretEnv: 'OLLAMA_API_KEY', freeTierConfirmed: true })], { prompt: 'oi' }, {}), /OLLAMA_API_KEY/);
  assert.equal(availabilityOf('ollama').kind, 'auth', '401/chave ausente desabilita o Ollama Cloud');

  // 9. 429 e timeout: o provedor sai de rotação por um tempo e o próximo conclui a tarefa.
  clearAvailability(); calls.length = 0;
  const quota = await executeFreeRoutes([route({ baseUrl: `${root}/quota/v1`, providerName: 'Provedor com cota' }), route({ providerId: 'ollama', providerName: 'Ollama', adapter: 'ollama', locality: 'local', baseUrl: `${root}/ollama`, modelId: 'llama3.2:1b', secretEnv: null, freeTierConfirmed: true })], { prompt: 'oi' }, { credentials: { NVIDIA_API_KEY: 'nim-key' } });
  assert.equal(quota.route.providerId, 'ollama');
  assert.equal(availabilityOf('nvidia-nim').kind, 'quota');
  assert.ok(availabilityOf('nvidia-nim').remainingMs > 60_000, 'cota bloqueia por mais de um minuto');
  clearAvailability(); calls.length = 0;
  const slow = await executeFreeRoutes([route({ baseUrl: `${root}/slow/v1`, timeoutMs: 120, providerName: 'Provedor lento' }), route({ providerId: 'ollama', providerName: 'Ollama', adapter: 'ollama', locality: 'local', baseUrl: `${root}/ollama`, modelId: 'llama3.2:1b', secretEnv: null, freeTierConfirmed: true })], { prompt: 'oi' }, { credentials: { NVIDIA_API_KEY: 'nim-key' } });
  assert.equal(slow.route.providerId, 'ollama');
  assert.equal(availabilityOf('nvidia-nim').kind, 'timeout');
  assert.match(availabilityOf('nvidia-nim').reason, /timeout de 120 ms/);

  // 10. Tudo falhando: erro único que lista cada provedor, sem fallback pago e sem vazar chave.
  clearAvailability(); calls.length = 0; geminiStatus = 401; geminiBody = { error: { code: 401, message: 'ACCESS_TOKEN_TYPE_UNSUPPORTED' } };
  const allDead = [route({ baseUrl: `${root}/broken/v1` }), route({ providerId: 'gemini', providerName: 'Gemini API', adapter: 'gemini', baseUrl: `${root}/gemini/v1beta`, modelId: 'gemini-2.5-flash', secretEnv: 'GEMINI_API_KEY' })];
  const err = await executeFreeRoutes(allDead, { prompt: 'oi' }, { credentials: { NVIDIA_API_KEY: 'nim-key', GEMINI_API_KEY: 'AQ.chave-secreta' } }).catch((e) => e);
  assert.ok(err instanceof Error);
  assert.match(err.message, /Nenhum provedor gratuito concluiu/);
  assert.match(err.message, /Fallback pago não foi usado/);
  assert.doesNotMatch(err.message, /AQ\.chave-secreta|nim-key/);
  assert.equal(err.attempts.length, 2);
  assert.equal(availabilitySnapshot().length >= 2, true);

  // 11. Classificação direta dos casos pedidos + defaults documentados.
  assert.deepEqual(classifyFreeRouterError({ status: 404, body: 'Function not found' }).kind, 'model_unavailable');
  assert.deepEqual(classifyFreeRouterError({ status: 410 }).kind, 'model_unavailable');
  assert.equal(classifyFreeRouterError({ status: 401, body: 'ACCESS_TOKEN_TYPE_UNSUPPORTED' }).code, 'ACCESS_TOKEN_TYPE_UNSUPPORTED');
  assert.equal(classifyFreeRouterError({ status: 429 }).kind, 'quota');
  assert.equal(classifyFreeRouterError({ name: 'TimeoutError' }).kind, 'timeout');
  assert.equal(FREE_PROVIDER_DEFAULTS['nvidia-nim'].baseUrl, 'https://integrate.api.nvidia.com/v1');
  assert.equal(FREE_PROVIDER_DEFAULTS['nvidia-nim'].timeoutMs >= 60_000, true);
  assert.deepEqual(defaultModelCandidates('nvidia-nim'), ['google/gemma-4-31b-it', 'minimaxai/minimax-m3.1-flash']);
  assert.deepEqual(defaultModelCandidates('nvidia-nim', { NVIDIA_MODEL: 'outro/modelo' }), ['outro/modelo', 'google/gemma-4-31b-it', 'minimaxai/minimax-m3.1-flash']);
  assert.equal(FREE_PROVIDER_DEFAULTS.gemini.baseUrl, 'https://generativelanguage.googleapis.com/v1beta');
  assert.equal(FREE_PROVIDER_DEFAULTS.ollama.cloudBaseUrl, 'https://ollama.com');
  markUnavailable('gemini', { kind: 'auth', reason: 'teste' });
  assert.equal(availabilityOf('gemini').kind, 'auth');
  clearAvailability('gemini');
  assert.equal(availabilityOf('gemini'), null);

  console.log('free_router_fallback.test.mjs: 404/410 trocam modelo, 401 (AQ.) / 429 / timeout trocam provedor, cache e modos de auth');
} finally {
  await new Promise((r) => fake.close(r));
}
